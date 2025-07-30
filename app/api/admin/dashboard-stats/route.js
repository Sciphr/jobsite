import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";

export async function GET(req) {
  const session = await getServerSession(authOptions);

  // Check if user is admin (privilege level 1 or higher)
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 1
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  const userPrivilegeLevel = session.user.privilegeLevel;

  try {
    const stats = {};

    // Applications (HR level and above can see)
    if (userPrivilegeLevel >= 1) {
      const totalApplications = await appPrisma.applications.count();
      const recentApplications = await appPrisma.applications.findMany({
        take: 5,
        orderBy: { appliedAt: "desc" },
        include: {
          jobs: {
            select: { title: true },
          },
        },
      });

      stats.totalApplications = totalApplications;
      stats.recentApplications = recentApplications.map((app) => ({
        name: app.name || app.email,
        jobTitle: app.jobs.title,
        status: app.status,
        appliedAt: app.appliedAt,
      }));
    }

    // Jobs (Admin level and above can see)
    if (userPrivilegeLevel >= 2) {
      const totalJobs = await appPrisma.jobs.count({
        where: { status: "Active" },
      });
      const recentJobs = await appPrisma.jobs.findMany({
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
      });

      stats.totalJobs = totalJobs;
      stats.recentJobs = recentJobs;
    }

    // Users (Super Admin only)
    if (userPrivilegeLevel >= 3) {
      const totalUsers = await appPrisma.users.count();
      stats.totalUsers = totalUsers;
    }

    return new Response(JSON.stringify(stats), { status: 200 });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
