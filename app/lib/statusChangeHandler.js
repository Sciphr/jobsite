// app/lib/statusChangeHandler.js
import { 
  isHireApprovalRequired, 
  createHireApprovalRequest 
} from './hireApprovalUtils';
import { shouldBlockStatusChange } from './interviewFeedbackUtils';
import { appPrisma } from './prisma';
import { logAuditEvent } from '../../lib/auditMiddleware';

/**
 * Handle application status changes with hire approval workflow
 */
export async function handleStatusChange({
  applicationId,
  newStatus,
  currentStatus,
  userId,
  userName,
  notes = null,
}) {
  try {
    // Check if interview feedback is required before status change
    const feedbackCheck = await shouldBlockStatusChange(applicationId, currentStatus, newStatus);
    if (feedbackCheck.shouldBlock) {
      return {
        success: false,
        requiresInterviewFeedback: true,
        message: feedbackCheck.message,
        interviewsWithoutFeedback: feedbackCheck.interviewsWithoutFeedback,
        status: currentStatus, // Status remains unchanged
      };
    }

    // Check if we're trying to change to "Hired" and approval is required
    if (newStatus === 'Hired' && await isHireApprovalRequired()) {
      // Create hire approval request instead of directly changing status
      const hireRequest = await createHireApprovalRequest({
        applicationId,
        requestedBy: userId,
        previousStatus: currentStatus,
      });

      // Check if request creation failed due to existing pending request
      if (!hireRequest.success && hireRequest.alreadyPending) {
        return {
          success: false,
          alreadyPending: true,
          message: hireRequest.message,
          existingRequestId: hireRequest.existingRequestId,
          status: currentStatus,
        };
      }

      return {
        success: true,
        requiresApproval: true,
        message: 'Hire approval request submitted! The application will be marked as hired once approved by an administrator.',
        hireRequestId: hireRequest.id,
        status: currentStatus, // Status remains unchanged until approved
      };
    }

    // For all other status changes, proceed normally
    const updatedApplication = await appPrisma.applications.update({
      where: { id: applicationId },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
      include: {
        jobs: {
          select: {
            title: true,
            department: true,
          },
        },
      },
    });

    // Create application note if provided
    if (notes) {
      await appPrisma.application_notes.create({
        data: {
          application_id: applicationId,
          content: notes,
          type: "status_change",
          author_id: userId,
          author_name: userName,
          metadata: {
            status_changed_from: currentStatus,
            status_changed_to: newStatus,
          },
        },
      });
    }

    // Log audit event for status change
    await logAuditEvent({
      eventType: "UPDATE",
      category: "APPLICATION",
      subcategory: "STATUS_CHANGE",
      entityType: "application",
      entityId: applicationId,
      entityName: updatedApplication.name || updatedApplication.email,
      actorId: userId,
      actorName: userName,
      actorType: "user",
      action: "Change application status",
      description: `Changed application status from ${currentStatus} to ${newStatus}`,
      oldValues: { status: currentStatus },
      newValues: { status: newStatus },
      changes: {
        status: { from: currentStatus, to: newStatus },
      },
      relatedApplicationId: applicationId,
      metadata: {
        jobTitle: updatedApplication.jobs?.title,
        statusChangeNotes: notes,
      },
    });

    return {
      success: true,
      requiresApproval: false,
      message: `Application status changed to ${newStatus}`,
      status: newStatus,
      application: updatedApplication,
    };
  } catch (error) {
    console.error('Error handling status change:', error);
    throw error;
  }
}

/**
 * Check if an application has a pending hire approval request
 */
export async function hasPendingHireApproval(applicationId) {
  try {
    const pendingRequest = await appPrisma.hire_approval_requests.findFirst({
      where: {
        application_id: applicationId,
        status: "pending",
      },
    });

    return !!pendingRequest;
  } catch (error) {
    console.error('Error checking pending hire approval:', error);
    return false;
  }
}

/**
 * Get hire approval status for an application
 */
export async function getHireApprovalStatus(applicationId) {
  try {
    const requests = await appPrisma.hire_approval_requests.findMany({
      where: {
        application_id: applicationId,
      },
      include: {
        requested_by_user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        reviewed_by_user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        requested_at: 'desc',
      },
    });

    const pendingRequest = requests.find(req => req.status === 'pending');
    const latestRequest = requests[0];

    return {
      hasPendingRequest: !!pendingRequest,
      pendingRequest,
      latestRequest,
      requestHistory: requests,
    };
  } catch (error) {
    console.error('Error getting hire approval status:', error);
    return {
      hasPendingRequest: false,
      pendingRequest: null,
      latestRequest: null,
      requestHistory: [],
    };
  }
}

/**
 * Get hire approval status for multiple applications
 */
export async function getBulkHireApprovalStatus(applicationIds) {
  try {
    if (!applicationIds || applicationIds.length === 0) {
      return {};
    }

    const requests = await appPrisma.hire_approval_requests.findMany({
      where: {
        application_id: {
          in: applicationIds,
        },
        status: 'pending', // Only get pending requests for performance
      },
      include: {
        requested_by_user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        requested_at: 'desc',
      },
    });

    // Group requests by application ID
    const statusMap = {};
    for (const request of requests) {
      if (!statusMap[request.application_id]) {
        statusMap[request.application_id] = {
          hasPendingRequest: true,
          pendingRequest: request,
          requestedBy: request.requested_by_user 
            ? `${request.requested_by_user.firstName} ${request.requested_by_user.lastName}`.trim()
            : 'Unknown',
          requestedAt: request.requested_at,
        };
      }
    }

    // Fill in missing applications with no pending requests
    for (const appId of applicationIds) {
      if (!statusMap[appId]) {
        statusMap[appId] = {
          hasPendingRequest: false,
          pendingRequest: null,
          requestedBy: null,
          requestedAt: null,
        };
      }
    }

    return statusMap;
  } catch (error) {
    console.error('Error getting bulk hire approval status:', error);
    return {};
  }
}