// app/lib/autoProgressScheduler.js
import cron from "node-cron";
import { appPrisma } from "./prisma";
import { logAuditEvent } from "../../lib/auditMiddleware";

class AutoProgressScheduler {
  constructor() {
    this.currentTask = null;
    this.isRunning = false;
    console.log("📈 Auto-Progress Scheduler initialized");
  }

  async start() {
    if (this.isRunning) {
      console.log("📈 Auto-Progress Scheduler already running");
      return;
    }

    this.isRunning = true;
    console.log("📈 Starting Auto-Progress Scheduler...");

    // Initial schedule setup
    await this.updateSchedule();

    // Check for schedule updates every hour
    cron.schedule("0 * * * *", async () => {
      console.log("🔄 Checking for auto-progress schedule updates...");
      await this.updateSchedule();
    });

    console.log("✅ Auto-Progress Scheduler started successfully");
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
          "📈 Workflow automation disabled, skipping auto-progress schedule"
        );
        this.stopCurrentTask();
        return;
      }

      // Get auto-progress setting from database
      const setting = await appPrisma.settings.findFirst({
        where: {
          key: "auto_progress_delay_days",
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

      // Check if we have the required setting (auto_progress_delay_days)
      if (!daysThreshold) {
        console.log(
          "📈 Auto-progress delay days setting not configured or disabled (0), skipping schedule"
        );
        this.stopCurrentTask();
        return;
      }

      // Create cron expression for midnight daily: "0 0 * * *"
      const cronExpression = "0 0 * * *";

      console.log(
        `📈 Setting up auto-progress schedule: Daily at midnight for Applied applications older than ${daysThreshold} days (cron: ${cronExpression})`
      );

      // Stop current task if exists
      this.stopCurrentTask();

      // Create new scheduled task
      this.currentTask = cron.schedule(
        cronExpression,
        async () => {
          console.log("📈 Executing scheduled auto-progress...");
          await this.executeAutoProgress();
        },
        {
          scheduled: true,
          timezone: "America/New_York", // Adjust timezone as needed
        }
      );

      console.log("✅ Auto-progress schedule updated successfully");
    } catch (error) {
      console.error("❌ Error updating auto-progress schedule:", error);
    }
  }

  stopCurrentTask() {
    if (this.currentTask) {
      this.currentTask.stop();
      this.currentTask.destroy();
      this.currentTask = null;
      console.log("🛑 Stopped current auto-progress schedule");
    }
  }

  async executeAutoProgress() {
    try {
      console.log("🚀 Starting scheduled auto-progress process...");

      // Get the auto progress setting
      const autoProgressSetting = await appPrisma.settings.findFirst({
        where: { key: "auto_progress_delay_days" },
      });

      if (!autoProgressSetting || !autoProgressSetting.value) {
        console.log("❌ Auto progress setting not configured");
        return;
      }

      const daysToProgress = parseInt(autoProgressSetting.value);
      if (isNaN(daysToProgress) || daysToProgress <= 0) {
        console.log("❌ Invalid auto progress days setting or disabled (0)");
        return;
      }

      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToProgress);

      // Find "Applied" applications that are older than the cutoff
      const applicationsToProgress = await appPrisma.applications.findMany({
        where: {
          status: "Applied",
          appliedAt: { lt: cutoffDate },
        },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          appliedAt: true,
          jobs: { select: { title: true } },
        },
      });

      if (applicationsToProgress.length === 0) {
        console.log(
          `📈 No applications found for auto-progress (older than ${daysToProgress} days)`
        );

        // Log successful execution with no action needed
        await logAuditEvent({
          eventType: "SYSTEM_ACTION",
          category: "SYSTEM",
          subcategory: "AUTO_PROGRESS",
          actorId: null,
          actorName: "Auto-Progress Scheduler",
          actorType: "system",
          action: "Auto-progress execution completed",
          description: `No applications found for auto-progress older than ${daysToProgress} days`,
          severity: "info",
          status: "success",
          metadata: {
            progressedCount: 0,
            daysThreshold: daysToProgress,
            executionTime: new Date().toISOString(),
          },
        });

        return;
      }

      const applicationIds = applicationsToProgress.map((app) => app.id);

      // Progress the applications from Applied to Reviewing
      const updateResult = await appPrisma.applications.updateMany({
        where: { id: { in: applicationIds } },
        data: {
          status: "Reviewing",
          updatedAt: new Date(),
        },
      });

      console.log(
        `✅ Auto-progressed ${updateResult.count} applications from Applied to Reviewing`
      );

      // Create audit logs for each application
      const auditPromises = applicationsToProgress.map((app) =>
        logAuditEvent({
          eventType: "UPDATE",
          category: "APPLICATION",
          subcategory: "AUTO_PROGRESS",
          entityType: "application",
          entityId: app.id,
          entityName: app.name || app.email,
          actorId: null, // System action
          actorName: "Auto-Progress Scheduler",
          actorType: "system",
          action: "Auto-progress application status",
          description: `Application auto-progressed from Applied to Reviewing after ${daysToProgress} days`,
          oldValues: {
            status: "Applied",
          },
          newValues: {
            status: "Reviewing",
            updatedAt: new Date(),
          },
          changes: {
            status: { from: "Applied", to: "Reviewing" },
          },
          relatedApplicationId: app.id,
          metadata: {
            jobTitle: app.jobs?.title,
            appliedDate: app.appliedAt,
            daysApplied: Math.floor(
              (new Date() - new Date(app.appliedAt)) / (1000 * 60 * 60 * 24)
            ),
            autoProgressDays: daysToProgress,
            bulkOperation: true,
            totalCount: applicationsToProgress.length,
            triggerType: "scheduled", // vs 'manual' when triggered from UI
          },
        })
      );

      await Promise.all(auditPromises);

      // Log the bulk operation
      await logAuditEvent({
        eventType: "BULK_UPDATE",
        category: "APPLICATION",
        subcategory: "AUTO_PROGRESS",
        actorId: null,
        actorName: "Auto-Progress Scheduler",
        actorType: "system",
        action: "Bulk auto-progress applications",
        description: `Scheduled auto-progress moved ${updateResult.count} applications from Applied to Reviewing after ${daysToProgress} days`,
        metadata: {
          progressedCount: updateResult.count,
          daysThreshold: daysToProgress,
          cutoffDate: cutoffDate.toISOString(),
          triggerType: "scheduled",
        },
      });

      // Log successful execution
      await logAuditEvent({
        eventType: "SYSTEM_ACTION",
        category: "SYSTEM",
        subcategory: "AUTO_PROGRESS",
        actorId: null,
        actorName: "Auto-Progress Scheduler",
        actorType: "system",
        action: "Auto-progress execution completed",
        description: `Successfully auto-progressed ${updateResult.count} applications from Applied to Reviewing after ${daysToProgress} days`,
        severity: "info",
        status: "success",
        metadata: {
          progressedCount: updateResult.count,
          daysThreshold: daysToProgress,
          executionTime: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("❌ Error executing auto-progress:", error);

      // Log the error
      await logAuditEvent({
        eventType: "ERROR",
        category: "SYSTEM",
        subcategory: "AUTO_PROGRESS",
        actorId: null,
        actorName: "Auto-Progress Scheduler",
        actorType: "system",
        action: "Auto-progress execution failed",
        description: `Failed to execute auto-progress: ${error.message}`,
        severity: "error",
        status: "failure",
        metadata: {
          error: error.message,
          executionTime: new Date().toISOString(),
        },
      });
    }
  }

  stop() {
    this.stopCurrentTask();
    this.isRunning = false;
    console.log("🛑 Auto-Progress Scheduler stopped");
  }

  // Method to manually trigger auto-progress (for testing)
  async triggerNow() {
    console.log("🔧 Manually triggering auto-progress...");
    await this.executeAutoProgress();
  }

  // Get current schedule info
  async getScheduleInfo() {
    try {
      const setting = await appPrisma.settings.findFirst({
        where: {
          key: "auto_progress_delay_days",
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
      console.error("❌ Error getting auto-progress schedule info:", error);
      return null;
    }
  }
}

// Create singleton instance
const autoProgressScheduler = new AutoProgressScheduler();

export { autoProgressScheduler };
