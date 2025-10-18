// app/api/admin/talent-pool/route.js
import { NextResponse } from "next/server";
import { protectRoute } from "@/app/lib/middleware/apiProtection";
import { appPrisma } from "@/app/lib/prisma";
import { logAuditEvent } from "@/lib/auditMiddleware";

/**
 * GET /api/admin/talent-pool
 * Search and browse talent pool candidates
 * Query params:
 * - search: text search across name, email, bio, skills
 * - skills: comma-separated skill tags
 * - location: location filter
 * - availableOnly: boolean to filter only available candidates
 * - page: pagination page number (default 1)
 * - limit: results per page (default 20)
 */
export async function GET(request) {
  try {
    const authResult = await protectRoute("talent_pool", "read");
    if (authResult.error) return authResult.error;

    const session = authResult.session;
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const search = searchParams.get("search") || "";
    const skills = searchParams.get("skills")
      ? searchParams.get("skills").split(",").map((s) => s.trim())
      : [];
    const location = searchParams.get("location") || "";
    const availableOnly = searchParams.get("availableOnly") === "true";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;

    // Build where clause
    const where = {
      AND: [
        // Exclude admin users (only show regular users in talent pool)
        { role: { not: "admin" } },
      ],
    };

    // Text search across multiple fields
    if (search) {
      where.AND.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { bio: { contains: search, mode: "insensitive" } },
          { current_company: { contains: search, mode: "insensitive" } },
          { current_title: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    // Skills filter (using PostgreSQL array contains)
    if (skills.length > 0) {
      where.AND.push({
        skills: {
          hasSome: skills,
        },
      });
    }

    // Location filter
    if (location) {
      where.AND.push({
        location: { contains: location, mode: "insensitive" },
      });
    }

    // Available for opportunities filter
    if (availableOnly) {
      where.AND.push({
        available_for_opportunities: true,
      });
    }

    // Get total count for pagination
    const totalCount = await appPrisma.users.count({ where });

    // Fetch candidates with pagination
    const candidates = await appPrisma.users.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        skills: true,
        location: true,
        current_company: true,
        current_title: true,
        years_experience: true,
        linkedin_url: true,
        portfolio_url: true,
        available_for_opportunities: true,
        last_profile_update: true,
        created_at: true,
        // Include application count
        _count: {
          select: {
            applications: true,
          },
        },
      },
      orderBy: [
        { last_profile_update: "desc" },
        { created_at: "desc" },
      ],
      skip: offset,
      take: limit,
    });

    // For each candidate, get their recent interactions and application stats
    const candidatesWithStats = await Promise.all(
      candidates.map(async (candidate) => {
        // Get recent interactions count
        const interactionsCount = await appPrisma.talent_pool_interactions.count({
          where: { candidate_id: candidate.id },
        });

        // Get recent applications
        const recentApplications = await appPrisma.applications.findMany({
          where: { user_id: candidate.id },
          include: {
            job: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
          orderBy: { applied_at: "desc" },
          take: 3,
        });

        // Get active invitations count
        const activeInvitationsCount = await appPrisma.job_invitations.count({
          where: {
            candidate_id: candidate.id,
            status: { in: ["sent", "viewed"] },
          },
        });

        return {
          ...candidate,
          stats: {
            totalApplications: candidate._count.applications,
            interactionsCount,
            activeInvitationsCount,
          },
          recentApplications: recentApplications.map((app) => ({
            id: app.id,
            status: app.status,
            appliedAt: app.applied_at,
            sourceType: app.source_type,
            job: app.job,
          })),
        };
      })
    );

    // Log audit event for talent pool search
    await logAuditEvent({
      eventType: "READ",
      category: "TALENT_POOL",
      subcategory: "SEARCH",
      entityType: "talent_pool",
      entityId: "search",
      entityName: "Talent Pool Search",
      actorId: session.user.id,
      actorName: session.user.name || session.user.email,
      actorType: "user",
      action: "Search talent pool",
      description: `Searched talent pool with filters: ${JSON.stringify({
        search,
        skills,
        location,
        availableOnly,
      })}`,
      metadata: {
        search,
        skills,
        location,
        availableOnly,
        resultsCount: candidates.length,
        page,
        limit,
      },
    });

    return NextResponse.json({
      candidates: candidatesWithStats,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: offset + candidates.length < totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching talent pool:", error);
    return NextResponse.json(
      { error: "Failed to fetch talent pool candidates" },
      { status: 500 }
    );
  }
}
