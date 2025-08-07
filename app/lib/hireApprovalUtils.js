// app/lib/hireApprovalUtils.js
import { appPrisma } from "./prisma";
import { logAuditEvent } from "../../lib/auditMiddleware";

/**
 * Check if hire approval is required based on settings
 */
export async function isHireApprovalRequired() {
  try {
    const setting = await appPrisma.settings.findFirst({
      where: {
        key: "require_approval_for_hire",
        userId: null,
      },
    });

    if (!setting || !setting.value) {
      return false;
    }

    // Handle both boolean strings and actual booleans
    const value = setting.value.toString().toLowerCase();
    return value === 'true' || value === '1';
  } catch (error) {
    console.error("Error checking hire approval requirement:", error);
    return false;
  }
}

/**
 * Create a hire approval request
 */
export async function createHireApprovalRequest({
  applicationId,
  requestedBy,
  previousStatus,
}) {
  try {
    // Check if there's already a pending request for this application
    const existingRequest = await appPrisma.hire_approval_requests.findFirst({
      where: {
        application_id: applicationId,
        status: "pending",
      },
    });

    if (existingRequest) {
      return {
        success: false,
        alreadyPending: true,
        message: "This application already has a pending hire approval request",
        existingRequestId: existingRequest.id,
        requestedAt: existingRequest.requested_at,
      };
    }

    // Create the hire approval request
    const hireRequest = await appPrisma.hire_approval_requests.create({
      data: {
        application_id: applicationId,
        requested_by: requestedBy,
        previous_status: previousStatus,
        status: "pending",
      },
      include: {
        applications: {
          include: {
            jobs: true,
          },
        },
        requested_by_user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Create application note for the request
    await appPrisma.application_notes.create({
      data: {
        application_id: applicationId,
        content: `Hire approval requested by ${hireRequest.requested_by_user.firstName} ${hireRequest.requested_by_user.lastName}`,
        type: "hire_approval_request",
        author_id: requestedBy,
        author_name: `${hireRequest.requested_by_user.firstName} ${hireRequest.requested_by_user.lastName}`,
        is_system_generated: true,
        metadata: {
          hire_request_id: hireRequest.id,
          previous_status: previousStatus,
        },
      },
    });

    // Log audit event
    await logAuditEvent({
      eventType: "CREATE",
      category: "APPLICATION",
      subcategory: "HIRE_APPROVAL_REQUEST",
      entityType: "hire_approval_request",
      entityId: hireRequest.id,
      entityName: hireRequest.applications.name || hireRequest.applications.email,
      actorId: requestedBy,
      actorName: `${hireRequest.requested_by_user.firstName} ${hireRequest.requested_by_user.lastName}`,
      actorType: "user",
      action: "Create hire approval request",
      description: `Requested approval to hire ${hireRequest.applications.name || hireRequest.applications.email} for ${hireRequest.applications.jobs.title}`,
      relatedApplicationId: applicationId,
      metadata: {
        jobTitle: hireRequest.applications.jobs.title,
        previousStatus: previousStatus,
        requestId: hireRequest.id,
      },
    });

    return hireRequest;
  } catch (error) {
    console.error("Error creating hire approval request:", error);
    throw error;
  }
}

/**
 * Approve a hire request
 */
export async function approveHireRequest({
  requestId,
  reviewedBy,
  notes = null,
}) {
  try {
    const hireRequest = await appPrisma.hire_approval_requests.findUnique({
      where: { id: requestId },
      include: {
        applications: {
          include: {
            jobs: true,
          },
        },
        requested_by_user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!hireRequest) {
      throw new Error("Hire approval request not found");
    }

    if (hireRequest.status !== "pending") {
      throw new Error("This hire approval request has already been processed");
    }

    // Get reviewer info
    const reviewer = await appPrisma.users.findUnique({
      where: { id: reviewedBy },
      select: {
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (!reviewer) {
      throw new Error("Reviewer not found");
    }

    // Start transaction
    const result = await appPrisma.$transaction(async (tx) => {
      // Update the hire request
      const updatedRequest = await tx.hire_approval_requests.update({
        where: { id: requestId },
        data: {
          status: "approved",
          reviewed_by: reviewedBy,
          reviewed_at: new Date(),
        },
      });

      // Update the application status to "Hired"
      await tx.applications.update({
        where: { id: hireRequest.application_id },
        data: {
          status: "Hired",
          updatedAt: new Date(),
        },
      });

      // Create application note for the approval
      await tx.application_notes.create({
        data: {
          application_id: hireRequest.application_id,
          content: notes 
            ? `Hire approved by ${reviewer.firstName} ${reviewer.lastName}: ${notes}`
            : `Hire approved by ${reviewer.firstName} ${reviewer.lastName}`,
          type: "hire_approved",
          author_id: reviewedBy,
          author_name: `${reviewer.firstName} ${reviewer.lastName}`,
          is_system_generated: true,
          metadata: {
            hire_request_id: requestId,
            approval_notes: notes,
          },
        },
      });

      return updatedRequest;
    });

    // Log audit event
    await logAuditEvent({
      eventType: "UPDATE",
      category: "APPLICATION",
      subcategory: "HIRE_APPROVED",
      entityType: "application",
      entityId: hireRequest.application_id,
      entityName: hireRequest.applications.name || hireRequest.applications.email,
      actorId: reviewedBy,
      actorName: `${reviewer.firstName} ${reviewer.lastName}`,
      actorType: "user",
      action: "Approve hire request",
      description: `Approved hire for ${hireRequest.applications.name || hireRequest.applications.email}`,
      oldValues: { status: hireRequest.previous_status },
      newValues: { status: "Hired" },
      changes: {
        status: { from: hireRequest.previous_status, to: "Hired" },
        hire_approval: { from: "pending", to: "approved" },
      },
      relatedApplicationId: hireRequest.application_id,
      metadata: {
        jobTitle: hireRequest.applications.jobs.title,
        requestId: requestId,
        approvalNotes: notes,
        requestedBy: `${hireRequest.requested_by_user.firstName} ${hireRequest.requested_by_user.lastName}`,
      },
    });

    return result;
  } catch (error) {
    console.error("Error approving hire request:", error);
    throw error;
  }
}

/**
 * Reject a hire request
 */
export async function rejectHireRequest({
  requestId,
  reviewedBy,
  notes = null,
  changeApplicationStatus = null,
}) {
  try {
    const hireRequest = await appPrisma.hire_approval_requests.findUnique({
      where: { id: requestId },
      include: {
        applications: {
          include: {
            jobs: true,
          },
        },
        requested_by_user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!hireRequest) {
      throw new Error("Hire approval request not found");
    }

    if (hireRequest.status !== "pending") {
      throw new Error("This hire approval request has already been processed");
    }

    // Get reviewer info
    const reviewer = await appPrisma.users.findUnique({
      where: { id: reviewedBy },
      select: {
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (!reviewer) {
      throw new Error("Reviewer not found");
    }

    // Start transaction
    const result = await appPrisma.$transaction(async (tx) => {
      // Update the hire request
      const updatedRequest = await tx.hire_approval_requests.update({
        where: { id: requestId },
        data: {
          status: "rejected",
          reviewed_by: reviewedBy,
          reviewed_at: new Date(),
        },
      });

      // Update application status if requested
      let newStatus = hireRequest.applications.status;
      if (changeApplicationStatus && changeApplicationStatus !== hireRequest.applications.status) {
        await tx.applications.update({
          where: { id: hireRequest.application_id },
          data: {
            status: changeApplicationStatus,
            updatedAt: new Date(),
          },
        });
        newStatus = changeApplicationStatus;
      }

      // Create application note for the rejection
      await tx.application_notes.create({
        data: {
          application_id: hireRequest.application_id,
          content: notes 
            ? `Hire rejected by ${reviewer.firstName} ${reviewer.lastName}: ${notes}`
            : `Hire rejected by ${reviewer.firstName} ${reviewer.lastName}`,
          type: "hire_rejected",
          author_id: reviewedBy,
          author_name: `${reviewer.firstName} ${reviewer.lastName}`,
          is_system_generated: true,
          metadata: {
            hire_request_id: requestId,
            rejection_notes: notes,
            status_changed_to: newStatus,
          },
        },
      });

      return { updatedRequest, newStatus };
    });

    // Log audit event
    await logAuditEvent({
      eventType: "UPDATE",
      category: "APPLICATION",
      subcategory: "HIRE_REJECTED",
      entityType: "application",
      entityId: hireRequest.application_id,
      entityName: hireRequest.applications.name || hireRequest.applications.email,
      actorId: reviewedBy,
      actorName: `${reviewer.firstName} ${reviewer.lastName}`,
      actorType: "user",
      action: "Reject hire request",
      description: `Rejected hire for ${hireRequest.applications.name || hireRequest.applications.email}`,
      oldValues: { status: hireRequest.applications.status },
      newValues: { status: result.newStatus },
      changes: {
        hire_approval: { from: "pending", to: "rejected" },
        ...(result.newStatus !== hireRequest.applications.status && {
          status: { from: hireRequest.applications.status, to: result.newStatus }
        })
      },
      relatedApplicationId: hireRequest.application_id,
      metadata: {
        jobTitle: hireRequest.applications.jobs.title,
        requestId: requestId,
        rejectionNotes: notes,
        requestedBy: `${hireRequest.requested_by_user.firstName} ${hireRequest.requested_by_user.lastName}`,
        statusChangedTo: result.newStatus,
      },
    });

    return result;
  } catch (error) {
    console.error("Error rejecting hire request:", error);
    throw error;
  }
}

/**
 * Get all pending hire approval requests
 */
export async function getPendingHireApprovalRequests() {
  try {
    const requests = await appPrisma.hire_approval_requests.findMany({
      where: {
        status: "pending",
      },
      include: {
        applications: {
          include: {
            jobs: {
              select: {
                id: true,
                title: true,
                department: true,
              },
            },
          },
        },
        requested_by_user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        requested_at: "desc",
      },
    });

    return requests;
  } catch (error) {
    console.error("Error getting pending hire approval requests:", error);
    throw error;
  }
}

/**
 * Get hire approval request by ID with full details
 */
export async function getHireApprovalRequestById(requestId) {
  try {
    const request = await appPrisma.hire_approval_requests.findUnique({
      where: { id: requestId },
      include: {
        applications: {
          include: {
            jobs: true,
          },
        },
        requested_by_user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        reviewed_by_user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!request) {
      throw new Error("Hire approval request not found");
    }

    return request;
  } catch (error) {
    console.error("Error getting hire approval request:", error);
    throw error;
  }
}

/**
 * Get hire approval requests count by status
 */
export async function getHireApprovalRequestsCount(status = "pending") {
  try {
    const count = await appPrisma.hire_approval_requests.count({
      where: {
        status: status,
      },
    });

    return count;
  } catch (error) {
    console.error("Error getting hire approval requests count:", error);
    return 0;
  }
}