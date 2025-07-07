import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";

export async function GET(req) {
  const session = await getServerSession(authOptions);

  // Check if user is admin (privilege level 2 or higher for analytics)
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 2
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "30d";

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
      appPrisma.job.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: now,
          },
        },
      }),
      appPrisma.application.count({
        where: {
          appliedAt: {
            gte: startDate,
            lte: now,
          },
        },
      }),
      appPrisma.user.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: now,
          },
        },
      }),
      appPrisma.job.aggregate({
        _sum: {
          viewCount: true,
        },
        where: {
          createdAt: {
            gte: startDate,
            lte: now,
          },
        },
      }),
      // Previous period for comparison
      appPrisma.job.count({
        where: {
          createdAt: {
            gte: previousPeriodStart,
            lt: previousPeriodEnd,
          },
        },
      }),
      appPrisma.application.count({
        where: {
          appliedAt: {
            gte: previousPeriodStart,
            lt: previousPeriodEnd,
          },
        },
      }),
      appPrisma.user.count({
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
    const applications = await appPrisma.application.findMany({
      where: {
        appliedAt: {
          gte: startDate,
          lte: now,
        },
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

    // Convert to array format for charts
    const dailyData = [];
    const currentDate = new Date(startDate);
    while (currentDate <= now) {
      const dateStr = currentDate.toISOString().split("T")[0];
      dailyData.push({
        date: dateStr,
        applications: dailyApplications[dateStr] || 0,
        jobs: Math.floor(Math.random() * 3) + 1, // Mock data
        users: Math.floor(Math.random() * 20) + 10, // Mock data
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get jobs by department
    const jobsByDepartment = await appPrisma.job.groupBy({
      by: ["department"],
      _count: {
        id: true,
      },
      where: {
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
    });

    // Get application status distribution
    const applicationStatus = await appPrisma.application.groupBy({
      by: ["status"],
      _count: {
        id: true,
      },
      where: {
        appliedAt: {
          gte: startDate,
          lte: now,
        },
      },
    });

    // Get top performing jobs
    const topJobs = await appPrisma.job.findMany({
      select: {
        title: true,
        applicationCount: true,
        viewCount: true,
      },
      where: {
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
      orderBy: {
        applicationCount: "desc",
      },
      take: 5,
    });

    // Calculate conversion rates for top jobs
    const topJobsWithConversion = topJobs.map((job) => ({
      ...job,
      conversionRate:
        job.viewCount > 0
          ? ((job.applicationCount / job.viewCount) * 100).toFixed(1)
          : 0,
    }));

    // Get conversion funnel data
    const totalViews = totalJobViews._sum.viewCount || 0;
    const startedApplications = Math.floor(totalApplications * 1.5); // Estimate based on completed apps
    const interviews = await appPrisma.application.count({
      where: {
        status: "Interview",
        appliedAt: {
          gte: startDate,
          lte: now,
        },
      },
    });
    const hired = await appPrisma.application.count({
      where: {
        status: "Hired",
        appliedAt: {
          gte: startDate,
          lte: now,
        },
      },
    });

    const conversionFunnel = [
      {
        stage: "Job Views",
        count: totalViews,
        percentage: 100,
      },
      {
        stage: "Started Application",
        count: startedApplications,
        percentage:
          totalViews > 0
            ? ((startedApplications / totalViews) * 100).toFixed(1)
            : 0,
      },
      {
        stage: "Completed Application",
        count: totalApplications,
        percentage:
          startedApplications > 0
            ? ((totalApplications / startedApplications) * 100).toFixed(1)
            : 0,
      },
      {
        stage: "Interview",
        count: interviews,
        percentage:
          totalApplications > 0
            ? ((interviews / totalApplications) * 100).toFixed(1)
            : 0,
      },
      {
        stage: "Hired",
        count: hired,
        percentage:
          interviews > 0 ? ((hired / interviews) * 100).toFixed(1) : 0,
      },
    ];

    // Format response
    const analytics = {
      overview: {
        totalJobs,
        totalApplications,
        totalUsers,
        totalViews: totalViews,
        jobsChange: calculateChange(totalJobs, previousJobs),
        applicationsChange: calculateChange(
          totalApplications,
          previousApplications
        ),
        usersChange: calculateChange(totalUsers, previousUsers),
        viewsChange: 15.2, // Mock data for now
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
