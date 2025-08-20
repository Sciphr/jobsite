// app/lib/autoArchiveScheduler.js
import cron from "node-cron";
import { appPrisma } from "./prisma";
import { logAuditEvent } from "../../lib/auditMiddleware";

class AutoArchiveScheduler {
  constructor() {
    this.currentTask = null;
    this.isRunning = false;
    console.log("📦 Auto-Archive Scheduler initialized");
  }

  async start() {
    if (this.isRunning) {
      console.log("📦 Auto-Archive Scheduler already running");
      return;
    }

    this.isRunning = true;
    console.log("📦 Starting Auto-Archive Scheduler...");

    // Initial schedule setup
    await this.updateSchedule();

    // Check for schedule updates every hour
    cron.schedule("0 * * * *", async () => {
      console.log("🔄 Checking for auto-archive schedule updates...");
      await this.updateSchedule();
    });

    console.log("✅ Auto-Archive Scheduler started successfully");
  }

  async updateSchedule() {
    try {
      // Check if workflow automation is enabled
      const workflowAutomationSetting = await appPrisma.settings.findFirst({
        where: {
          key: "enable_workflow_automation",
          userId: null,
        },
      });

      if (!workflowAutomationSetting || workflowAutomationSetting.value !== 'true') {
        console.log(
          "📦 Workflow automation disabled, skipping auto-archive schedule"
        );
        this.stopCurrentTask();
        return;
      }

      // Get auto-archive setting from database
      const setting = await appPrisma.settings.findFirst({
        where: {
          key: "auto_archive_rejected_days",
          userId: null,
        },
      });

      // Parse setting
      let daysThreshold = null;
      if (setting) {
        const days = parseInt(setting.value);
        if (!isNaN(days) && days > 0) {
          daysThreshold = days;
        }
      }

      // Check if we have the required setting (auto_archive_rejected_days)
      if (!daysThreshold) {
        console.log(
          "📦 Auto-archive rejected days setting not configured or invalid, skipping schedule"
        );
        this.stopCurrentTask();
        return;
      }

      // Create cron expression for midnight daily: "0 0 * * *"
      const cronExpression = "0 0 * * *";

      console.log(
        `📦 Setting up auto-archive schedule: Daily at midnight for rejected applications older than ${daysThreshold} days (cron: ${cronExpression})`
      );

      // Stop current task if exists
      this.stopCurrentTask();

      // Create new scheduled task
      this.currentTask = cron.schedule(
        cronExpression,
        async () => {
          console.log("📦 Executing scheduled auto-archive...");
          await this.executeAutoArchive();
        },
        {
          scheduled: true,
          timezone: "America/New_York", // Adjust timezone as needed
        }
      );

      console.log("✅ Auto-archive schedule updated successfully");
    } catch (error) {
      console.error("❌ Error updating auto-archive schedule:", error);
    }
  }

  stopCurrentTask() {
    if (this.currentTask) {
      this.currentTask.stop();
      this.currentTask.destroy();
      this.currentTask = null;
      console.log("🛑 Stopped current auto-archive schedule");
    }
  }

  async executeAutoArchive() {
    try {
      console.log("🚀 Starting scheduled auto-archive process...");

      // Get the auto archive setting
      const autoArchiveSetting = await appPrisma.settings.findFirst({
        where: { key: "auto_archive_rejected_days" },
      });

      if (!autoArchiveSetting || !autoArchiveSetting.value) {
        console.log("❌ Auto archive setting not configured");
        return;
      }

      const daysToArchive = parseInt(autoArchiveSetting.value);
      if (isNaN(daysToArchive) || daysToArchive <= 0) {
        console.log("❌ Invalid auto archive days setting");
        return;
      }

      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToArchive);

      // Find rejected applications that are older than the cutoff and not already archived
      const applicationsToArchive = await appPrisma.applications.findMany({
        where: {
          status: "Rejected",
          is_archived: false,
          updatedAt: { lt: cutoffDate },
        },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          updatedAt: true,
          jobs: { select: { title: true } },
        },
      });

      if (applicationsToArchive.length === 0) {
        console.log(
          `📦 No applications found for auto-archiving (older than ${daysToArchive} days)`
        );

        // Log successful execution with no action needed
        await logAuditEvent({
          eventType: "SYSTEM_ACTION",
          category: "SYSTEM",
          subcategory: "AUTO_ARCHIVE",
          actorId: null,
          actorName: "Auto-Archive Scheduler",
          actorType: "system",
          action: "Auto-archive execution completed",
          description: `No applications found for auto-archiving older than ${daysToArchive} days`,
          severity: "info",
          status: "success",
          metadata: {
            archivedCount: 0,
            daysThreshold: daysToArchive,
            executionTime: new Date().toISOString()
          }
        });

        return;
      }

      const applicationIds = applicationsToArchive.map((app) => app.id);

      // Archive the applications
      const updateResult = await appPrisma.applications.updateMany({
        where: { id: { in: applicationIds } },
        data: {
          is_archived: true,
          archived_at: new Date(),
          archived_by: null, // System-triggered (null indicates system action)
          archive_reason: "auto_rejected_expired",
        },
      });

      console.log(`✅ Auto-archived ${updateResult.count} applications`);

      // Create audit logs for each application
      const auditPromises = applicationsToArchive.map((app) =>
        logAuditEvent({
          eventType: "UPDATE",
          category: "APPLICATION",
          subcategory: "AUTO_ARCHIVE",
          entityType: "application",
          entityId: app.id,
          entityName: app.name || app.email,
          actorId: null, // System action
          actorName: "Auto-Archive Scheduler",
          actorType: "system",
          action: "Auto-archive rejected application",
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
            archived_by: null,
            archive_reason: "auto_rejected_expired",
          },
          changes: {
            is_archived: { from: false, to: true },
            archive_reason: { from: null, to: "auto_rejected_expired" },
          },
          relatedApplicationId: app.id,
          metadata: {
            jobTitle: app.jobs?.title,
            rejectedDate: app.updatedAt,
            daysRejected: Math.floor(
              (new Date() - new Date(app.updatedAt)) / (1000 * 60 * 60 * 24)
            ),
            autoArchiveDays: daysToArchive,
            bulkOperation: true,
            totalCount: applicationsToArchive.length,
            triggerType: "scheduled", // vs 'manual' when triggered from UI
          },
        })
      );

      await Promise.all(auditPromises);

      // Log the bulk operation
      await logAuditEvent({
        eventType: "BULK_UPDATE",
        category: "APPLICATION",
        subcategory: "AUTO_ARCHIVE",
        actorId: null,
        actorName: "Auto-Archive Scheduler",
        actorType: "system",
        action: "Bulk auto-archive rejected applications",
        description: `Scheduled auto-archive archived ${updateResult.count} rejected applications older than ${daysToArchive} days`,
        metadata: {
          archivedCount: updateResult.count,
          daysThreshold: daysToArchive,
          cutoffDate: cutoffDate.toISOString(),
          triggerType: "scheduled",
        },
      });

      // Log successful execution
      await logAuditEvent({
        eventType: "SYSTEM_ACTION",
        category: "SYSTEM",
        subcategory: "AUTO_ARCHIVE",
        actorId: null,
        actorName: "Auto-Archive Scheduler",
        actorType: "system",
        action: "Auto-archive execution completed",
        description: `Successfully auto-archived ${updateResult.count} rejected applications older than ${daysToArchive} days`,
        severity: "info",
        status: "success",
        metadata: {
          archivedCount: updateResult.count,
          daysThreshold: daysToArchive,
          executionTime: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("❌ Error executing auto-archive:", error);

      // Log the error
      await logAuditEvent({
        eventType: "ERROR",
        category: "SYSTEM",
        subcategory: "AUTO_ARCHIVE",
        actorId: null,
        actorName: "Auto-Archive Scheduler",
        actorType: "system",
        action: "Auto-archive execution failed",
        description: `Failed to execute auto-archive: ${error.message}`,
        severity: "error",
        status: "failure",
        metadata: {
          error: error.message,
          executionTime: new Date().toISOString()
        }
      });
    }
  }


  stop() {
    this.stopCurrentTask();
    this.isRunning = false;
    console.log("🛑 Auto-Archive Scheduler stopped");
  }

  // Method to manually trigger auto-archive (for testing)
  async triggerNow() {
    console.log("🔧 Manually triggering auto-archive...");
    await this.executeAutoArchive();
  }

  // Get current schedule info
  async getScheduleInfo() {
    try {
      const setting = await appPrisma.settings.findFirst({
        where: {
          key: "auto_archive_rejected_days",
          userId: null,
        },
      });

      let daysThreshold = null;
      if (setting) {
        const days = parseInt(setting.value);
        if (!isNaN(days) && days > 0) {
          daysThreshold = days;
        }
      }

      const enabled = daysThreshold !== null && daysThreshold > 0;

      return {
        enabled,
        daysThreshold,
        time: "00:00", // Always midnight
        isRunning: this.isRunning,
        hasActiveTask: this.currentTask !== null,
      };
    } catch (error) {
      console.error("❌ Error getting auto-archive schedule info:", error);
      return null;
    }
  }
}

// Create singleton instance only when not building
function isBuildTime() {
  return (
    process.env.npm_lifecycle_event === 'build' ||
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.DATABASE_URL?.includes('temp') ||
    process.env.CI === 'true'
  );
}

let autoArchiveScheduler;

if (!isBuildTime()) {
  autoArchiveScheduler = new AutoArchiveScheduler();
} else {
  console.log("📦 Skipping AutoArchiveScheduler creation during build");
  autoArchiveScheduler = {
    start: () => Promise.resolve(),
    stop: () => {},
    getScheduleInfo: () => Promise.resolve(null),
    triggerNow: () => Promise.resolve()
  };
}

export { autoArchiveScheduler };
