import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { appPrisma } from "../../../../lib/prisma";
import { protectRoute } from "../../../../lib/middleware/apiProtection";
import { extractRequestContext } from "../../../../lib/auditLog";
import { logAuditEvent } from "../../../../../lib/auditMiddleware";
import { getSystemSetting } from "../../../../lib/settings";

export async function PATCH(req) {
  const authResult = await protectRoute("applications", "edit");
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  try {
    const body = await req.json();
    const { applicationIds, action, status } = body;
    const requestContext = extractRequestContext(req);

    // Validate input
    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Application IDs are required" }),
        { status: 400 }
      );
    }

    if (!action || !["status_change", "delete"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Valid action is required (status_change or delete)" }),
        { status: 400 }
      );
    }

    if (action === "status_change") {
      const validStatuses = ["Applied", "Reviewing", "Interview", "Hired", "Rejected"];
      if (!status || !validStatuses.includes(status)) {
        return new Response(
          JSON.stringify({ error: "Valid status is required for status_change action" }),
          { status: 400 }
        );
      }
    }

    // Get current applications data
    const currentApplications = await appPrisma.applications.findMany({
      where: { id: { in: applicationIds } },
      include: {
        jobs: { select: { id: true, title: true } },
        users: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (currentApplications.length === 0) {
      return new Response(
        JSON.stringify({ error: "No applications found" }),
        { status: 404 }
      );
    }

    const results = {
      successful: [],
      failed: [],
      skipped: [],
      total: applicationIds.length
    };

    if (action === "delete") {
      // Bulk delete
      try {
        const deleteResult = await appPrisma.applications.deleteMany({
          where: { id: { in: applicationIds } },
        });

        // Update job application counts
        const jobIds = [...new Set(currentApplications.map(app => app.jobId))];
        await Promise.all(
          jobIds.map(jobId => 
            appPrisma.jobs.update({
              where: { id: jobId },
              data: { applicationCount: { decrement: deleteResult.count } },
            })
          )
        );

        results.successful = applicationIds;

        // Log bulk deletion
        await logAuditEvent({
          eventType: "DELETE",
          category: "ADMIN",
          action: "Bulk application deletion",
          description: `Admin ${session.user.email} deleted ${deleteResult.count} applications`,
          entityType: "applications",
          actorId: session.user.id,
          actorType: "user",
          actorName: session.user.name || session.user.email,
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
          requestId: requestContext.requestId,
          severity: "warning",
          status: "success",
          tags: ["applications", "admin", "bulk", "delete"],
          metadata: {
            deletedCount: deleteResult.count,
            applicationIds: applicationIds,
            deletedBy: session.user.email
          }
        }, req).catch(console.error);

      } catch (error) {
        console.error("Bulk delete error:", error);
        results.failed = applicationIds;
      }
    } else if (action === "status_change") {
      // Check notes requirement for rejection
      if (status === "Rejected") {
        const requireNotesOnRejection = await getSystemSetting("require_notes_on_rejection", false);
        
        if (requireNotesOnRejection) {
          const appsWithoutNotes = currentApplications.filter(
            app => app.status !== "Rejected" && (!app.notes || app.notes.trim() === "")
          );
          
          if (appsWithoutNotes.length > 0) {
            return new Response(
              JSON.stringify({ 
                error: "Notes are required for rejection",
                message: `${appsWithoutNotes.length} application(s) require notes before rejection. Please add notes individually.`,
                applicationsWithoutNotes: appsWithoutNotes.map(app => app.id)
              }),
              { status: 400 }
            );
          }
        }
      }

      // Filter applications that need status change
      const applicationsToUpdate = currentApplications.filter(app => app.status !== status);
      const applicationsToSkip = currentApplications.filter(app => app.status === status);

      results.skipped = applicationsToSkip.map(app => app.id);

      if (applicationsToUpdate.length > 0) {
        try {
          // Bulk status update
          const updateResult = await appPrisma.applications.updateMany({
            where: { 
              id: { in: applicationsToUpdate.map(app => app.id) }
            },
            data: { 
              status: status,
              updatedAt: new Date(),
              // Add stage tracking if enabled
              ...(status !== currentApplications[0]?.status && {
                current_stage_entered_at: new Date(),
                time_in_current_stage_seconds: 0
              })
            },
          });

          results.successful = applicationsToUpdate.map(app => app.id);

          // Log bulk status change
          await logAuditEvent({
            eventType: "UPDATE",
            category: "ADMIN", 
            action: "Bulk application status change",
            description: `Admin ${session.user.email} changed ${updateResult.count} applications to ${status}`,
            entityType: "applications",
            actorId: session.user.id,
            actorType: "user",
            actorName: session.user.name || session.user.email,
            ipAddress: requestContext.ipAddress,
            userAgent: requestContext.userAgent,
            requestId: requestContext.requestId,
            severity: "info",
            status: "success",
            tags: ["applications", "admin", "bulk", "status_change"],
            metadata: {
              updatedCount: updateResult.count,
              newStatus: status,
              applicationIds: applicationsToUpdate.map(app => app.id),
              updatedBy: session.user.email
            }
          }, req).catch(console.error);

        } catch (error) {
          console.error("Bulk status update error:", error);
          results.failed = applicationsToUpdate.map(app => app.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results: results,
        message: `${action === 'delete' ? 'Deleted' : 'Updated'} ${results.successful.length} applications. Skipped ${results.skipped.length}. Failed ${results.failed.length}.`
      }),
      { status: 200 }
    );

  } catch (error) {
    console.error("Bulk operation error:", error);

    // Log bulk operation error
    const requestContext = extractRequestContext(req);
    await logAuditEvent({
      eventType: "ERROR",
      category: "SYSTEM",
      action: "Bulk application operation failed",
      description: `Server error during bulk application operation for admin: ${session?.user?.email || 'unknown'}`,
      actorId: session?.user?.id,
      actorType: "user",
      actorName: session?.user?.name || session?.user?.email,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      severity: "error",
      status: "failure",
      tags: ["applications", "admin", "bulk", "server_error"],
      metadata: {
        error: error.message,
        stack: error.stack
      }
    }, req).catch(console.error);

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    );
  }
}