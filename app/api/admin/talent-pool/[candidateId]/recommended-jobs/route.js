// app/api/admin/talent-pool/[candidateId]/recommended-jobs/route.js
import { NextResponse } from "next/server";
import { protectPremiumFeature } from "@/app/lib/middleware/apiProtection";
import { appPrisma } from "@/app/lib/prisma";
import { findBestJobMatches } from "@/app/utils/candidateMatching";

/**
 * GET /api/admin/talent-pool/[candidateId]/recommended-jobs
 * Get recommended jobs for a candidate based on match scoring
 * PREMIUM FEATURE - Requires Applications Manager access
 */
export async function GET(request, { params }) {
  try {
    const authResult = await protectPremiumFeature(request, "Candidate Job Matching");
    if (authResult.error) return authResult.error;

    const resolvedParams = await params;
    const candidateId = resolvedParams.candidateId;

    // Get candidate details
    const candidate = await appPrisma.users.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        skills: true,
        years_experience: true,
        location: true,
        available_for_opportunities: true,
        current_company: true,
        current_title: true,
        bio: true,
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    // Get all active jobs
    const jobs = await appPrisma.jobs.findMany({
      where: { status: "Active" },
      select: {
        id: true,
        title: true,
        department: true,
        location: true,
        type: true,
        required_skills: true,
        min_experience: true,
        max_experience: true,
        slug: true,
        description: true,
        salaryMin: true,
        salaryMax: true,
        featured: true,
        _count: {
          select: {
            applications: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    // Check which jobs the candidate has already applied to
    const existingApplications = await appPrisma.applications.findMany({
      where: {
        userId: candidateId,
      },
      select: {
        jobId: true,
      },
    });

    const appliedJobIds = new Set(existingApplications.map(app => app.jobId));

    // Add application status to jobs
    const jobsWithStatus = jobs.map(job => ({
      ...job,
      hasApplied: appliedJobIds.has(job.id),
      applicationCount: job._count.applications,
    }));

    // Calculate match scores and find best matches
    const recommendedJobs = findBestJobMatches(candidate, jobsWithStatus, 20);

    // Separate into categories
    const notApplied = recommendedJobs.filter(job => !job.hasApplied);
    const alreadyApplied = recommendedJobs.filter(job => job.hasApplied);

    // Compute candidate name
    const candidateName = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || candidate.email;

    return NextResponse.json({
      success: true,
      candidate: {
        id: candidate.id,
        name: candidateName,
        skills: candidate.skills,
        experience: candidate.years_experience,
        location: candidate.location,
      },
      recommendations: {
        topMatches: notApplied.slice(0, 5),
        goodMatches: notApplied.slice(5, 10),
        otherMatches: notApplied.slice(10),
        alreadyApplied: alreadyApplied,
      },
      summary: {
        totalActiveJobs: jobs.length,
        totalRecommended: notApplied.length,
        excellentMatches: notApplied.filter(j => j.matchScore.percentage >= 80).length,
        goodMatches: notApplied.filter(j => j.matchScore.percentage >= 60 && j.matchScore.percentage < 80).length,
        fairMatches: notApplied.filter(j => j.matchScore.percentage >= 40 && j.matchScore.percentage < 60).length,
      },
    });
  } catch (error) {
    console.error("Error getting recommended jobs:", error);
    return NextResponse.json(
      { error: "Failed to get recommended jobs" },
      { status: 500 }
    );
  }
}