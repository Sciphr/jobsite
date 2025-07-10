// app/lib/weeklyDigest.js - Updated to include customization settings
import { appPrisma } from "./prisma";
import { emailService } from "./email";
import { getSystemSetting } from "./settings";

export class WeeklyDigestService {
  constructor() {
    this.weekStart = null;
    this.weekEnd = null;
    this.previousWeekStart = null;
    this.previousWeekEnd = null;
  }

  /**
   * Calculate date ranges for current and previous week
   */
  calculateDateRanges() {
    const now = new Date();

    // Current week (Monday to Sunday)
    const currentMonday = new Date(now);
    currentMonday.setDate(now.getDate() - now.getDay() + 1); // Get Monday
    currentMonday.setHours(0, 0, 0, 0);

    const currentSunday = new Date(currentMonday);
    currentSunday.setDate(currentMonday.getDate() + 6);
    currentSunday.setHours(23, 59, 59, 999);

    // Previous week for comparison
    const previousMonday = new Date(currentMonday);
    previousMonday.setDate(currentMonday.getDate() - 7);

    const previousSunday = new Date(previousMonday);
    previousSunday.setDate(previousMonday.getDate() + 6);
    previousSunday.setHours(23, 59, 59, 999);

    // For actual digest, we want LAST week's data (completed week)
    this.weekStart = previousMonday;
    this.weekEnd = previousSunday;

    // And the week before that for comparison
    this.previousWeekStart = new Date(previousMonday);
    this.previousWeekStart.setDate(previousMonday.getDate() - 7);

    this.previousWeekEnd = new Date(previousSunday);
    this.previousWeekEnd.setDate(previousSunday.getDate() - 7);

    console.log("📅 Digest Date Ranges:", {
      weekStart: this.weekStart.toISOString(),
      weekEnd: this.weekEnd.toISOString(),
      previousWeekStart: this.previousWeekStart.toISOString(),
      previousWeekEnd: this.previousWeekEnd.toISOString(),
    });
  }

  /**
   * Get digest configuration from settings
   */
  async getDigestConfiguration() {
    try {
      // Get all digest-related settings
      const digestSettings = await appPrisma.setting.findMany({
        where: {
          key: {
            in: [
              "weekly_digest_enabled",
              "weekly_digest_recipients",
              "weekly_digest_sections",
              "weekly_digest_customizations",
            ],
          },
          userId: null,
        },
      });

      const config = {
        enabled: true,
        recipients: [],
        sections: {
          jobMetrics: true,
          userMetrics: true,
          applicationData: true,
          systemHealth: true,
        },
        sectionCustomizations: {
          jobMetrics: {
            newJobs: true,
            jobViews: true,
            topJobs: true,
            lowJobs: true,
            jobsByDepartment: true,
            featuredJobs: false,
          },
          userMetrics: {
            newUsers: true,
            activeUsers: false,
            userGrowth: true,
            usersByRole: false,
            registrationTrends: true,
          },
          applicationData: {
            totalApps: true,
            applied: true,
            reviewing: true,
            interview: true,
            hired: true,
            rejected: false,
            appTrends: true,
            dailyBreakdown: true,
            conversionRates: false,
            avgTimeToHire: true,
          },
          systemHealth: {
            systemStatus: true,
            performance: false,
            alerts: true,
            uptime: false,
            errorRates: false,
            responseTime: false,
          },
        },
      };

      // Parse settings
      digestSettings.forEach((setting) => {
        try {
          switch (setting.key) {
            case "weekly_digest_enabled":
              config.enabled = setting.value === "true";
              break;
            case "weekly_digest_recipients":
              const recipients = JSON.parse(setting.value || "[]");
              config.recipients = Array.isArray(recipients) ? recipients : [];
              break;
            case "weekly_digest_sections":
              const sections = JSON.parse(setting.value || "{}");
              config.sections = { ...config.sections, ...sections };
              break;
            case "weekly_digest_customizations":
              const customizations = JSON.parse(setting.value || "{}");
              config.sectionCustomizations = {
                ...config.sectionCustomizations,
                ...customizations,
              };
              break;
          }
        } catch (parseError) {
          console.warn(`Failed to parse setting ${setting.key}:`, parseError);
        }
      });

      return config;
    } catch (error) {
      console.error("Error loading digest configuration:", error);
      // Return default config on error
      return {
        enabled: true,
        recipients: [],
        sections: {
          jobMetrics: true,
          userMetrics: true,
          applicationData: true,
          systemHealth: true,
        },
        sectionCustomizations: {},
      };
    }
  }

  /**
   * Collect all data needed for the digest
   */
  async collectWeeklyData(config) {
    console.log("📊 Collecting weekly digest data...");

    try {
      const dataPromises = [];

      // Only collect data for enabled sections
      if (config.sections.jobMetrics) {
        dataPromises.push(
          this.getJobStats(config.sectionCustomizations.jobMetrics)
        );
      }
      if (config.sections.applicationData) {
        dataPromises.push(
          this.getApplicationStats(config.sectionCustomizations.applicationData)
        );
      }
      if (config.sections.userMetrics) {
        dataPromises.push(
          this.getUserStats(config.sectionCustomizations.userMetrics)
        );
      }

      // Insights data (conditional based on customizations)
      const insightPromises = [];
      if (
        config.sections.jobMetrics &&
        config.sectionCustomizations.jobMetrics?.topJobs
      ) {
        insightPromises.push(this.getTopPerformingJobs());
      }
      if (
        config.sections.jobMetrics &&
        config.sectionCustomizations.jobMetrics?.lowJobs
      ) {
        insightPromises.push(this.getLowPerformingJobs());
      }
      if (
        config.sections.jobMetrics &&
        config.sectionCustomizations.jobMetrics?.jobsByDepartment
      ) {
        insightPromises.push(this.getDepartmentStats());
      }
      if (
        config.sections.applicationData &&
        config.sectionCustomizations.applicationData?.dailyBreakdown
      ) {
        insightPromises.push(this.getDailyApplicationBreakdown());
      }
      if (config.sections.systemHealth) {
        insightPromises.push(this.getSystemHealthMetrics());
      }

      const [basicData, insightData] = await Promise.all([
        Promise.all(dataPromises),
        Promise.all(insightPromises),
      ]);

      // Map results back to proper structure
      let jobStats = null,
        applicationStats = null,
        userStats = null;
      let dataIndex = 0;

      if (config.sections.jobMetrics) jobStats = basicData[dataIndex++];
      if (config.sections.applicationData)
        applicationStats = basicData[dataIndex++];
      if (config.sections.userMetrics) userStats = basicData[dataIndex++];

      // Map insight data
      let insightIndex = 0;
      const insights = {};

      if (
        config.sections.jobMetrics &&
        config.sectionCustomizations.jobMetrics?.topJobs
      ) {
        insights.topJobs = insightData[insightIndex++] || [];
      }
      if (
        config.sections.jobMetrics &&
        config.sectionCustomizations.jobMetrics?.lowJobs
      ) {
        insights.lowPerformingJobs = insightData[insightIndex++] || [];
      }
      if (
        config.sections.jobMetrics &&
        config.sectionCustomizations.jobMetrics?.jobsByDepartment
      ) {
        insights.departmentStats = insightData[insightIndex++] || [];
      }
      if (
        config.sections.applicationData &&
        config.sectionCustomizations.applicationData?.dailyBreakdown
      ) {
        insights.dailyApplications = insightData[insightIndex++] || [];
      }

      const systemHealth = config.sections.systemHealth
        ? insightData[insightIndex++]
        : null;

      const digestData = {
        dateRange: {
          start: this.weekStart,
          end: this.weekEnd,
          formatted: `${this.weekStart.toLocaleDateString()} - ${this.weekEnd.toLocaleDateString()}`,
        },
        summary: {
          jobs: jobStats,
          applications: applicationStats,
          users: userStats,
        },
        insights,
        systemHealth,
        configuration: config, // Include the config so template knows what to show
        generatedAt: new Date(),
      };

      console.log("✅ Data collection complete");
      return digestData;
    } catch (error) {
      console.error("❌ Error collecting weekly data:", error);
      throw error;
    }
  }

  // ... (keep all your existing methods: getJobStats, getApplicationStats, etc.)
  // They remain the same - just add the config parameter where needed

  /**
   * Get job statistics for current and previous week
   */
  async getJobStats(customizations = {}) {
    const thisWeekJobs = await appPrisma.job.findMany({
      where: {
        createdAt: {
          gte: this.weekStart,
          lte: this.weekEnd,
        },
      },
      select: {
        id: true,
        status: true,
        featured: true,
        department: true,
        applicationCount: true,
        viewCount: true,
      },
    });

    const previousWeekJobs = await appPrisma.job.findMany({
      where: {
        createdAt: {
          gte: this.previousWeekStart,
          lte: this.previousWeekEnd,
        },
      },
      select: { id: true, status: true, featured: true },
    });

    const thisWeekStats = {
      total: thisWeekJobs.length,
      active: thisWeekJobs.filter((j) => j.status === "Active").length,
      featured: thisWeekJobs.filter((j) => j.featured).length,
      totalApplications: thisWeekJobs.reduce(
        (sum, j) => sum + j.applicationCount,
        0
      ),
      totalViews: customizations.jobViews
        ? thisWeekJobs.reduce((sum, j) => sum + j.viewCount, 0)
        : 0,
    };

    const previousWeekStats = {
      total: previousWeekJobs.length,
      active: previousWeekJobs.filter((j) => j.status === "Active").length,
      featured: previousWeekJobs.filter((j) => j.featured).length,
    };

    return {
      thisWeek: thisWeekStats,
      previousWeek: previousWeekStats,
      change: {
        total: thisWeekStats.total - previousWeekStats.total,
        totalPercent: this.calculatePercentChange(
          previousWeekStats.total,
          thisWeekStats.total
        ),
      },
      customizations,
    };
  }

  // ... (keep all other existing methods the same)

  /**
   * Generate and send the weekly digest
   */
  async generateAndSend() {
    try {
      console.log("🚀 Starting weekly digest generation...");

      // Get digest configuration
      const config = await this.getDigestConfiguration();

      if (!config.enabled) {
        console.log("📧 Weekly digest is disabled in settings");
        return { success: true, message: "Weekly digest disabled" };
      }

      if (!Array.isArray(config.recipients) || config.recipients.length === 0) {
        console.log("📧 No recipients configured for weekly digest");
        return { success: true, message: "No recipients configured" };
      }

      this.calculateDateRanges();
      const digestData = await this.collectWeeklyData(config);

      // Get the specific users who should receive the digest
      const recipients = await appPrisma.user.findMany({
        where: {
          id: { in: config.recipients },
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      if (recipients.length === 0) {
        console.log("⚠️ No active recipients found for weekly digest");
        return { success: false, message: "No active recipients found" };
      }

      console.log(
        `📧 Sending digest to ${recipients.length} configured recipient(s)`
      );

      const emailResults = [];

      // Send digest to each configured recipient
      for (const recipient of recipients) {
        try {
          const result = await this.sendDigestEmail(recipient, digestData);
          emailResults.push({
            userId: recipient.id,
            email: recipient.email,
            success: result.success,
            error: result.error,
          });
        } catch (error) {
          console.error(
            `❌ Failed to send digest to ${recipient.email}:`,
            error
          );
          emailResults.push({
            userId: recipient.id,
            email: recipient.email,
            success: false,
            error: error.message,
          });
        }
      }

      const successCount = emailResults.filter((r) => r.success).length;
      const failureCount = emailResults.filter((r) => !r.success).length;

      console.log(
        `✅ Weekly digest complete: ${successCount} sent, ${failureCount} failed`
      );

      return {
        success: true,
        sent: successCount,
        failed: failureCount,
        configuredRecipients: config.recipients.length,
        activeRecipients: recipients.length,
        results: emailResults,
      };
    } catch (error) {
      console.error("❌ Weekly digest generation failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send digest email to a specific admin
   */
  async sendDigestEmail(admin, digestData) {
    const siteName = await getSystemSetting("site_name", "Job Board");
    const subject = `Weekly Digest: ${digestData.dateRange.formatted} - ${siteName}`;

    // Generate the HTML email (we'll create this template next)
    const html = await this.generateEmailHTML(admin, digestData);

    return await emailService.sendEmail({
      to: admin.email,
      subject,
      html,
    });
  }

  /**
   * Generate HTML email content
   */
  async generateEmailHTML(admin, digestData) {
    const { generateWeeklyDigestHTML } = await import("./weeklyDigestTemplate");
    return await generateWeeklyDigestHTML(admin, digestData);
  }

  // Keep all other existing methods...
  calculatePercentChange(oldValue, newValue) {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return Math.round(((newValue - oldValue) / oldValue) * 100);
  }

  // ... other methods remain the same
}

// Export singleton instance
export const weeklyDigestService = new WeeklyDigestService();
