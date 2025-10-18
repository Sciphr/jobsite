import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";
import { protectRoute } from "../../../lib/middleware/apiProtection";

export async function GET(req) {
  // Check if user has permission to view analytics
  const authResult = await protectRoute("analytics", "view");
  if (authResult.error) return authResult.error;

  const { session } = authResult;

  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "30d";
    const department = searchParams.get("department"); // New: department filter

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    switch (range) {
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(now.getDate() - 90);
        break;
      case "1y":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Calculate previous period for comparison
    const periodLength = now.getTime() - startDate.getTime();
    const previousPeriodStart = new Date(startDate.getTime() - periodLength);
    const previousPeriodEnd = new Date(startDate.getTime());

    // Build department filter
    const departmentFilter = department && department !== "all" ? { department } : {};

    // Get current period totals
    const [
      totalJobs,
      totalApplications,
      totalUsers,
      totalJobViews,
      previousJobs,
      previousApplications,
      previousUsers,
    ] = await Promise.all([
      // Current period
      appPrisma.jobs.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: now,
          },
          ...departmentFilter,
        },
      }),
      appPrisma.applications.count({
        where: {
          appliedAt: {
            gte: startDate,
            lte: now,
          },
          ...(department && department !== "all" ? { jobs: departmentFilter } : {}),
        },
      }),
      appPrisma.users.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: now,
          },
        },
      }),
      appPrisma.jobs.aggregate({
        _sum: {
          viewCount: true,
        },
        // Remove date filter - count all views regardless of job creation date
      }),
      // Previous period for comparison
      appPrisma.jobs.count({
        where: {
          createdAt: {
            gte: previousPeriodStart,
            lt: previousPeriodEnd,
          },
          ...departmentFilter,
        },
      }),
      appPrisma.applications.count({
        where: {
          appliedAt: {
            gte: previousPeriodStart,
            lt: previousPeriodEnd,
          },
          ...(department && department !== "all" ? { jobs: departmentFilter } : {}),
        },
      }),
      appPrisma.users.count({
        where: {
          createdAt: {
            gte: previousPeriodStart,
            lt: previousPeriodEnd,
          },
        },
      }),
    ]);

    // Calculate percentage changes
    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    // Get daily data for trends - using Prisma queries instead of raw SQL
    const applications = await appPrisma.applications.findMany({
      where: {
        appliedAt: {
          gte: startDate,
          lte: now,
        },
        ...(department && department !== "all" ? { jobs: departmentFilter } : {}),
      },
      select: {
        appliedAt: true,
      },
    });

    // Group applications by date
    const dailyApplications = applications.reduce((acc, app) => {
      const date = app.appliedAt.toISOString().split("T")[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const jobs = await appPrisma.jobs.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: now,
        },
        ...departmentFilter,
      },
      select: {
        createdAt: true,
      },
    });

    const users = await appPrisma.users.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
      select: {
        createdAt: true,
      },
    });

    // Group by date
    const dailyJobs = jobs.reduce((acc, job) => {
      const date = job.createdAt.toISOString().split("T")[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const dailyUsers = users.reduce((acc, user) => {
      const date = user.createdAt.toISOString().split("T")[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const dailyData = [];
    const currentDate = new Date(startDate);
    while (currentDate <= now) {
      const dateStr = currentDate.toISOString().split("T")[0];
      dailyData.push({
        date: dateStr,
        applications: dailyApplications[dateStr] || 0,
        jobs: dailyJobs[dateStr] || 0, // Real data now
        users: dailyUsers[dateStr] || 0, // Real data now
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get jobs by department
    const jobsByDepartment = await appPrisma.jobs.groupBy({
      by: ["department"],
      _count: {
        id: true,
      },
      where: {
        createdAt: {
          gte: startDate,
          lte: now,
        },
        ...departmentFilter,
      },
    });

    // Calculate real average time to hire
    const hiredApplications = await appPrisma.applications.findMany({
      where: {
        status: "Hired",
        appliedAt: {
          gte: startDate,
          lte: now,
        },
        ...(department && department !== "all" ? { jobs: departmentFilter } : {}),
      },
      select: {
        appliedAt: true,
        updatedAt: true,
      },
    });

    const avgTimeToHire =
      hiredApplications.length > 0
        ? Math.round(
            hiredApplications.reduce((acc, app) => {
              const days = Math.ceil(
                (app.updatedAt - app.appliedAt) / (1000 * 60 * 60 * 24)
              );
              return acc + days;
            }, 0) / hiredApplications.length
          )
        : 0; // Use 0 when no data

    // Get additional real metrics
    const [
      totalEmails,
      totalInterviews,
      activeJobs,
      expiredJobs,
      totalSavedJobs,
      featuredJobs,
      emailCampaigns,
      totalResumes,
      auditLogs,
    ] = await Promise.all([
      appPrisma.emails.count({
        where: {
          sent_at: {
            gte: startDate,
            lte: now,
          },
        },
      }),
      appPrisma.interviews.count({
        where: {
          created_at: {
            gte: startDate,
            lte: now,
          },
          ...(department && department !== "all" ? { application: { jobs: departmentFilter } } : {}),
        },
      }),
      appPrisma.jobs.count({
        where: {
          status: "Active",
          createdAt: {
            gte: startDate,
            lte: now,
          },
          ...departmentFilter,
        },
      }),
      appPrisma.jobs.count({
        where: {
          status: "Closed",
          createdAt: {
            gte: startDate,
            lte: now,
          },
          ...departmentFilter,
        },
      }),
      appPrisma.saved_jobs.count({
        where: {
          savedAt: {
            gte: startDate,
            lte: now,
          },
          ...(department && department !== "all" ? { jobs: departmentFilter } : {}),
        },
      }),
      appPrisma.jobs.count({
        where: {
          featured: true,
          createdAt: {
            gte: startDate,
            lte: now,
          },
          ...departmentFilter,
        },
      }),
      appPrisma.email_campaigns.count({
        where: {
          created_at: {
            gte: startDate,
            lte: now,
          },
        },
      }),
      appPrisma.user_resumes.count({
        where: {
          uploaded_at: {
            gte: startDate,
            lte: now,
          },
        },
      }),
      appPrisma.audit_logs.count({
        where: {
          created_at: {
            gte: startDate,
            lte: now,
          },
        },
      }),
    ]);

    // Get application status distribution
    const applicationStatus = await appPrisma.applications.groupBy({
      by: ["status"],
      _count: {
        id: true,
      },
      where: {
        appliedAt: {
          gte: startDate,
          lte: now,
        },
        ...(department && department !== "all" ? { jobs: departmentFilter } : {}),
      },
    });

    const topJobs = await appPrisma.jobs.findMany({
      select: {
        title: true,
        viewCount: true,
        applicationCount: true, // This field exists in your schema
      },
      where: {
        createdAt: {
          gte: startDate,
          lte: now,
        },
        ...departmentFilter,
      },
      orderBy: {
        applicationCount: "desc", // Use the actual field from your schema
      },
      take: 5,
    });

    // Calculate conversion rates for top jobs
    const topJobsWithConversion = topJobs.map((job) => ({
      title: job.title,
      applications: job.applicationCount, // Use the actual field
      views: job.viewCount || 0,
      conversionRate:
        job.viewCount > 0
          ? ((job.applicationCount / job.viewCount) * 100).toFixed(2)
          : "0.00",
    }));

    // Get conversion funnel data
    const totalViews = totalJobViews._sum.viewCount || 0;
    const startedApplications = Math.floor(totalApplications * 1.5); // Estimate based on completed apps
    const interviews = await appPrisma.applications.count({
      where: {
        status: "Interview",
        appliedAt: {
          gte: startDate,
          lte: now,
        },
        ...(department && department !== "all" ? { jobs: departmentFilter } : {}),
      },
    });
    const hired = await appPrisma.applications.count({
      where: {
        status: "Hired",
        appliedAt: {
          gte: startDate,
          lte: now,
        },
        ...(department && department !== "all" ? { jobs: departmentFilter } : {}),
      },
    });

    const conversionFunnel = [
      {
        stage: "Job Views",
        count: totalViews,
        percentage: 100.0,
      },
      {
        stage: "Started Application",
        count: startedApplications,
        percentage:
          totalViews > 0
            ? parseFloat(((startedApplications / totalViews) * 100).toFixed(2))
            : 0.0,
      },
      {
        stage: "Completed Application",
        count: totalApplications,
        percentage:
          startedApplications > 0
            ? parseFloat(
                ((totalApplications / startedApplications) * 100).toFixed(2)
              )
            : 0.0,
      },
      {
        stage: "Interview",
        count: interviews,
        percentage:
          totalApplications > 0
            ? parseFloat(((interviews / totalApplications) * 100).toFixed(2))
            : 0.0,
      },
      {
        stage: "Hired",
        count: hired,
        percentage:
          interviews > 0
            ? parseFloat(((hired / interviews) * 100).toFixed(2))
            : 0.0,
      },
    ];

    // Format response
    const analytics = {
      overview: {
        totalJobs,
        totalApplications,
        totalUsers,
        totalViews: totalViews,
        totalEmails,
        totalInterviews,
        activeJobs,
        expiredJobs,
        totalSavedJobs,
        featuredJobs,
        emailCampaigns,
        totalResumes,
        auditLogs,
        jobsChange: parseFloat(
          calculateChange(totalJobs, previousJobs).toFixed(2)
        ),
        applicationsChange: parseFloat(
          calculateChange(totalApplications, previousApplications).toFixed(2)
        ),
        usersChange: parseFloat(
          calculateChange(totalUsers, previousUsers).toFixed(2)
        ),
        viewsChange: 0.0, // Cannot calculate change - views are cumulative across all time
      },
      applicationsByDay: dailyData,
      jobsByDepartment: jobsByDepartment.map((dept) => ({
        name: dept.department,
        value: dept._count.id,
        color: getDepartmentColor(dept.department),
      })),
      applicationStatus: applicationStatus.map((status) => ({
        name: status.status,
        value: status._count.id,
        color: getStatusColor(status.status),
      })),
      topJobs: topJobsWithConversion,
      conversionFunnel,
      additionalMetrics: {
        avgTimeToHire,
        successRate:
          totalApplications > 0
            ? parseFloat(((hired / totalApplications) * 100).toFixed(2))
            : 0.0,
        avgApplicationsPerJob:
          totalJobs > 0
            ? parseFloat((totalApplications / totalJobs).toFixed(2))
            : 0.0,
        interviewRate:
          totalApplications > 0
            ? parseFloat(
                ((totalInterviews / totalApplications) * 100).toFixed(2)
              )
            : 0.0,
        saveRate:
          totalViews > 0
            ? parseFloat(((totalSavedJobs / totalViews) * 100).toFixed(2))
            : 0.0,
        emailsSent: totalEmails,
        resumesUploaded: totalResumes,
      },
    };

    return new Response(JSON.stringify(analytics), { status: 200 });
  } catch (error) {
    console.error("Analytics fetch error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}

// Helper functions for colors
function getDepartmentColor(department) {
  const colors = {
    Engineering: "#3B82F6",
    Marketing: "#10B981",
    Sales: "#F59E0B",
    Design: "#EF4444",
    Operations: "#8B5CF6",
    HR: "#06B6D4",
    Finance: "#84CC16",
    Legal: "#F97316",
  };
  return colors[department] || "#6B7280";
}

function getStatusColor(status) {
  const colors = {
    Applied: "#3B82F6",
    Reviewing: "#F59E0B",
    Interview: "#10B981",
    Hired: "#059669",
    Rejected: "#EF4444",
  };
  return colors[status] || "#6B7280";
}
