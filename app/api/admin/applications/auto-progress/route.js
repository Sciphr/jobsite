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

  // Only allow super admins to trigger auto-progress manually
  if (session.user.privilegeLevel < 3) {
    return new Response(
      JSON.stringify({ message: "Insufficient privileges" }),
      { status: 403 }
    );
  }

  try {
    // Get the auto progress setting
    const autoProgressSetting = await appPrisma.settings.findFirst({
      where: { key: 'auto_progress_delay_days' }
    });

    if (!autoProgressSetting || !autoProgressSetting.value) {
      return new Response(
        JSON.stringify({ message: "Auto progress setting not configured" }),
        { status: 400 }
      );
    }

    const daysToProgress = parseInt(autoProgressSetting.value);
    if (isNaN(daysToProgress) || daysToProgress <= 0) {
      return new Response(
        JSON.stringify({ message: "Auto progress is disabled (set to 0 days)" }),
        { status: 400 }
      );
    }

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToProgress);

    // Find "Applied" applications that are older than the cutoff
    const applicationsToProgress = await appPrisma.applications.findMany({
      where: {
        status: 'Applied',
        appliedAt: { lt: cutoffDate }
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        appliedAt: true,
        jobs: { select: { title: true } }
      }
    });

    if (applicationsToProgress.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No applications found for auto-progress",
          count: 0
        }),
        { status: 200 }
      );
    }

    const applicationIds = applicationsToProgress.map(app => app.id);

    // Progress the applications from Applied to Reviewing
    const updateResult = await appPrisma.applications.updateMany({
      where: { id: { in: applicationIds } },
      data: {
        status: 'Reviewing',
        updatedAt: new Date()
      }
    });

    // Create audit logs for each application
    const auditPromises = applicationsToProgress.map(app => 
      logAuditEvent({
        eventType: 'UPDATE',
        category: 'APPLICATION',
        subcategory: 'AUTO_PROGRESS',
        entityType: 'application',
        entityId: app.id,
        entityName: app.name || app.email,
        actorId: session.user.id,
        actorName: `${session.user.firstName} ${session.user.lastName}`.trim(),
        actorType: 'user',
        action: 'Auto-progress application status',
        description: `Application auto-progressed from Applied to Reviewing after ${daysToProgress} days`,
        oldValues: {
          status: 'Applied',
        },
        newValues: {
          status: 'Reviewing',
          updatedAt: new Date(),
        },
        changes: {
          status: { from: 'Applied', to: 'Reviewing' },
        },
        relatedApplicationId: app.id,
        metadata: {
          jobTitle: app.jobs?.title,
          appliedDate: app.appliedAt,
          daysApplied: Math.floor((new Date() - new Date(app.appliedAt)) / (1000 * 60 * 60 * 24)),
          autoProgressDays: daysToProgress,
          bulkOperation: true,
          totalCount: applicationsToProgress.length,
        }
      }, req)
    );

    await Promise.all(auditPromises);

    // Log the bulk operation
    await logAuditEvent({
      eventType: 'BULK_UPDATE',
      category: 'APPLICATION',
      subcategory: 'AUTO_PROGRESS',
      actorId: session.user.id,
      actorName: `${session.user.firstName} ${session.user.lastName}`.trim(),
      actorType: 'user',
      action: 'Bulk auto-progress applications',
      description: `Auto-progressed ${updateResult.count} applications from Applied to Reviewing after ${daysToProgress} days`,
      metadata: {
        progressedCount: updateResult.count,
        daysThreshold: daysToProgress,
        cutoffDate: cutoffDate.toISOString(),
        triggerType: 'manual' // vs 'scheduled' from cron
      }
    }, req);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully auto-progressed ${updateResult.count} applications from Applied to Reviewing after ${daysToProgress} days`,
        count: updateResult.count,
        daysThreshold: daysToProgress
      }),
      { status: 200 }
    );

  } catch (error) {
    console.error("Auto-progress error:", error);
    
    // Log error to audit
    await logAuditEvent({
      eventType: 'ERROR',
      category: 'APPLICATION',
      subcategory: 'AUTO_PROGRESS',
      actorId: session?.user?.id,
      actorName: session?.user ? `${session.user.firstName} ${session.user.lastName}`.trim() : 'System',
      actorType: session?.user ? 'user' : 'system',
      action: 'Auto-progress applications',
      description: `Failed to auto-progress applications: ${error.message}`,
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

// GET endpoint to check what would be progressed (dry run)
export async function GET(req) {
  const authResult = await protectRoute("applications", "view");
  if (authResult.error) return authResult.error;

  try {
    // Get the auto progress setting
    const autoProgressSetting = await appPrisma.settings.findFirst({
      where: { key: 'auto_progress_delay_days' }
    });

    if (!autoProgressSetting || !autoProgressSetting.value) {
      return new Response(
        JSON.stringify({ 
          message: "Auto progress setting not configured",
          count: 0,
          applications: []
        }),
        { status: 200 }
      );
    }

    const daysToProgress = parseInt(autoProgressSetting.value);
    if (isNaN(daysToProgress) || daysToProgress <= 0) {
      return new Response(
        JSON.stringify({ 
          message: "Auto progress is disabled (set to 0 days)",
          count: 0,
          applications: []
        }),
        { status: 200 }
      );
    }

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToProgress);

    // Find "Applied" applications that would be progressed
    const applicationsToProgress = await appPrisma.applications.findMany({
      where: {
        status: 'Applied',
        appliedAt: { lt: cutoffDate }
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        appliedAt: true,
        jobs: { 
          select: { 
            id: true,
            title: true 
          } 
        }
      },
      orderBy: { appliedAt: 'asc' }
    });

    return new Response(
      JSON.stringify({
        count: applicationsToProgress.length,
        daysThreshold: daysToProgress,
        cutoffDate: cutoffDate.toISOString(),
        applications: applicationsToProgress.map(app => ({
          id: app.id,
          name: app.name || 'Anonymous',
          email: app.email,
          jobTitle: app.jobs?.title,
          appliedDate: app.appliedAt,
          daysApplied: Math.floor((new Date() - new Date(app.appliedAt)) / (1000 * 60 * 60 * 24))
        }))
      }),
      { status: 200 }
    );

  } catch (error) {
    console.error("Auto-progress preview error:", error);
    return new Response(
      JSON.stringify({ message: "Internal server error" }),
      { status: 500 }
    );
  }
}