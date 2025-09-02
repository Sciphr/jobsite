import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { appPrisma } from "../../../../lib/prisma";
import {
  auditApplication,
  extractRequestContext,
} from "../../../../lib/auditLog";
import { triggerStatusChangeAutomation } from "../../../../lib/emailAutomation";
import { getSystemSetting } from "../../../../lib/settings";
import { handleStatusChange } from "../../../../lib/statusChangeHandler";
import { protectRoute } from "../../../../lib/middleware/apiProtection";

export async function PATCH(req, { params }) {
  const authResult = await protectRoute("applications", "edit");
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  const { id } = await params;

  try {
    const body = await req.json();
    const { status, notes } = body;

    // Extract request context for audit logging
    const { ipAddress, userAgent, requestId } = extractRequestContext(req);

    // Get current application data for audit logging
    const currentApplication = await appPrisma.applications.findUnique({
      where: { id },
      include: {
        jobs: { select: { id: true, title: true } },
        users: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!currentApplication) {
      return new Response(
        JSON.stringify({ message: "Application not found" }),
        {
          status: 404,
        }
      );
    }

    // Validate status
    const validStatuses = [
      "Applied",
      "Reviewing",
      "Interview",
      "Hired",
      "Rejected",
    ];
    if (status && !validStatuses.includes(status)) {
      return new Response(JSON.stringify({ message: "Invalid status" }), {
        status: 400,
      });
    }

    // Check if notes are required when changing to rejected status
    if (status === "Rejected" && status !== currentApplication.status) {
      const requireNotesOnRejection = await getSystemSetting(
        "require_notes_on_rejection",
        false
      );
      
      if (requireNotesOnRejection) {
        // Check if new notes are being provided with this request
        if (notes === undefined || !notes || notes.trim() === "") {
          return new Response(
            JSON.stringify({ 
              message: "A note is required when rejecting an application",
              code: "NOTES_REQUIRED_FOR_REJECTION" 
            }),
            { status: 400 }
          );
        }
      }
    }

    // Handle status change (including hire approval workflow)
    let result;
    if (status && status !== currentApplication.status) {
      const userName = session.user.firstName && session.user.lastName
        ? `${session.user.firstName} ${session.user.lastName}`.trim()
        : session.user.email || "System";

      result = await handleStatusChange({
        applicationId: id,
        newStatus: status,
        currentStatus: currentApplication.status,
        userId: session.user.id,
        userName,
        notes,
      });

      // If hire approval is required, return early
      if (result.requiresApproval) {
        return new Response(JSON.stringify({
          success: true,
          requiresApproval: true,
          message: result.message,
          hireRequestId: result.hireRequestId,
          status: result.status,
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        });
      }

      // If there's already a pending hire approval request
      if (result.alreadyPending) {
        return new Response(JSON.stringify({
          success: false,
          alreadyPending: true,
          message: result.message,
          existingRequestId: result.existingRequestId,
          status: result.status,
        }), {
          status: 409, // Conflict status code
          headers: {
            "Content-Type": "application/json",
          },
        });
      }
    } else {
      // For non-status changes (just notes), update normally
      const updatedApplication = await appPrisma.applications.update({
        where: { id },
        data: {
          ...(notes !== undefined && { notes }),
          updatedAt: new Date(),
        },
        include: {
          jobs: {
            select: {
              id: true,
              title: true,
              department: true,
            },
          },
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      result = {
        success: true,
        requiresApproval: false,
        status: updatedApplication.status,
        application: updatedApplication,
      };
    }

    const updatedApplication = result.application;
    const applicantName =
      updatedApplication.name ||
      (updatedApplication.users
        ? `${updatedApplication.users.firstName} ${updatedApplication.users.lastName}`.trim()
        : "Unknown");
    const actorName =
      session.user.firstName && session.user.lastName
        ? `${session.user.firstName} ${session.user.lastName}`.trim()
        : session.user.email || "System";

    // Legacy audit logging (handleStatusChange already logs status changes)
    if (status && status !== currentApplication.status && !result.requiresApproval) {
      await auditApplication.statusChange(
        updatedApplication.id,
        applicantName,
        currentApplication.status,
        status,
        session.user.id,
        actorName,
        updatedApplication.jobId
      );

      // Handle stage time tracking (if enabled)
      try {
        const trackTimeInStage = await getSystemSetting("track_time_in_stage", false);
        
        if (trackTimeInStage) {
          console.log(`⏱️ Tracking stage change: ${currentApplication.status} → ${status}`);
          
          // Close out the previous stage
          await appPrisma.$executeRaw`
            UPDATE application_stage_history 
            SET 
              exited_at = NOW(),
              time_in_stage_seconds = EXTRACT(EPOCH FROM (NOW() - entered_at))::INTEGER,
              updated_at = NOW()
            WHERE application_id = ${updatedApplication.id}::uuid
            AND stage = ${currentApplication.status}
            AND exited_at IS NULL
          `;

          // Create new stage history record
          await appPrisma.$executeRaw`
            INSERT INTO application_stage_history (
              application_id, 
              stage, 
              previous_stage, 
              entered_at, 
              changed_by_user_id, 
              changed_by_name,
              created_at,
              updated_at
            ) VALUES (
              ${updatedApplication.id}::uuid,
              ${status},
              ${currentApplication.status},
              NOW(),
              ${session.user.id}::uuid,
              ${actorName},
              NOW(),
              NOW()
            )
          `;

          // Update current stage info on applications table  
          await appPrisma.$executeRaw`
            UPDATE applications 
            SET 
              current_stage_entered_at = NOW(),
              time_in_current_stage_seconds = 0,
              "updatedAt" = NOW()
            WHERE id = ${updatedApplication.id}::uuid
          `;

          console.log("✅ Stage time tracking updated successfully");
        }
      } catch (stageTrackingError) {
        console.error("❌ Error in stage time tracking:", stageTrackingError);
        // Don't fail the status update if stage tracking fails
      }

      // Trigger email automation for status changes
      try {
        const automationResult = await triggerStatusChangeAutomation(
          updatedApplication.id,
          currentApplication.status,
          status,
          {
            userId: session.user.id,
            userName: actorName,
            ipAddress,
            userAgent,
            requestId,
          }
        );

        console.log(
          `🤖 Email automation processed: ${automationResult.triggered}/${automationResult.processed} rules triggered`
        );
      } catch (automationError) {
        console.error("Error in email automation:", automationError);
        // Don't fail the status update if automation fails
      }
    }

    // Log note update if notes were changed
    if (notes !== undefined && notes !== currentApplication.notes) {
      await auditApplication.noteUpdate(
        updatedApplication.id,
        applicantName,
        currentApplication.notes,
        notes,
        session.user.id,
        actorName
      );
    }

    // Format the response
    const formattedApplication = {
      id: updatedApplication.id,
      name:
        updatedApplication.name ||
        (updatedApplication.users
          ? `${updatedApplication.users.firstName} ${updatedApplication.users.lastName}`.trim()
          : null),
      email: updatedApplication.email || updatedApplication.users?.email,
      phone: updatedApplication.phone,
      status: updatedApplication.status,
      coverLetter: updatedApplication.coverLetter,
      resumeUrl: updatedApplication.resumeUrl,
      notes: updatedApplication.notes,
      appliedAt: updatedApplication.appliedAt,
      updatedAt: updatedApplication.updatedAt,
      jobId: updatedApplication.jobId,
      userId: updatedApplication.userId,
      job: updatedApplication.jobs, // Alias for frontend compatibility
    };

    return new Response(JSON.stringify(formattedApplication), { status: 200 });
  } catch (error) {
    console.error("Application update error:", error);

    if (error.code === "P2025") {
      return new Response(
        JSON.stringify({ message: "Application not found" }),
        {
          status: 404,
        }
      );
    }

    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}

export async function GET(req, { params }) {
  const authResult = await protectRoute("applications", "view");
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  const { id } = await params;

  try {
    const application = await appPrisma.applications.findUnique({
      where: { id },
      include: {
        jobs: {
          select: {
            id: true,
            title: true,
            department: true,
            slug: true,
            description: true,
            requirements: true,
            location: true,
            employment_types: {
              select: {
                name: true
              }
            },
            experience_levels: {
              select: {
                name: true
              }
            },
            remote_policies: {
              select: {
                name: true
              }
            },
            categories: {
              select: {
                name: true
              }
            },
          },
        },
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!application) {
      return new Response(
        JSON.stringify({ message: "Application not found" }),
        {
          status: 404,
        }
      );
    }

    // Format the response
    const formattedApplication = {
      id: application.id,
      name:
        application.name ||
        (application.users
          ? `${application.users.firstName} ${application.users.lastName}`.trim()
          : null),
      email: application.email || application.users?.email,
      phone: application.phone || application.users?.phone,
      status: application.status,
      coverLetter: application.coverLetter,
      resumeUrl: application.resumeUrl,
      notes: application.notes,
      appliedAt: application.appliedAt,
      updatedAt: application.updatedAt,
      jobId: application.jobId,
      userId: application.userId,
      job: application.jobs, // Alias for frontend compatibility
      user: application.users, // Alias for frontend compatibility
    };

    return new Response(JSON.stringify(formattedApplication), { status: 200 });
  } catch (error) {
    console.error("Application fetch error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);

  // Check if user is admin (privilege level 1 or higher - HR can delete applications)
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 1
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  const { id } = await params;

  try {
    // Check if application exists
    const application = await appPrisma.applications.findUnique({
      where: { id },
    });

    if (!application) {
      return new Response(
        JSON.stringify({ message: "Application not found" }),
        {
          status: 404,
        }
      );
    }

    // Delete the application
    await appPrisma.applications.delete({
      where: { id },
    });

    // Decrement application count for the job
    await appPrisma.jobs.update({
      where: { id: application.jobId },
      data: {
        applicationCount: {
          decrement: 1,
        },
      },
    });

    return new Response(
      JSON.stringify({ message: "Application deleted successfully" }),
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Application deletion error:", error);

    if (error.code === "P2025") {
      return new Response(
        JSON.stringify({ message: "Application not found" }),
        {
          status: 404,
        }
      );
    }

    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
