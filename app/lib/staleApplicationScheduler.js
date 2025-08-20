// app/lib/staleApplicationScheduler.js
import cron from "node-cron";
import { appPrisma } from "./prisma";
import { logAuditEvent } from "../../lib/auditMiddleware";

class StaleApplicationScheduler {
  constructor() {
    this.currentTask = null;
    this.isRunning = false;
    this.staleApplications = new Map(); // Cache for stale applications
    console.log("⏰ Stale Application Scheduler initialized");
  }

  async start() {
    if (this.isRunning) {
      console.log("⏰ Stale Application Scheduler already running");
      return;
    }

    this.isRunning = true;
    console.log("⏰ Starting Stale Application Scheduler...");

    // Initial schedule setup
    await this.updateSchedule();

    // Check for schedule updates every hour
    cron.schedule("0 * * * *", async () => {
      console.log("🔄 Checking for stale application schedule updates...");
      await this.updateSchedule();
    });

    console.log("✅ Stale Application Scheduler started successfully");
  }

  async updateSchedule() {
    try {
      // Get stale application alert setting from database
      const setting = await appPrisma.settings.findFirst({
        where: {
          key: "alert_stale_applications_days",
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

      // Check if we have the required setting
      if (!daysThreshold) {
        console.log(
          "⏰ Stale application days setting not configured or invalid, skipping schedule"
        );
        this.stopCurrentTask();
        return;
      }

      // Create cron expression for every 4 hours: "0 */4 * * *"
      const cronExpression = "0 */4 * * *";

      console.log(
        `⏰ Setting up stale application detection schedule: Every 4 hours for applications older than ${daysThreshold} days (cron: ${cronExpression})`
      );

      // Stop current task if exists
      this.stopCurrentTask();

      // Create new scheduled task
      this.currentTask = cron.schedule(
        cronExpression,
        async () => {
          console.log("⏰ Executing scheduled stale application detection...");
          await this.detectStaleApplications();
        },
        {
          scheduled: true,
          timezone: "America/New_York", // Adjust timezone as needed
        }
      );

      // Run initial detection
      await this.detectStaleApplications();

      console.log("✅ Stale application schedule updated successfully");
    } catch (error) {
      console.error("❌ Error updating stale application schedule:", error);
    }
  }

  stopCurrentTask() {
    if (this.currentTask) {
      this.currentTask.stop();
      this.currentTask.destroy();
      this.currentTask = null;
      console.log("🛑 Stopped current stale application schedule");
    }
  }

  async detectStaleApplications() {
    try {
      console.log("🚀 Starting stale application detection...");

      // Get the stale application setting
      const staleSetting = await appPrisma.settings.findFirst({
        where: { key: "alert_stale_applications_days", userId: null },
      });

      if (!staleSetting || !staleSetting.value) {
        console.log("❌ Stale application setting not configured");
        return [];
      }

      const daysThreshold = parseInt(staleSetting.value);
      if (isNaN(daysThreshold) || daysThreshold <= 0) {
        console.log("❌ Invalid stale application days setting");
        return [];
      }

      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);

      // Find applications that haven't moved stages in X days
      const staleApplications = await appPrisma.applications.findMany({
        where: {
          is_archived: false, // Only active applications
          current_stage_entered_at: { 
            lt: cutoffDate,
            not: null // Ensure we have a valid date
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          current_stage_entered_at: true,
          jobs: { 
            select: { 
              id: true,
              title: true 
            } 
          },
        },
      });

      // Update cache
      const newStaleMap = new Map();
      staleApplications.forEach(app => {
        const daysSinceStageChange = Math.floor(
          (new Date() - new Date(app.current_stage_entered_at)) / (1000 * 60 * 60 * 24)
        );
        newStaleMap.set(app.id, {
          ...app,
          daysSinceStageChange,
          isStale: daysSinceStageChange >= daysThreshold
        });
      });

      this.staleApplications = newStaleMap;

      console.log(
        `⏰ Found ${staleApplications.length} stale applications (older than ${daysThreshold} days)`
      );

      // Log audit event
      await logAuditEvent({
        eventType: "SYSTEM_ACTION",
        category: "SYSTEM",
        subcategory: "STALE_DETECTION",
        actorId: null,
        actorName: "Stale Application Scheduler",
        actorType: "system",
        action: "Stale application detection completed",
        description: `Detected ${staleApplications.length} stale applications older than ${daysThreshold} days`,
        severity: "info",
        status: "success",
        metadata: {
          staleCount: staleApplications.length,
          daysThreshold,
          executionTime: new Date().toISOString()
        }
      });

      return staleApplications;
    } catch (error) {
      console.error("❌ Error detecting stale applications:", error);

      // Log the error
      await logAuditEvent({
        eventType: "ERROR",
        category: "SYSTEM",
        subcategory: "STALE_DETECTION",
        actorId: null,
        actorName: "Stale Application Scheduler",
        actorType: "system",
        action: "Stale detection execution failed",
        description: `Failed to detect stale applications: ${error.message}`,
        severity: "error",
        status: "failure",
        metadata: {
          error: error.message,
          executionTime: new Date().toISOString()
        }
      });

      return [];
    }
  }

  // Get current stale applications count
  getStaleApplicationsCount() {
    return this.staleApplications.size;
  }

  // Get all stale applications
  getStaleApplications() {
    return Array.from(this.staleApplications.values());
  }

  // Check if a specific application is stale
  isApplicationStale(applicationId) {
    return this.staleApplications.has(applicationId);
  }

  // Get stale info for a specific application
  getApplicationStaleInfo(applicationId) {
    return this.staleApplications.get(applicationId) || null;
  }

  stop() {
    this.stopCurrentTask();
    this.isRunning = false;
    this.staleApplications.clear();
    console.log("🛑 Stale Application Scheduler stopped");
  }

  // Method to manually trigger detection (for testing)
  async triggerNow() {
    console.log("🔧 Manually triggering stale application detection...");
    return await this.detectStaleApplications();
  }

  // Get current schedule info
  async getScheduleInfo() {
    try {
      const setting = await appPrisma.settings.findFirst({
        where: {
          key: "alert_stale_applications_days",
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
        interval: "Every 4 hours",
        isRunning: this.isRunning,
        hasActiveTask: this.currentTask !== null,
        staleCount: this.getStaleApplicationsCount()
      };
    } catch (error) {
      console.error("❌ Error getting stale application schedule info:", error);
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

let staleApplicationScheduler;

if (!isBuildTime()) {
  staleApplicationScheduler = new StaleApplicationScheduler();
} else {
  console.log("⏰ Skipping StaleApplicationScheduler creation during build");
  staleApplicationScheduler = {
    start: () => Promise.resolve(),
    stop: () => {},
    getScheduleInfo: () => Promise.resolve(null),
    getStaleApplications: () => [],
    getStaleApplicationsCount: () => 0,
    isApplicationStale: () => false,
    getApplicationStaleInfo: () => null
  };
}

export { staleApplicationScheduler };