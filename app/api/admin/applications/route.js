import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";
import { protectRoute } from "../../../lib/middleware/apiProtection";
import { withCache, cacheKeys, CACHE_DURATION, invalidateCache } from "../../../lib/serverCache";

export async function GET(req) {
  // Check if user has permission to view applications
  const authResult = await protectRoute("applications", "view");
  if (authResult.error) return authResult.error;

  const { session } = authResult;
  const { searchParams } = new URL(req.url);
  const includeArchived = searchParams.get('includeArchived') === 'true';

  try {
    const applications = await appPrisma.applications.findMany({
      where: includeArchived ? {} : { is_archived: false },
      include: {
        jobs: {
          select: {
            id: true,
            title: true,
            department: true,
            slug: true,
            location: true,
            employment_types: {
              select: {
                name: true
              }
            },
            experience_levels: {
              select: {
                name: true
              }
            },
            remote_policies: {
              select: {
                name: true
              }
            },
            categories: {
              select: {
                name: true
              }
            },
            salaryMin: true,
            salaryMax: true,
            salaryCurrency: true,
          },
        },
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        users_applications_archived_byTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        appliedAt: "desc",
      },
    });

    // Format the data for the frontend
    const formattedApplications = applications.map((app) => ({
      id: app.id,
      name:
        app.name ||
        (app.users ? `${app.users.firstName} ${app.users.lastName}`.trim() : null),
      email: app.email || app.users?.email,
      phone: app.phone,
      status: app.status,
      coverLetter: app.coverLetter,
      resumeUrl: app.resumeUrl,
      notes: app.notes,
      appliedAt: app.appliedAt,
      updatedAt: app.updatedAt,
      jobId: app.jobId,
      userId: app.userId,
      job: app.jobs, // Alias for frontend compatibility
      // Rating fields
      rating: app.rating,
      rating_type: app.rating_type,
      ai_rating: app.ai_rating,
      rating_updated_at: app.rating_updated_at,
      rated_by: app.rated_by,
      // Time tracking fields
      current_stage_entered_at: app.current_stage_entered_at,
      time_in_current_stage_seconds: app.time_in_current_stage_seconds,
      total_application_time_seconds: app.total_application_time_seconds,
      // Archive fields
      is_archived: app.is_archived,
      archived_at: app.archived_at,
      archived_by: app.archived_by,
      archive_reason: app.archive_reason,
      archivedBy: app.users_applications_archived_byTousers ? {
        id: app.users_applications_archived_byTousers.id,
        name: `${app.users_applications_archived_byTousers.firstName} ${app.users_applications_archived_byTousers.lastName}`.trim(),
        email: app.users_applications_archived_byTousers.email,
      } : null,
    }));

    return new Response(JSON.stringify(formattedApplications), { status: 200 });
  } catch (error) {
    console.error("Applications fetch error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
