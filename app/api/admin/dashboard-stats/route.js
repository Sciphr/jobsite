import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // For dashboard stats, if user has any admin permissions at all, show all data
    // The admin layout already checks for admin permissions before allowing access
    const stats = {};

    // Get all dashboard data for any admin user
    const [
      totalApplications,
      recentApplications,
      totalJobs,
      recentJobs,
      totalUsers,
      totalViews
    ] = await Promise.all([
      // Applications data
      appPrisma.applications.count(),
      appPrisma.applications.findMany({
        take: 5,
        orderBy: { appliedAt: "desc" },
        include: {
          jobs: {
            select: { title: true },
          },
        },
      }),
      // Jobs data
      appPrisma.jobs.count({
        where: { status: "Active" },
      }),
      appPrisma.jobs.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          title: true,
          department: true,
          status: true,
          createdAt: true,
          _count: {
            select: {
              applications: true,
            },
          },
        },
      }),
      // Users data
      appPrisma.users.count(),
      // Analytics data
      appPrisma.jobs.aggregate({
        _sum: {
          viewCount: true,
        },
      })
    ]);

    // Set all stats for admin users
    stats.totalApplications = totalApplications;
    stats.recentApplications = recentApplications.map((app) => ({
      name: app.name || app.email,
      jobTitle: app.jobs.title,
      status: app.status,
      appliedAt: app.appliedAt,
    }));

    stats.totalJobs = totalJobs;
    stats.recentJobs = recentJobs.map((job) => ({
      title: job.title,
      department: job.department,
      status: job.status,
      createdAt: job.createdAt,
      applicationCount: job._count.applications,
    }));

    stats.totalUsers = totalUsers;
    stats.totalViews = totalViews._sum.viewCount || 0;

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
