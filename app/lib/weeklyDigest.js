// app/lib/weeklyDigest.js
import { appPrisma } from "./prisma";
import { emailService } from "./email";
import { getSystemSetting } from "./settings";

/**
 * Weekly Digest Service
 * Generates and sends weekly digest emails to administrators
 */
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
   * Collect all data needed for the digest
   */
  async collectWeeklyData() {
    console.log("📊 Collecting weekly digest data...");

    try {
      const [
        jobStats,
        applicationStats,
        userStats,
        topJobs,
        lowPerformingJobs,
        departmentStats,
        dailyApplications,
        systemHealth,
      ] = await Promise.all([
        this.getJobStats(),
        this.getApplicationStats(),
        this.getUserStats(),
        this.getTopPerformingJobs(),
        this.getLowPerformingJobs(),
        this.getDepartmentStats(),
        this.getDailyApplicationBreakdown(),
        this.getSystemHealthMetrics(),
      ]);

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
        insights: {
          topJobs,
          lowPerformingJobs,
          departmentStats,
          dailyApplications,
        },
        systemHealth,
        generatedAt: new Date(),
      };

      console.log("✅ Data collection complete:", {
        jobsThisWeek: jobStats.thisWeek.total,
        applicationsThisWeek: applicationStats.thisWeek.total,
        newUsers: userStats.thisWeek.total,
      });

      return digestData;
    } catch (error) {
      console.error("❌ Error collecting weekly data:", error);
      throw error;
    }
  }

  /**
   * Get job statistics for current and previous week
   */
  async getJobStats() {
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
    };
  }

  /**
   * Get application statistics
   */
  async getApplicationStats() {
    const thisWeekApplications = await appPrisma.application.findMany({
      where: {
        appliedAt: {
          gte: this.weekStart,
          lte: this.weekEnd,
        },
      },
      select: {
        id: true,
        status: true,
        appliedAt: true,
        updatedAt: true,
      },
    });

    const previousWeekApplications = await appPrisma.application.findMany({
      where: {
        appliedAt: {
          gte: this.previousWeekStart,
          lte: this.previousWeekEnd,
        },
      },
      select: { id: true, status: true },
    });

    const thisWeekStats = {
      total: thisWeekApplications.length,
      applied: thisWeekApplications.filter((a) => a.status === "Applied")
        .length,
      reviewing: thisWeekApplications.filter((a) => a.status === "Reviewing")
        .length,
      interview: thisWeekApplications.filter((a) => a.status === "Interview")
        .length,
      hired: thisWeekApplications.filter((a) => a.status === "Hired").length,
      rejected: thisWeekApplications.filter((a) => a.status === "Rejected")
        .length,
    };

    const previousWeekStats = {
      total: previousWeekApplications.length,
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
    };
  }

  /**
   * Get user registration statistics
   */
  async getUserStats() {
    const thisWeekUsers = await appPrisma.user.count({
      where: {
        createdAt: {
          gte: this.weekStart,
          lte: this.weekEnd,
        },
      },
    });

    const previousWeekUsers = await appPrisma.user.count({
      where: {
        createdAt: {
          gte: this.previousWeekStart,
          lte: this.previousWeekEnd,
        },
      },
    });

    return {
      thisWeek: { total: thisWeekUsers },
      previousWeek: { total: previousWeekUsers },
      change: {
        total: thisWeekUsers - previousWeekUsers,
        totalPercent: this.calculatePercentChange(
          previousWeekUsers,
          thisWeekUsers
        ),
      },
    };
  }

  /**
   * Get top performing jobs (most applications this week)
   */
  async getTopPerformingJobs() {
    const topJobs = await appPrisma.job.findMany({
      select: {
        id: true,
        title: true,
        department: true,
        viewCount: true,
        applicationCount: true,
        createdAt: true,
        applications: {
          where: {
            appliedAt: {
              gte: this.weekStart,
              lte: this.weekEnd,
            },
          },
          select: { id: true },
        },
      },
      orderBy: { applicationCount: "desc" },
      take: 10,
    });

    return topJobs
      .map((job) => ({
        title: job.title,
        department: job.department,
        weeklyApplications: job.applications.length,
        totalApplications: job.applicationCount,
        totalViews: job.viewCount,
        conversionRate:
          job.viewCount > 0
            ? ((job.applicationCount / job.viewCount) * 100).toFixed(1)
            : "0",
      }))
      .filter((job) => job.weeklyApplications > 0);
  }

  /**
   * Get jobs that need attention (low applications)
   */
  async getLowPerformingJobs() {
    const lowApplicationThreshold = await getSystemSetting(
      "low_application_threshold_count",
      2
    );
    const lowApplicationDays = await getSystemSetting(
      "low_application_threshold_days",
      7
    );

    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - lowApplicationDays);

    const lowJobs = await appPrisma.job.findMany({
      where: {
        status: "Active",
        createdAt: { lte: thresholdDate },
        applicationCount: { lt: lowApplicationThreshold },
      },
      select: {
        id: true,
        title: true,
        department: true,
        applicationCount: true,
        viewCount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return lowJobs.map((job) => ({
      title: job.title,
      department: job.department,
      applications: job.applicationCount,
      views: job.viewCount,
      daysLive: Math.floor(
        (Date.now() - job.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      ),
      conversionRate:
        job.viewCount > 0
          ? ((job.applicationCount / job.viewCount) * 100).toFixed(1)
          : "0",
    }));
  }

  /**
   * Get department statistics
   */
  async getDepartmentStats() {
    const departmentData = await appPrisma.application.groupBy({
      by: ["jobId"],
      where: {
        appliedAt: {
          gte: this.weekStart,
          lte: this.weekEnd,
        },
      },
      _count: { id: true },
    });

    // Get job details for department grouping
    const jobIds = departmentData.map((d) => d.jobId);
    const jobs = await appPrisma.job.findMany({
      where: { id: { in: jobIds } },
      select: { id: true, department: true },
    });

    const jobDeptMap = jobs.reduce((map, job) => {
      map[job.id] = job.department;
      return map;
    }, {});

    const deptStats = {};
    departmentData.forEach((item) => {
      const dept = jobDeptMap[item.jobId] || "Unknown";
      deptStats[dept] = (deptStats[dept] || 0) + item._count.id;
    });

    return Object.entries(deptStats)
      .map(([department, applications]) => ({ department, applications }))
      .sort((a, b) => b.applications - a.applications);
  }

  /**
   * Get daily application breakdown for the week
   */
  async getDailyApplicationBreakdown() {
    const dailyData = [];
    const currentDate = new Date(this.weekStart);

    while (currentDate <= this.weekEnd) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const count = await appPrisma.application.count({
        where: {
          appliedAt: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
      });

      dailyData.push({
        date: dayStart.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        applications: count,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dailyData;
  }

  /**
   * Get system health metrics
   */
  async getSystemHealthMetrics() {
    const [activeJobs, totalUsers, totalApplications] = await Promise.all([
      appPrisma.job.count({ where: { status: "Active" } }),
      appPrisma.user.count(),
      appPrisma.application.count(),
    ]);

    return {
      activeJobs,
      totalUsers,
      totalApplications,
      systemStatus: "healthy", // Could add more sophisticated health checks
    };
  }

  /**
   * Calculate percentage change between two values
   */
  calculatePercentChange(oldValue, newValue) {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return Math.round(((newValue - oldValue) / oldValue) * 100);
  }

  /**
   * Generate and send the weekly digest
   */
  async generateAndSend() {
    try {
      console.log("🚀 Starting weekly digest generation...");

      // Check if weekly digest is enabled
      const digestEnabled = await getSystemSetting(
        "weekly_digest_enabled",
        true
      );
      if (!digestEnabled) {
        console.log("📧 Weekly digest is disabled in settings");
        return { success: true, message: "Weekly digest disabled" };
      }

      // Get recipient settings
      const recipientIds = await getSystemSetting(
        "weekly_digest_recipients",
        []
      );
      if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
        console.log("📧 No recipients configured for weekly digest");
        return { success: true, message: "No recipients configured" };
      }

      this.calculateDateRanges();
      const digestData = await this.collectWeeklyData();

      // Get the specific users who should receive the digest
      const recipients = await appPrisma.user.findMany({
        where: {
          id: { in: recipientIds },
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
        configuredRecipients: recipientIds.length,
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
}

// Export singleton instance
export const weeklyDigestService = new WeeklyDigestService();

// Convenience function
export const generateWeeklyDigest = () => weeklyDigestService.generateAndSend();
