// app/api/admin/jobs/[id]/feature/route.js - New endpoint for managing featured jobs
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import { appPrisma } from "../../../../../lib/prisma";
import { getSystemSetting } from "../../../../../lib/settings";
import { protectRoute } from "../../../../../lib/middleware/apiProtection";

export async function PATCH(req, { params }) {
  const authResult = await protectRoute("jobs", "feature");
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  const { id } = await params;

  try {
    const body = await req.json();
    const { featured } = body;

    // Get max featured jobs setting
    const maxFeaturedJobs = await getSystemSetting("max_featured_jobs", 5);

    // If trying to feature a job, check the limit
    if (featured) {
      const currentFeaturedCount = await appPrisma.jobs.count({
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
    const updatedJob = await appPrisma.jobs.update({
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
  const authResult = await protectRoute("jobs", "view");
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  try {
    const maxFeaturedJobs = await getSystemSetting("max_featured_jobs", 5);

    const [currentFeaturedCount, featuredJobs] = await Promise.all([
      appPrisma.jobs.count({
        where: {
          featured: true,
          status: "Active",
        },
      }),
      appPrisma.jobs.findMany({
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
