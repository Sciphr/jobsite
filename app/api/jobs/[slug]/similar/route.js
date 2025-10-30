import { NextResponse } from "next/server";
import { appPrisma } from "../../../../lib/prisma";

// GET /api/jobs/[slug]/similar - Get similar jobs
export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const { slug } = resolvedParams;

    // Get the current job
    const currentJob = await appPrisma.jobs.findUnique({
      where: {
        slug,
        status: "Active",
      },
      include: {
        categories: true,
        experience_levels: true,
        employment_types: true,
        remote_policies: true,
      },
    });

    if (!currentJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Find similar jobs based on:
    // 1. Same category (highest priority)
    // 2. Same experience level (medium priority)
    // 3. Same location or remote policy (lower priority)
    // Exclude the current job and limit to 3-6 results

    const similarJobs = await appPrisma.jobs.findMany({
      where: {
        status: "Active",
        id: {
          not: currentJob.id, // Exclude current job
        },
        OR: [
          // Same category
          {
            categoryId: currentJob.categoryId,
          },
          // Same experience level
          {
            experienceLevelId: currentJob.experienceLevelId,
          },
          // Same location (partial match)
          {
            location: {
              contains: currentJob.location,
              mode: "insensitive",
            },
          },
          // Same remote policy
          {
            remotePolicyId: currentJob.remotePolicyId,
          },
        ],
      },
      include: {
        categories: true,
        experience_levels: true,
        employment_types: true,
        remote_policies: true,
      },
      take: 20, // Get more than needed so we can sort by relevance
    });

    // Score and sort by relevance
    const scoredJobs = similarJobs.map((job) => {
      let score = 0;

      // Same category: +10 points
      if (job.categoryId === currentJob.categoryId) {
        score += 10;
      }

      // Same experience level: +5 points
      if (job.experienceLevelId === currentJob.experienceLevelId) {
        score += 5;
      }

      // Same remote policy: +3 points
      if (job.remotePolicyId === currentJob.remotePolicyId) {
        score += 3;
      }

      // Same location (exact match): +3 points
      if (job.location.toLowerCase() === currentJob.location.toLowerCase()) {
        score += 3;
      }

      // Same department: +2 points
      if (job.department === currentJob.department) {
        score += 2;
      }

      // Featured jobs get a small boost: +1 point
      if (job.featured) {
        score += 1;
      }

      return { ...job, relevanceScore: score };
    });

    // Sort by relevance score (highest first), then by posted date
    scoredJobs.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return new Date(b.postedAt) - new Date(a.postedAt);
    });

    // Take top 3-6 most relevant jobs
    const topSimilarJobs = scoredJobs.slice(0, 6);

    // Remove the relevanceScore from response (internal use only)
    const cleanedJobs = topSimilarJobs.map(({ relevanceScore, ...job }) => job);

    return NextResponse.json({ similarJobs: cleanedJobs });
  } catch (error) {
    console.error("Error fetching similar jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch similar jobs" },
      { status: 500 }
    );
  }
}
