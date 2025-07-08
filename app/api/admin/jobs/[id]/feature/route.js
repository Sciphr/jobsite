// app/api/admin/jobs/[id]/feature/route.js - New endpoint for managing featured jobs
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import { appPrisma } from "../../../../../lib/prisma";
import { getSystemSetting } from "../../../../../lib/settings";

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);

  // Check if user is admin (privilege level 2 or higher)
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 2
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { featured } = body;

    // Get max featured jobs setting
    const maxFeaturedJobs = await getSystemSetting("max_featured_jobs", 5);

    // If trying to feature a job, check the limit
    if (featured) {
      const currentFeaturedCount = await appPrisma.job.count({
        where: {
          featured: true,
          status: "Active",
        },
      });

      if (currentFeaturedCount >= maxFeaturedJobs) {
        return new Response(
          JSON.stringify({
            message: `Cannot feature more than ${maxFeaturedJobs} jobs at once (system setting)`,
            currentFeatured: currentFeaturedCount,
            maxAllowed: maxFeaturedJobs,
          }),
          { status: 400 }
        );
      }
    }

    // Update the job
    const updatedJob = await appPrisma.job.update({
      where: { id },
      data: {
        featured,
        updatedAt: new Date(),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return new Response(JSON.stringify(updatedJob), { status: 200 });
  } catch (error) {
    console.error("Feature job error:", error);

    if (error.code === "P2025") {
      return new Response(JSON.stringify({ message: "Job not found" }), {
        status: 404,
      });
    }

    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}

// Get featured jobs status and limits
export async function GET(req) {
  const session = await getServerSession(authOptions);

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
    const maxFeaturedJobs = await getSystemSetting("max_featured_jobs", 5);

    const [currentFeaturedCount, featuredJobs] = await Promise.all([
      appPrisma.job.count({
        where: {
          featured: true,
          status: "Active",
        },
      }),
      appPrisma.job.findMany({
        where: {
          featured: true,
          status: "Active",
        },
        select: {
          id: true,
          title: true,
          department: true,
          postedAt: true,
        },
        orderBy: {
          postedAt: "desc",
        },
      }),
    ]);

    return new Response(
      JSON.stringify({
        currentFeatured: currentFeaturedCount,
        maxAllowed: maxFeaturedJobs,
        canAddMore: currentFeaturedCount < maxFeaturedJobs,
        availableSlots: maxFeaturedJobs - currentFeaturedCount,
        featuredJobs,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Featured jobs status error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
