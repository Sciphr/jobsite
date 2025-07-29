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
              "weekly_digest_theme",
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
            emailPerformance: false,
            errorSummary: true,
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
            case "weekly_digest_theme":
              config.emailTheme = setting.value || "professional";
              console.log("📧 Loaded email theme:", setting.value); // Add this debug line
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
   * Get application statistics for current and previous week
   */
  async getApplicationStats(customizations = {}) {
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
      customizations,
    };
  }

  /**
   * Get user registration statistics
   */
  async getUserStats(customizations = {}) {
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

    // Get active users if customization is enabled
    let activeUsers = 0;
    if (customizations.activeUsers) {
      // Users who logged in or performed actions this week
      activeUsers = await appPrisma.user.count({
        where: {
          OR: [
            {
              lastLoginAt: {
                gte: this.weekStart,
                lte: this.weekEnd,
              },
            },
            {
              applications: {
                some: {
                  appliedAt: {
                    gte: this.weekStart,
                    lte: this.weekEnd,
                  },
                },
              },
            },
            {
              savedJobs: {
                some: {
                  savedAt: {
                    gte: this.weekStart,
                    lte: this.weekEnd,
                  },
                },
              },
            },
          ],
        },
      });
    }

    return {
      thisWeek: { 
        total: thisWeekUsers,
        active: activeUsers,
      },
      previousWeek: { total: previousWeekUsers },
      change: {
        total: thisWeekUsers - previousWeekUsers,
        totalPercent: this.calculatePercentChange(
          previousWeekUsers,
          thisWeekUsers
        ),
      },
      customizations,
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
   * Get users by role breakdown
   */
  async getUsersByRole() {
    const usersByRole = await appPrisma.user.groupBy({
      by: ['role'],
      where: {
        createdAt: {
          gte: this.weekStart,
          lte: this.weekEnd,
        },
      },
      _count: {
        id: true,
      },
    });

    return usersByRole.map(role => ({
      role: role.role,
      count: role._count.id,
    }));
  }

  /**
   * Get daily user registration breakdown for the week
   */
  async getDailyUserRegistrations() {
    const dailyData = [];
    const currentDate = new Date(this.weekStart);

    while (currentDate <= this.weekEnd) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const count = await appPrisma.user.count({
        where: {
          createdAt: {
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
        registrations: count,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dailyData;
  }

  /**
   * Get user growth chart data (last 4 weeks)
   */
  async getUserGrowthData() {
    const growthData = [];
    const weeksBack = 4;
    
    for (let i = weeksBack - 1; i >= 0; i--) {
      const weekStart = new Date(this.weekStart);
      weekStart.setDate(weekStart.getDate() - (i * 7));
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const count = await appPrisma.user.count({
        where: {
          createdAt: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
      });

      growthData.push({
        week: weekStart.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        registrations: count,
      });
    }

    return growthData;
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
  async getSystemHealthMetrics(customizations = {}) {
    const [activeJobs, totalUsers, totalApplications] = await Promise.all([
      appPrisma.job.count({ where: { status: "Active" } }),
      appPrisma.user.count(),
      appPrisma.application.count(),
    ]);

    // Email performance metrics (this week)
    let emailPerformance = null;
    if (customizations.emailPerformance || customizations.systemStatus) {
      const [totalEmails, successfulEmails, failedEmails] = await Promise.all([
        appPrisma.email.count({
          where: {
            sent_at: {
              gte: this.weekStart,
              lte: this.weekEnd,
            },
          },
        }),
        appPrisma.email.count({
          where: {
            sent_at: {
              gte: this.weekStart,
              lte: this.weekEnd,
            },
            status: 'sent',
          },
        }),
        appPrisma.email.count({
          where: {
            sent_at: {
              gte: this.weekStart,
              lte: this.weekEnd,
            },
            status: 'failed',
          },
        }),
      ]);

      emailPerformance = {
        total: totalEmails,
        successful: successfulEmails,
        failed: failedEmails,
        successRate: totalEmails > 0 ? ((successfulEmails / totalEmails) * 100).toFixed(1) : 100,
        failureRate: totalEmails > 0 ? ((failedEmails / totalEmails) * 100).toFixed(1) : 0,
      };
    }

    // Error summary from audit logs (this week)
    let errorSummary = null;
    if (customizations.errorSummary || customizations.systemStatus) {
      const [totalAuditEntries, errorEntries, warningEntries, criticalEntries] = await Promise.all([
        appPrisma.auditLog.count({
          where: {
            createdAt: {
              gte: this.weekStart,
              lte: this.weekEnd,
            },
          },
        }),
        appPrisma.auditLog.count({
          where: {
            createdAt: {
              gte: this.weekStart,
              lte: this.weekEnd,
            },
            severity: 'error',
          },
        }),
        appPrisma.auditLog.count({
          where: {
            createdAt: {
              gte: this.weekStart,
              lte: this.weekEnd,
            },
            severity: 'warning',
          },
        }),
        appPrisma.auditLog.count({
          where: {
            createdAt: {
              gte: this.weekStart,
              lte: this.weekEnd,
            },
            severity: 'critical',
          },
        }),
      ]);

      // Get recent errors for details
      const recentErrors = customizations.errorSummary ? await appPrisma.auditLog.findMany({
        where: {
          createdAt: {
            gte: this.weekStart,
            lte: this.weekEnd,
          },
          severity: {
            in: ['error', 'critical'],
          },
        },
        select: {
          severity: true,
          action: true,
          description: true,
          createdAt: true,
          category: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      }) : [];

      errorSummary = {
        totalEntries: totalAuditEntries,
        errors: errorEntries,
        warnings: warningEntries,
        critical: criticalEntries,
        errorRate: totalAuditEntries > 0 ? ((errorEntries / totalAuditEntries) * 100).toFixed(1) : 0,
        recentErrors: recentErrors.map(error => ({
          severity: error.severity,
          action: error.action,
          description: error.description || 'No description',
          date: error.createdAt.toLocaleDateString(),
          category: error.category,
        })),
      };
    }

    // Determine overall system status based on metrics
    let systemStatus = 'healthy';
    let statusReason = 'All systems operating normally';

    if (emailPerformance || errorSummary) {
      const emailFailureRate = emailPerformance ? parseFloat(emailPerformance.failureRate) : 0;
      const errorRate = errorSummary ? parseFloat(errorSummary.errorRate) : 0;
      const hasCriticalErrors = errorSummary ? errorSummary.critical > 0 : false;

      if (hasCriticalErrors) {
        systemStatus = 'critical';
        statusReason = `${errorSummary.critical} critical error${errorSummary.critical > 1 ? 's' : ''} detected`;
      } else if (emailFailureRate > 10 || errorRate > 5) {
        systemStatus = 'degraded';
        statusReason = emailFailureRate > 10 
          ? `High email failure rate: ${emailFailureRate}%`
          : `Elevated error rate: ${errorRate}%`;
      } else if (emailFailureRate > 5 || errorRate > 2) {
        systemStatus = 'warning';
        statusReason = 'Some issues detected, but system is stable';
      }
    }

    return {
      activeJobs,
      totalUsers,
      totalApplications,
      systemStatus,
      statusReason,
      emailPerformance,
      errorSummary,
      customizations,
    };
  }

  /**
   * Collect all data needed for the digest
   */
  async collectWeeklyData(config) {
    console.log("📊 Collecting weekly digest data...");

    if (!config || !config.sections) {
      console.warn("⚠️ No config provided, using defaults");
      config = {
        sections: {
          jobMetrics: true,
          userMetrics: true,
          applicationData: true,
          systemHealth: true,
        },
        sectionCustomizations: {},
      };
    }

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
      if (
        config.sections.userMetrics &&
        config.sectionCustomizations.userMetrics?.usersByRole
      ) {
        insightPromises.push(this.getUsersByRole());
      }
      if (
        config.sections.userMetrics &&
        config.sectionCustomizations.userMetrics?.registrationTrends
      ) {
        insightPromises.push(this.getDailyUserRegistrations());
      }
      if (
        config.sections.userMetrics &&
        config.sectionCustomizations.userMetrics?.userGrowth
      ) {
        insightPromises.push(this.getUserGrowthData());
      }
      if (config.sections.systemHealth) {
        insightPromises.push(this.getSystemHealthMetrics(config.sectionCustomizations.systemHealth));
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
      if (
        config.sections.userMetrics &&
        config.sectionCustomizations.userMetrics?.usersByRole
      ) {
        insights.usersByRole = insightData[insightIndex++] || [];
      }
      if (
        config.sections.userMetrics &&
        config.sectionCustomizations.userMetrics?.registrationTrends
      ) {
        insights.dailyRegistrations = insightData[insightIndex++] || [];
      }
      if (
        config.sections.userMetrics &&
        config.sectionCustomizations.userMetrics?.userGrowth
      ) {
        insights.userGrowthData = insightData[insightIndex++] || [];
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
   * @param {Array} customRecipients - Optional array of user IDs to override config recipients
   */
  async generateAndSend(customRecipients = null) {
    try {
      console.log("🚀 Starting weekly digest generation...");

      // Get digest configuration
      const config = await this.getDigestConfiguration();

      if (!config.enabled) {
        console.log("📧 Weekly digest is disabled in settings");
        return { success: true, message: "Weekly digest disabled" };
      }

      // Use custom recipients if provided, otherwise use config recipients
      const recipientIds = customRecipients || config.recipients;

      if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
        console.log("📧 No recipients configured for weekly digest");
        return { success: true, message: "No recipients configured" };
      }

      this.calculateDateRanges();
      const digestData = await this.collectWeeklyData(config);

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

      const recipientType = customRecipients ? "test" : "scheduled";
      console.log(
        `📧 Sending ${recipientType} digest to ${recipients.length} recipient(s)`
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
        `✅ ${recipientType === "test" ? "Test" : "Weekly"} digest complete: ${successCount} sent, ${failureCount} failed`
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

  // Keep all other existing methods...
  calculatePercentChange(oldValue, newValue) {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return Math.round(((newValue - oldValue) / oldValue) * 100);
  }

  // ... other methods remain the same
}

// Export singleton instance
export const weeklyDigestService = new WeeklyDigestService();
