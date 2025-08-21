import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import { appPrisma } from "../../../../../lib/prisma";
import { protectRoute } from "../../../../../lib/middleware/apiProtection";

export async function GET(request, { params }) {
  try {
    const authResult = await protectRoute("audit_logs", "view");
    if (authResult.error) return authResult.error;
    const { session } = authResult;

    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get("limit")) || 50;
    const includeSystem = searchParams.get("includeSystem") === "true";

    // Verify application exists
    const application = await appPrisma.applications.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        jobs: { select: { title: true, department: true } },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Build where clause for audit logs
    const where = {
      OR: [
        { related_application_id: id },
        { entity_type: "application", entity_id: id },
      ],
    };

    // Filter out system-generated logs if requested
    if (!includeSystem) {
      where.actor_type = { not: "system" };
    }

    // Fetch audit logs related to this application
    const auditLogs = await appPrisma.audit_logs.findMany({
      where,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        users_audit_logs_actor_idTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        users_audit_logs_related_user_idTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        jobs: {
          select: {
            id: true,
            title: true,
            department: true,
          },
        },
      },
    });

    // Transform audit logs for timeline display
    const transformedLogs = auditLogs.map((log) => {
      const actorName = log.users_audit_logs_actor_idTousers
        ? `${log.users_audit_logs_actor_idTousers.firstName || ""} ${log.users_audit_logs_actor_idTousers.lastName || ""}`.trim() ||
          log.users_audit_logs_actor_idTousers.email
        : log.actor_name || "System";

      return {
        id: log.id,
        type: getTimelineType(log.event_type, log.category, log.subcategory),
        content: log.description || log.action,
        action: log.action,
        timestamp: log.created_at,
        author: actorName,
        authorId: log.actor_id,
        eventType: log.event_type,
        category: log.category,
        subcategory: log.subcategory,
        severity: log.severity,
        status: log.status,
        tags: log.tags,
        metadata: log.metadata,
        changes: log.changes,
        oldValues: log.old_values,
        newValues: log.new_values,
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        isSystemGenerated: log.actor_type === "system",
        // Additional context
        relatedUser: log.users_audit_logs_related_user_idTousers,
        relatedJob: log.jobs,
      };
    });

    return NextResponse.json({
      success: true,
      data: transformedLogs,
      application: {
        id: application.id,
        name: application.name,
        email: application.email,
        status: application.status,
        jobTitle: application.jobs?.title,
        department: application.jobs?.department,
      },
    });
  } catch (error) {
    console.error("Error fetching application audit logs:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch application audit logs",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Helper function to determine timeline item type based on audit log data
function getTimelineType(eventType, category, subcategory) {
  if (subcategory === "STATUS_CHANGE") return "status_change";
  if (subcategory === "NOTE_UPDATE") return "note";
  if (category === "EMAIL") return "email";
  if (eventType === "CREATE") return "created";
  if (eventType === "UPDATE") return "updated";
  if (eventType === "DELETE") return "deleted";
  if (eventType === "LOGIN") return "login";
  if (eventType === "VIEW") return "viewed";
  return "activity";
}
