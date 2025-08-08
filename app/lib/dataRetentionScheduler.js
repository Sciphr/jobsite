// app/lib/dataRetentionScheduler.js
import cron from "node-cron";
import { appPrisma } from "./prisma";
import { logAuditEvent } from "../../lib/auditMiddleware";

class DataRetentionScheduler {
  constructor() {
    this.currentTask = null;
    this.isRunning = false;
    console.log("🗂️ Data Retention Scheduler initialized");
  }

  async start() {
    if (this.isRunning) {
      console.log("🗂️ Data Retention Scheduler already running");
      return;
    }

    this.isRunning = true;
    console.log("🗂️ Starting Data Retention Scheduler...");

    // Initial schedule setup
    await this.updateSchedule();

    // Check for schedule updates every day
    cron.schedule("0 0 * * *", async () => {
      console.log("🔄 Checking for data retention schedule updates...");
      await this.updateSchedule();
    });

    console.log("✅ Data Retention Scheduler started successfully");
  }

  async updateSchedule() {
    try {
      // Get data retention setting from database
      const setting = await appPrisma.settings.findFirst({
        where: {
          key: "candidate_data_retention_years",
          userId: null,
        },
      });

      // Parse setting
      let yearsThreshold = null;
      if (setting) {
        const years = parseInt(setting.value);
        if (!isNaN(years) && years >= 3) { // Minimum 3 years
          yearsThreshold = years;
        }
      }

      // Check if we have the required setting
      if (!yearsThreshold) {
        console.log(
          "🗂️ Data retention years setting not configured or invalid (minimum 3 years), skipping schedule"
        );
        this.stopCurrentTask();
        return;
      }

      // Create cron expression for daily at 2 AM: "0 2 * * *"
      const cronExpression = "0 2 * * *";

      console.log(
        `🗂️ Setting up data retention schedule: Daily at 2 AM for applications older than ${yearsThreshold} years (cron: ${cronExpression})`
      );

      // Stop current task if exists
      this.stopCurrentTask();

      // Create new scheduled task
      this.currentTask = cron.schedule(
        cronExpression,
        async () => {
          console.log("🗂️ Executing scheduled data retention cleanup...");
          await this.executeDataRetention();
        },
        {
          scheduled: true,
          timezone: "America/New_York", // Adjust timezone as needed
        }
      );

      console.log("✅ Data retention schedule updated successfully");
    } catch (error) {
      console.error("❌ Error updating data retention schedule:", error);
    }
  }

  stopCurrentTask() {
    if (this.currentTask) {
      this.currentTask.stop();
      this.currentTask.destroy();
      this.currentTask = null;
      console.log("🛑 Stopped current data retention schedule");
    }
  }

  async executeDataRetention() {
    try {
      console.log("🚀 Starting scheduled data retention process...");

      // Get the retention setting
      const retentionSetting = await appPrisma.settings.findFirst({
        where: { key: "candidate_data_retention_years" },
      });

      if (!retentionSetting || !retentionSetting.value) {
        console.log("❌ Data retention setting not configured");
        return;
      }

      const yearsToRetain = parseInt(retentionSetting.value);
      if (isNaN(yearsToRetain) || yearsToRetain < 3) {
        console.log("❌ Invalid data retention years setting (minimum 3 years required)");
        return;
      }

      // Calculate cutoff date (years ago)
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - yearsToRetain);

      console.log(`🗂️ Looking for applications older than ${cutoffDate.toISOString()}`);

      // Find applications that are archived AND older than the cutoff
      // Only delete archived applications for safety
      const applicationsToDelete = await appPrisma.applications.findMany({
        where: {
          is_archived: true,
          archived_at: { lt: cutoffDate },
        },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          archived_at: true,
          jobs: { select: { title: true } },
        },
      });

      if (applicationsToDelete.length === 0) {
        console.log(
          `🗂️ No archived applications found for deletion (older than ${yearsToRetain} years)`
        );

        // Log successful execution with no action needed
        await logAuditEvent({
          eventType: "SYSTEM_ACTION",
          category: "SYSTEM",
          subcategory: "DATA_RETENTION",
          actorId: null,
          actorName: "Data Retention Scheduler",
          actorType: "system",
          action: "Data retention execution completed",
          description: `No archived applications found for deletion older than ${yearsToRetain} years`,
          severity: "info",
          status: "success",
          metadata: {
            deletedCount: 0,
            yearsThreshold: yearsToRetain,
            cutoffDate: cutoffDate.toISOString(),
            executionTime: new Date().toISOString()
          }
        });

        return;
      }

      console.log(`⚠️ Found ${applicationsToDelete.length} applications for PERMANENT deletion`);

      const applicationIds = applicationsToDelete.map((app) => app.id);

      // Create audit logs BEFORE deletion (since we can't audit after they're gone)
      const auditPromises = applicationsToDelete.map((app) =>
        logAuditEvent({
          eventType: "DELETE",
          category: "APPLICATION", 
          subcategory: "DATA_RETENTION",
          entityType: "application",
          entityId: app.id,
          entityName: app.name || app.email,
          actorId: null, // System action
          actorName: "Data Retention Scheduler",
          actorType: "system",
          action: "Permanent deletion due to data retention policy",
          description: `Application permanently deleted after ${yearsToRetain} years retention period`,
          oldValues: {
            id: app.id,
            name: app.name,
            email: app.email,
            status: app.status,
            archived_at: app.archived_at,
          },
          newValues: null, // Deleted
          changes: {
            deleted: { from: false, to: true },
          },
          relatedApplicationId: app.id,
          metadata: {
            jobTitle: app.jobs?.title,
            archivedDate: app.archived_at,
            yearsRetained: Math.floor(
              (new Date() - new Date(app.archived_at)) / (1000 * 60 * 60 * 24 * 365.25)
            ),
            retentionPolicyYears: yearsToRetain,
            bulkOperation: true,
            totalCount: applicationsToDelete.length,
            triggerType: "scheduled",
            permanentDeletion: true,
          },
        })
      );

      await Promise.all(auditPromises);

      // Delete related data first (foreign key constraints)
      // Delete application notes
      await appPrisma.application_notes.deleteMany({
        where: { application_id: { in: applicationIds } }
      });

      // Delete audit logs related to these applications (optional - you might want to keep these)
      // await appPrisma.audit_logs.deleteMany({
      //   where: { relatedApplicationId: { in: applicationIds } }
      // });

      // Delete emails related to these applications
      await appPrisma.emails.deleteMany({
        where: { application_id: { in: applicationIds } }
      });

      // Delete application stage history
      await appPrisma.application_stage_history.deleteMany({
        where: { application_id: { in: applicationIds } }
      });

      // Delete hire approval requests if any
      await appPrisma.hire_approval_requests.deleteMany({
        where: { application_id: { in: applicationIds } }
      });

      // Finally, delete the applications themselves
      const deleteResult = await appPrisma.applications.deleteMany({
        where: { id: { in: applicationIds } },
      });

      console.log(`✅ PERMANENTLY DELETED ${deleteResult.count} applications and all related data`);

      // Log the bulk operation
      await logAuditEvent({
        eventType: "BULK_DELETE",
        category: "APPLICATION",
        subcategory: "DATA_RETENTION", 
        actorId: null,
        actorName: "Data Retention Scheduler",
        actorType: "system",
        action: "Bulk permanent deletion due to data retention policy",
        description: `Scheduled data retention permanently deleted ${deleteResult.count} applications older than ${yearsToRetain} years`,
        metadata: {
          deletedCount: deleteResult.count,
          yearsThreshold: yearsToRetain,
          cutoffDate: cutoffDate.toISOString(),
          triggerType: "scheduled",
          permanentDeletion: true,
        },
      });

      // Log successful execution
      await logAuditEvent({
        eventType: "SYSTEM_ACTION",
        category: "SYSTEM",
        subcategory: "DATA_RETENTION",
        actorId: null,
        actorName: "Data Retention Scheduler", 
        actorType: "system",
        action: "Data retention execution completed",
        description: `Successfully deleted ${deleteResult.count} applications older than ${yearsToRetain} years`,
        severity: "info",
        status: "success",
        metadata: {
          deletedCount: deleteResult.count,
          yearsThreshold: yearsToRetain,
          executionTime: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("❌ Error executing data retention:", error);

      // Log the error
      await logAuditEvent({
        eventType: "ERROR",
        category: "SYSTEM",
        subcategory: "DATA_RETENTION",
        actorId: null,
        actorName: "Data Retention Scheduler",
        actorType: "system",
        action: "Data retention execution failed",
        description: `Failed to execute data retention: ${error.message}`,
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
    console.log("🛑 Data Retention Scheduler stopped");
  }

  // Method to manually trigger data retention (for testing)
  async triggerNow() {
    console.log("🔧 Manually triggering data retention...");
    await this.executeDataRetention();
  }

  // Get current schedule info
  async getScheduleInfo() {
    try {
      const setting = await appPrisma.settings.findFirst({
        where: {
          key: "candidate_data_retention_years",
          userId: null,
        },
      });

      let yearsThreshold = null;
      if (setting) {
        const years = parseInt(setting.value);
        if (!isNaN(years) && years >= 3) {
          yearsThreshold = years;
        }
      }

      const enabled = yearsThreshold !== null && yearsThreshold >= 3;

      return {
        enabled,
        yearsThreshold,
        time: "02:00", // 2 AM
        isRunning: this.isRunning,
        hasActiveTask: this.currentTask !== null,
        minimumYears: 3,
      };
    } catch (error) {
      console.error("❌ Error getting data retention schedule info:", error);
      return null;
    }
  }
}

// Create singleton instance
const dataRetentionScheduler = new DataRetentionScheduler();

export { dataRetentionScheduler };