import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { appPrisma } from "../../../../lib/prisma";
import { protectRoute } from "../../../../lib/middleware/apiProtection";
import { logAuditEvent } from "../../../../../lib/auditMiddleware";

export async function POST(req) {
  // Check if user has permission to modify applications (admin only)
  const authResult = await protectRoute("applications", "update");
  if (authResult.error) return authResult.error;

  const { session } = authResult;

  // Only allow super admins to trigger auto-archive manually
  if (session.user.privilegeLevel < 3) {
    return new Response(
      JSON.stringify({ message: "Insufficient privileges" }),
      { status: 403 }
    );
  }

  try {
    // Get the auto archive setting
    const autoArchiveSetting = await appPrisma.settings.findFirst({
      where: { key: 'auto_archive_rejected_days' }
    });

    if (!autoArchiveSetting || !autoArchiveSetting.value) {
      return new Response(
        JSON.stringify({ message: "Auto archive setting not configured" }),
        { status: 400 }
      );
    }

    const daysToArchive = parseInt(autoArchiveSetting.value);
    if (isNaN(daysToArchive) || daysToArchive <= 0) {
      return new Response(
        JSON.stringify({ message: "Invalid auto archive days setting" }),
        { status: 400 }
      );
    }

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToArchive);

    // Find rejected applications that are older than the cutoff and not already archived
    const applicationsToArchive = await appPrisma.applications.findMany({
      where: {
        status: 'Rejected',
        is_archived: false,
        updatedAt: { lt: cutoffDate }
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        updatedAt: true,
        jobs: { select: { title: true } }
      }
    });

    if (applicationsToArchive.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No applications found for auto-archiving",
          count: 0
        }),
        { status: 200 }
      );
    }

    const applicationIds = applicationsToArchive.map(app => app.id);

    // Archive the applications
    const updateResult = await appPrisma.applications.updateMany({
      where: { id: { in: applicationIds } },
      data: {
        is_archived: true,
        archived_at: new Date(),
        archived_by: session.user.id, // System/admin triggered
        archive_reason: 'auto_rejected_expired'
      }
    });

    // Create audit logs for each application
    const auditPromises = applicationsToArchive.map(app => 
      logAuditEvent({
        eventType: 'UPDATE',
        category: 'APPLICATION',
        subcategory: 'AUTO_ARCHIVE',
        entityType: 'application',
        entityId: app.id,
        entityName: app.name || app.email,
        actorId: session.user.id,
        actorName: `${session.user.firstName} ${session.user.lastName}`.trim(),
        actorType: 'user',
        action: 'Auto-archive rejected application',
        description: `Application auto-archived after ${daysToArchive} days in rejected status`,
        oldValues: {
          is_archived: false,
          archived_at: null,
          archived_by: null,
          archive_reason: null,
        },
        newValues: {
          is_archived: true,
          archived_at: new Date(),
          archived_by: session.user.id,
          archive_reason: 'auto_rejected_expired',
        },
        changes: {
          is_archived: { from: false, to: true },
          archive_reason: { from: null, to: 'auto_rejected_expired' }
        },
        relatedApplicationId: app.id,
        metadata: {
          jobTitle: app.jobs?.title,
          rejectedDate: app.updatedAt,
          daysRejected: Math.floor((new Date() - new Date(app.updatedAt)) / (1000 * 60 * 60 * 24)),
          autoArchiveDays: daysToArchive,
          bulkOperation: true,
          totalCount: applicationsToArchive.length,
        }
      }, req)
    );

    await Promise.all(auditPromises);

    // Log the bulk operation
    await logAuditEvent({
      eventType: 'BULK_UPDATE',
      category: 'APPLICATION',
      subcategory: 'AUTO_ARCHIVE',
      actorId: session.user.id,
      actorName: `${session.user.firstName} ${session.user.lastName}`.trim(),
      actorType: 'user',
      action: 'Bulk auto-archive rejected applications',
      description: `Auto-archived ${updateResult.count} rejected applications older than ${daysToArchive} days`,
      metadata: {
        archivedCount: updateResult.count,
        daysThreshold: daysToArchive,
        cutoffDate: cutoffDate.toISOString(),
        triggerType: 'manual' // vs 'scheduled' when we add cron
      }
    }, req);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully auto-archived ${updateResult.count} rejected applications older than ${daysToArchive} days`,
        count: updateResult.count,
        daysThreshold: daysToArchive
      }),
      { status: 200 }
    );

  } catch (error) {
    console.error("Auto-archive error:", error);
    
    // Log error to audit
    await logAuditEvent({
      eventType: 'ERROR',
      category: 'APPLICATION',
      subcategory: 'AUTO_ARCHIVE',
      actorId: session?.user?.id,
      actorName: session?.user ? `${session.user.firstName} ${session.user.lastName}`.trim() : 'System',
      actorType: session?.user ? 'user' : 'system',
      action: 'Auto-archive rejected applications',
      description: `Failed to auto-archive applications: ${error.message}`,
      severity: 'error',
      status: 'failure',
      metadata: { error: error.message }
    }, req);

    return new Response(
      JSON.stringify({ message: "Internal server error" }),
      { status: 500 }
    );
  }
}

// GET endpoint to check what would be archived (dry run)
export async function GET(req) {
  const authResult = await protectRoute("applications", "view");
  if (authResult.error) return authResult.error;

  try {
    // Get the auto archive setting
    const autoArchiveSetting = await appPrisma.settings.findFirst({
      where: { key: 'auto_archive_rejected_days' }
    });

    if (!autoArchiveSetting || !autoArchiveSetting.value) {
      return new Response(
        JSON.stringify({ 
          message: "Auto archive setting not configured",
          count: 0,
          applications: []
        }),
        { status: 200 }
      );
    }

    const daysToArchive = parseInt(autoArchiveSetting.value);
    if (isNaN(daysToArchive) || daysToArchive <= 0) {
      return new Response(
        JSON.stringify({ 
          message: "Invalid auto archive days setting",
          count: 0,
          applications: []
        }),
        { status: 200 }
      );
    }

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToArchive);

    // Find rejected applications that would be archived
    const applicationsToArchive = await appPrisma.applications.findMany({
      where: {
        status: 'Rejected',
        is_archived: false,
        updatedAt: { lt: cutoffDate }
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        updatedAt: true,
        jobs: { 
          select: { 
            id: true,
            title: true 
          } 
        }
      },
      orderBy: { updatedAt: 'asc' }
    });

    return new Response(
      JSON.stringify({
        count: applicationsToArchive.length,
        daysThreshold: daysToArchive,
        cutoffDate: cutoffDate.toISOString(),
        applications: applicationsToArchive.map(app => ({
          id: app.id,
          name: app.name || 'Anonymous',
          email: app.email,
          jobTitle: app.jobs?.title,
          rejectedDate: app.updatedAt,
          daysRejected: Math.floor((new Date() - new Date(app.updatedAt)) / (1000 * 60 * 60 * 24))
        }))
      }),
      { status: 200 }
    );

  } catch (error) {
    console.error("Auto-archive preview error:", error);
    return new Response(
      JSON.stringify({ message: "Internal server error" }),
      { status: 500 }
    );
  }
}