// app/lib/autoRejectScheduler.js
import cron from "node-cron";
import { appPrisma } from "./prisma";
import { logAuditEvent } from "../../lib/auditMiddleware";

class AutoRejectScheduler {
  constructor() {
    this.currentTask = null;
    this.isRunning = false;
    console.log("🚫 Auto-Reject Scheduler initialized");
  }

  async start() {
    if (this.isRunning) {
      console.log("🚫 Auto-Reject Scheduler already running");
      return;
    }

    this.isRunning = true;
    console.log("🚫 Starting Auto-Reject Scheduler...");

    // Initial schedule setup
    await this.updateSchedule();

    // Check for schedule updates every hour
    cron.schedule("0 * * * *", async () => {
      console.log("🔄 Checking for auto-reject schedule updates...");
      await this.updateSchedule();
    });

    console.log("✅ Auto-Reject Scheduler started successfully");
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
          "🚫 Workflow automation disabled, skipping auto-reject schedule"
        );
        this.stopCurrentTask();
        return;
      }

      // Get auto-reject setting from database
      const setting = await appPrisma.settings.findFirst({
        where: {
          key: "auto_reject_after_days",
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

      // Check if we have the required setting (auto_reject_after_days)
      if (!daysThreshold) {
        console.log(
          "🚫 Auto-reject after days setting not configured or disabled (0), skipping schedule"
        );
        this.stopCurrentTask();
        return;
      }

      // Create cron expression for midnight daily: "0 0 * * *"
      const cronExpression = "0 0 * * *";

      console.log(
        `🚫 Setting up auto-reject schedule: Daily at midnight for applications older than ${daysThreshold} days (cron: ${cronExpression})`
      );

      // Stop current task if exists
      this.stopCurrentTask();

      // Create new scheduled task
      this.currentTask = cron.schedule(
        cronExpression,
        async () => {
          console.log("🚫 Executing scheduled auto-reject...");
          await this.executeAutoReject();
        },
        {
          scheduled: true,
          timezone: "America/New_York", // Adjust timezone as needed
        }
      );

      console.log("✅ Auto-reject schedule updated successfully");
    } catch (error) {
      console.error("❌ Error updating auto-reject schedule:", error);
    }
  }

  stopCurrentTask() {
    if (this.currentTask) {
      this.currentTask.stop();
      this.currentTask.destroy();
      this.currentTask = null;
      console.log("🛑 Stopped current auto-reject schedule");
    }
  }

  async executeAutoReject() {
    try {
      console.log("🚀 Starting scheduled auto-reject process...");

      // Get the auto reject setting
      const autoRejectSetting = await appPrisma.settings.findFirst({
        where: { key: "auto_reject_after_days" },
      });

      if (!autoRejectSetting || !autoRejectSetting.value) {
        console.log("❌ Auto reject setting not configured");
        return;
      }

      const daysToReject = parseInt(autoRejectSetting.value);
      if (isNaN(daysToReject) || daysToReject <= 0) {
        console.log("❌ Invalid auto reject days setting or disabled (0)");
        return;
      }

      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToReject);

      // Find applications that are NOT rejected and NOT archived and are older than the cutoff
      const applicationsToReject = await appPrisma.applications.findMany({
        where: {
          status: { not: "Rejected" },
          is_archived: { not: true },
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

      if (applicationsToReject.length === 0) {
        console.log(
          `🚫 No applications found for auto-reject (older than ${daysToReject} days)`
        );

        // Log successful execution with no action needed
        await logAuditEvent({
          eventType: "SYSTEM_ACTION",
          category: "SYSTEM",
          subcategory: "AUTO_REJECT",
          actorId: null,
          actorName: "Auto-Reject Scheduler",
          actorType: "system",
          action: "Auto-reject execution completed",
          description: `No applications found for auto-reject older than ${daysToReject} days`,
          severity: "info",
          status: "success",
          metadata: {
            rejectedCount: 0,
            daysThreshold: daysToReject,
            executionTime: new Date().toISOString(),
          },
        });

        return;
      }

      const applicationIds = applicationsToReject.map((app) => app.id);

      // Reject the applications
      const updateResult = await appPrisma.applications.updateMany({
        where: { id: { in: applicationIds } },
        data: {
          status: "Rejected",
          updatedAt: new Date(),
        },
      });

      console.log(
        `✅ Auto-rejected ${updateResult.count} applications after ${daysToReject} days of inactivity`
      );

      // Create audit logs for each application
      const auditPromises = applicationsToReject.map((app) =>
        logAuditEvent({
          eventType: "UPDATE",
          category: "APPLICATION",
          subcategory: "AUTO_REJECT",
          entityType: "application",
          entityId: app.id,
          entityName: app.name || app.email,
          actorId: null, // System action
          actorName: "Auto-Reject Scheduler",
          actorType: "system",
          action: "Auto-reject application",
          description: `Application auto-rejected after ${daysToReject} days of inactivity`,
          oldValues: {
            status: app.status,
          },
          newValues: {
            status: "Rejected",
            updatedAt: new Date(),
          },
          changes: {
            status: { from: app.status, to: "Rejected" },
          },
          relatedApplicationId: app.id,
          metadata: {
            jobTitle: app.jobs?.title,
            appliedDate: app.appliedAt,
            daysInactive: Math.floor(
              (new Date() - new Date(app.appliedAt)) / (1000 * 60 * 60 * 24)
            ),
            autoRejectDays: daysToReject,
            bulkOperation: true,
            totalCount: applicationsToReject.length,
            triggerType: "scheduled", // vs 'manual' when triggered from UI
            previousStatus: app.status,
          },
        })
      );

      await Promise.all(auditPromises);

      // Log the bulk operation
      await logAuditEvent({
        eventType: "BULK_UPDATE",
        category: "APPLICATION",
        subcategory: "AUTO_REJECT",
        actorId: null,
        actorName: "Auto-Reject Scheduler",
        actorType: "system",
        action: "Bulk auto-reject applications",
        description: `Scheduled auto-reject moved ${updateResult.count} applications to Rejected status after ${daysToReject} days of inactivity`,
        metadata: {
          rejectedCount: updateResult.count,
          daysThreshold: daysToReject,
          cutoffDate: cutoffDate.toISOString(),
          triggerType: "scheduled",
        },
      });

      // Log successful execution
      await logAuditEvent({
        eventType: "SYSTEM_ACTION",
        category: "SYSTEM",
        subcategory: "AUTO_REJECT",
        actorId: null,
        actorName: "Auto-Reject Scheduler",
        actorType: "system",
        action: "Auto-reject execution completed",
        description: `Successfully auto-rejected ${updateResult.count} applications after ${daysToReject} days of inactivity`,
        severity: "info",
        status: "success",
        metadata: {
          rejectedCount: updateResult.count,
          daysThreshold: daysToReject,
          executionTime: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("❌ Error executing auto-reject:", error);

      // Log the error
      await logAuditEvent({
        eventType: "ERROR",
        category: "SYSTEM",
        subcategory: "AUTO_REJECT",
        actorId: null,
        actorName: "Auto-Reject Scheduler",
        actorType: "system",
        action: "Auto-reject execution failed",
        description: `Failed to execute auto-reject: ${error.message}`,
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
    console.log("🛑 Auto-Reject Scheduler stopped");
  }

  // Method to manually trigger auto-reject (for testing)
  async triggerNow() {
    console.log("🔧 Manually triggering auto-reject...");
    await this.executeAutoReject();
  }

  // Get current schedule info
  async getScheduleInfo() {
    try {
      const setting = await appPrisma.settings.findFirst({
        where: {
          key: "auto_reject_after_days",
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
      console.error("❌ Error getting auto-reject schedule info:", error);
      return null;
    }
  }
}

// Create singleton instance
const autoRejectScheduler = new AutoRejectScheduler();

export { autoRejectScheduler };