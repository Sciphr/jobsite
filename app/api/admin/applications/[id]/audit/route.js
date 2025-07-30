import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import { PrismaClient } from "@/app/generated/prisma";

const prisma = new PrismaClient();

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !session.user.privilegeLevel ||
      session.user.privilegeLevel < 1
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get("limit")) || 50;
    const includeSystem = searchParams.get("includeSystem") === "true";

    // Verify application exists
    const application = await prisma.applications.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        job: { select: { title: true, department: true } },
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
        { relatedApplicationId: id },
        { entityType: "application", entityId: id },
      ],
    };

    // Filter out system-generated logs if requested
    if (!includeSystem) {
      where.actorType = { not: "system" };
    }

    // Fetch audit logs related to this application
    const auditLogs = await prisma.audit_logs.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        relatedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        relatedJob: {
          select: {
            id: true,
            title: true,
            department: true,
          },
        },
      },
    });

    // Transform audit logs for timeline display
    const transformedLogs = audit_logs.map((log) => {
      const actorName = log.actor
        ? `${log.actor.firstName || ""} ${log.actor.lastName || ""}`.trim() ||
          log.actor.email
        : log.actorName || "System";

      return {
        id: log.id,
        type: getTimelineType(log.eventType, log.categories, log.subcategory),
        content: log.description || log.action,
        action: log.action,
        timestamp: log.createdAt,
        author: actorName,
        authorId: log.actorId,
        eventType: log.eventType,
        categories: log.categories,
        subcategory: log.subcategory,
        severity: log.severity,
        status: log.status,
        tags: log.tags,
        metadata: log.metadata,
        changes: log.changes,
        oldValues: log.oldValues,
        newValues: log.newValues,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        isSystemGenerated: log.actorType === "system",
        // Additional context
        relatedUser: log.relatedUser,
        relatedJob: log.relatedJob,
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
        jobTitle: application.job?.title,
        department: application.job?.department,
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
