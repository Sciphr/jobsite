import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { appPrisma } from "../../../../lib/prisma";
import { protectRoute } from "../../../../lib/middleware/apiProtection";
import { logAuditEvent } from "../../../../../lib/auditMiddleware";

export async function POST(req) {
  // Check if user has permission to modify applications
  const authResult = await protectRoute("applications", "update");
  if (authResult.error) return authResult.error;

  const { session } = authResult;

  try {
    const body = await req.json();
    const { applicationIds, archive, reason } = body;

    if (
      !applicationIds ||
      !Array.isArray(applicationIds) ||
      applicationIds.length === 0
    ) {
      return new Response(
        JSON.stringify({ message: "Application IDs are required" }),
        { status: 400 }
      );
    }

    if (typeof archive !== "boolean") {
      return new Response(
        JSON.stringify({ message: "Archive parameter must be boolean" }),
        { status: 400 }
      );
    }

    // Get current applications for audit logging
    const currentApplications = await appPrisma.applications.findMany({
      where: { id: { in: applicationIds } },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        is_archived: true,
        archived_at: true,
        archived_by: true,
        archive_reason: true,
        jobs: { select: { title: true } },
      },
    });

    // Update applications
    const updateData = {
      is_archived: archive,
      archived_at: archive ? new Date() : null,
      archived_by: archive ? session.user.id : null,
      archive_reason: archive ? reason || "manual" : null,
    };

    const updatedApplications = await appPrisma.applications.updateMany({
      where: { id: { in: applicationIds } },
      data: updateData,
    });

    // Create audit logs for each application
    const auditPromises = currentApplications.map((app) => {
      const oldValues = {
        is_archived: app.is_archived,
        archived_at: app.archived_at,
        archived_by: app.archived_by,
        archive_reason: app.archive_reason,
      };

      const newValues = {
        is_archived: archive,
        archived_at: archive ? new Date() : null,
        archived_by: archive ? session.user.id : null,
        archive_reason: archive ? reason || "manual" : null,
      };

      return logAuditEvent(
        {
          eventType: "UPDATE",
          category: "APPLICATION",
          subcategory: archive ? "ARCHIVE" : "UNARCHIVE",
          entityType: "application",
          entityId: app.id,
          entityName: app.name || app.email,
          actorId: session.user.id,
          actorName:
            `${session.user.firstName} ${session.user.lastName}`.trim(),
          action: archive ? "Archive application" : "Unarchive application",
          description: `Application ${archive ? "archived" : "unarchived"} ${archive && reason ? `with reason: ${reason}` : ""}`,
          oldValues,
          newValues,
          changes: {
            is_archived: {
              from: oldValues.is_archived,
              to: newValues.is_archived,
            },
            ...(archive && {
              archive_reason: { from: null, to: reason || "manual" },
            }),
          },
          relatedApplicationId: app.id,
          metadata: {
            jobTitle: app.jobs?.title,
            bulkOperation: applicationIds.length > 1,
            totalCount: applicationIds.length,
          },
        },
        req
      );
    });

    await Promise.all(auditPromises);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully ${archive ? "archived" : "unarchived"} ${updatedApplications.count} application(s)`,
        count: updatedApplications.count,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error(`Archive applications error:`, error);

    // Log error to audit
    await logAuditEvent(
      {
        eventType: "ERROR",
        category: "APPLICATION",
        subcategory: "ARCHIVE",
        actorId: session?.user?.id,
        actorName: session?.user
          ? `${session.user.firstName} ${session.user.lastName}`.trim()
          : "Unknown",
        actorType: session?.user ? "user" : "system",
        action: "Archive applications",
        description: `Failed to archive applications: ${error.message}`,
        severity: "error",
        status: "failure",
        metadata: { error: error.message },
      },
      req
    );

    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
