// app/lib/jobApprovalService.js - Job approval workflow service
import { appPrisma } from "./prisma";
import { logAuditEvent } from "../../lib/auditMiddleware";
import { getSystemSetting } from "./settings";

/**
 * Check if user has permission to approve jobs
 */
export async function hasJobApprovalPermission(userId) {
  try {
    // Get user's roles and permissions
    const userRoles = await appPrisma.user_roles.findMany({
      where: { user_id: userId },
      include: {
        roles: {
          include: {
            role_permissions: {
              include: {
                permissions: true
              }
            }
          }
        }
      }
    });

    // Check if user has jobs:approve permission
    for (const userRole of userRoles) {
      for (const rolePermission of userRole.roles.role_permissions) {
        const permission = rolePermission.permissions;
        if (permission.resource === 'jobs' && permission.action === 'approve') {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking job approval permission:', error);
    return false;
  }
}

/**
 * Determine if a job needs approval based on settings and user permissions
 */
export async function needsJobApproval(userId, jobStatus) {
  try {
    // Only check approval for jobs being published (status "Active")
    if (jobStatus !== "Active") {
      return false;
    }

    // Check if job approval is required by system setting
    const requireApproval = await getSystemSetting("require_approval_for_job_posting", false);
    if (!requireApproval) {
      return false;
    }

    // If user already has approval permission, bypass approval workflow
    const hasPermission = await hasJobApprovalPermission(userId);
    if (hasPermission) {
      return false; // User can approve jobs, so they can publish directly
    }

    return true; // User needs approval to publish
  } catch (error) {
    console.error('Error determining job approval need:', error);
    return false; // Default to no approval needed on error
  }
}

/**
 * Create a job approval request
 */
export async function createJobApprovalRequest(jobId, requestedBy, notes = null) {
  try {
    const approvalRequest = await appPrisma.job_approval_requests.create({
      data: {
        job_id: jobId,
        requested_by: requestedBy,
        notes: notes,
        status: 'pending',
        requested_at: new Date()
      },
      include: {
        job: {
          select: {
            title: true,
            department: true
          }
        },
        requested_by_user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Log the approval request creation
    await logAuditEvent({
      eventType: "CREATE",
      category: "JOB",
      subcategory: "APPROVAL_REQUEST",
      entityType: "job_approval_request",
      entityId: approvalRequest.id,
      entityName: approvalRequest.job.title,
      action: "Job approval requested",
      description: `Job approval requested for: ${approvalRequest.job.title}`,
      relatedJobId: jobId,
      actorId: requestedBy,
      actorType: "user",
      actorName: `${approvalRequest.requested_by_user.firstName} ${approvalRequest.requested_by_user.lastName}`,
      newValues: {
        jobId: jobId,
        requestedBy: requestedBy,
        status: 'pending',
        notes: notes
      },
      severity: "info",
      status: "success",
      tags: ["job", "approval", "request", "pending"],
      metadata: {
        jobTitle: approvalRequest.job.title,
        department: approvalRequest.job.department,
        requestedByEmail: approvalRequest.requested_by_user.email
      }
    });

    return approvalRequest;
  } catch (error) {
    console.error('Error creating job approval request:', error);
    throw error;
  }
}

/**
 * Get pending job approvals for users with approval permissions
 */
export async function getPendingJobApprovals(userId) {
  try {
    // First check if user has approval permission
    const hasPermission = await hasJobApprovalPermission(userId);
    if (!hasPermission) {
      return [];
    }

    const pendingApprovals = await appPrisma.job_approval_requests.findMany({
      where: {
        status: 'pending'
      },
      include: {
        job: {
          include: {
            categories: {
              select: {
                name: true
              }
            }
          }
        },
        requested_by_user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        requested_at: 'desc'
      }
    });

    return pendingApprovals;
  } catch (error) {
    console.error('Error fetching pending job approvals:', error);
    return [];
  }
}

/**
 * Approve a job posting
 */
export async function approveJob(approvalRequestId, reviewedBy, notes = null) {
  try {
    // Get the approval request
    const approvalRequest = await appPrisma.job_approval_requests.findUnique({
      where: { id: approvalRequestId },
      include: {
        job: true,
        requested_by_user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!approvalRequest || approvalRequest.status !== 'pending') {
      throw new Error('Approval request not found or already processed');
    }

    // Check if reviewer has permission
    const hasPermission = await hasJobApprovalPermission(reviewedBy);
    if (!hasPermission) {
      throw new Error('User does not have permission to approve jobs');
    }

    // Start transaction to approve job and update request
    const result = await appPrisma.$transaction(async (prisma) => {
      // Update the approval request
      const updatedRequest = await prisma.job_approval_requests.update({
        where: { id: approvalRequestId },
        data: {
          status: 'approved',
          reviewed_by: reviewedBy,
          reviewed_at: new Date(),
          notes: notes
        }
      });

      // Publish the job
      const publishedJob = await prisma.jobs.update({
        where: { id: approvalRequest.job.id },
        data: {
          status: 'Active',
          postedAt: new Date(),
          updatedAt: new Date()
        },
        include: {
          categories: {
            select: {
              name: true
            }
          }
        }
      });

      return { updatedRequest, publishedJob };
    });

    // Get reviewer info for audit
    const reviewer = await appPrisma.users.findUnique({
      where: { id: reviewedBy },
      select: {
        firstName: true,
        lastName: true,
        email: true
      }
    });

    // Log the approval
    await logAuditEvent({
      eventType: "UPDATE",
      category: "JOB",
      subcategory: "APPROVAL_APPROVED",
      entityType: "job",
      entityId: approvalRequest.job.id,
      entityName: approvalRequest.job.title,
      action: "Job approved and published",
      description: `Job approved by ${reviewer.firstName} ${reviewer.lastName} and published: ${approvalRequest.job.title}`,
      relatedJobId: approvalRequest.job.id,
      actorId: reviewedBy,
      actorType: "user",
      actorName: `${reviewer.firstName} ${reviewer.lastName}`,
      oldValues: {
        status: 'Draft'
      },
      newValues: {
        status: 'Active',
        postedAt: new Date()
      },
      changes: {
        status: { from: 'Draft', to: 'Active' }
      },
      severity: "info",
      status: "success",
      tags: ["job", "approval", "approved", "published"],
      metadata: {
        approvalRequestId: approvalRequestId,
        jobTitle: approvalRequest.job.title,
        department: approvalRequest.job.department,
        requestedByEmail: approvalRequest.requested_by_user.email,
        reviewerEmail: reviewer.email,
        reviewNotes: notes
      }
    });

    return result;
  } catch (error) {
    console.error('Error approving job:', error);
    throw error;
  }
}

/**
 * Reject a job posting
 */
export async function rejectJob(approvalRequestId, reviewedBy, rejectionReason, notes = null) {
  try {
    // Get the approval request
    const approvalRequest = await appPrisma.job_approval_requests.findUnique({
      where: { id: approvalRequestId },
      include: {
        job: true,
        requested_by_user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!approvalRequest || approvalRequest.status !== 'pending') {
      throw new Error('Approval request not found or already processed');
    }

    // Check if reviewer has permission
    const hasPermission = await hasJobApprovalPermission(reviewedBy);
    if (!hasPermission) {
      throw new Error('User does not have permission to approve/reject jobs');
    }

    // Update the approval request
    const updatedRequest = await appPrisma.job_approval_requests.update({
      where: { id: approvalRequestId },
      data: {
        status: 'rejected',
        reviewed_by: reviewedBy,
        reviewed_at: new Date(),
        rejection_reason: rejectionReason,
        notes: notes
      }
    });

    // Get reviewer info for audit
    const reviewer = await appPrisma.users.findUnique({
      where: { id: reviewedBy },
      select: {
        firstName: true,
        lastName: true,
        email: true
      }
    });

    // Log the rejection
    await logAuditEvent({
      eventType: "UPDATE",
      category: "JOB",
      subcategory: "APPROVAL_REJECTED",
      entityType: "job",
      entityId: approvalRequest.job.id,
      entityName: approvalRequest.job.title,
      action: "Job approval rejected",
      description: `Job approval rejected by ${reviewer.firstName} ${reviewer.lastName}: ${approvalRequest.job.title}`,
      relatedJobId: approvalRequest.job.id,
      actorId: reviewedBy,
      actorType: "user",
      actorName: `${reviewer.firstName} ${reviewer.lastName}`,
      severity: "warning",
      status: "success",
      tags: ["job", "approval", "rejected"],
      metadata: {
        approvalRequestId: approvalRequestId,
        jobTitle: approvalRequest.job.title,
        department: approvalRequest.job.department,
        requestedByEmail: approvalRequest.requested_by_user.email,
        reviewerEmail: reviewer.email,
        rejectionReason: rejectionReason,
        reviewNotes: notes
      }
    });

    return updatedRequest;
  } catch (error) {
    console.error('Error rejecting job:', error);
    throw error;
  }
}