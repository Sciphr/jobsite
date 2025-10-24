// app/api/admin/talent-pool/[candidateId]/route.js
import { NextResponse } from "next/server";
import { protectRoute } from "@/app/lib/middleware/apiProtection";
import { appPrisma } from "@/app/lib/prisma";
import { logAuditEvent } from "@/lib/auditMiddleware";

/**
 * GET /api/admin/talent-pool/[candidateId]
 * Get detailed information about a talent pool candidate
 * Automatically logs a "viewed_profile" interaction
 */
export async function GET(request, { params }) {
  try {
    const authResult = await protectRoute("talent_pool", "read");
    if (authResult.error) return authResult.error;

    const session = authResult.session;
    const resolvedParams = await params;
    const candidateId = resolvedParams.candidateId;

    // Fetch candidate details
    const candidate = await appPrisma.users.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
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
        createdAt: true,
        role: true,
        account_type: true,
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    // Don't show admin users in talent pool
    if (candidate.role === "admin") {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    // Get all applications
    const applications = await appPrisma.applications.findMany({
      where: { userId: candidateId },
      include: {
        jobs: {
          select: {
            id: true,
            title: true,
            status: true,
            location: true,
            department: true,
            employment_types: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        users_applications_sourced_byTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { appliedAt: "desc" },
    });

    // Get all interactions
    const interactions = await appPrisma.talent_pool_interactions.findMany({
      where: { candidate_id: candidateId },
      include: {
        users_talent_pool_interactions_admin_idTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        jobs: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    // Get all invitations
    const invitations = await appPrisma.job_invitations.findMany({
      where: { candidate_id: candidateId },
      include: {
        jobs: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        users_job_invitations_invited_byTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { sent_at: "desc" },
    });

    // Log interaction: viewed_profile
    await appPrisma.talent_pool_interactions.create({
      data: {
        admin_id: session.user.id,
        candidate_id: candidateId,
        interaction_type: "viewed_profile",
        metadata: {
          viewedAt: new Date().toISOString(),
          viewedBy: session.user.name || session.user.email,
        },
      },
    });

    // Compute candidate name
    const candidateName = [candidate.firstName, candidate.lastName].filter(Boolean).join(" ") || candidate.email;

    // Log audit event
    await logAuditEvent({
      eventType: "READ",
      category: "TALENT_POOL",
      subcategory: "VIEW_PROFILE",
      entityType: "user",
      entityId: candidateId,
      entityName: candidateName,
      actorId: session.user.id,
      actorName: session.user.name || session.user.email,
      actorType: "user",
      action: "View talent pool candidate profile",
      description: `Viewed profile of ${candidateName}`,
      metadata: {
        candidateId,
        candidateName,
        candidateEmail: candidate.email,
      },
    });

    return NextResponse.json({
      candidate: {
        ...candidate,
        name: candidateName, // Add computed name field
        stats: {
          totalApplications: applications.length,
          interactionsCount: interactions.length,
          invitationsCount: invitations.length,
          activeInvitationsCount: invitations.filter((inv) =>
            ["sent", "viewed"].includes(inv.status)
          ).length,
        },
      },
      applications: applications.map((app) => ({
        id: app.id,
        status: app.status,
        appliedAt: app.appliedAt,
        sourceType: app.source_type,
        sourcedBy: app.users_applications_sourced_byTousers ? {
          ...app.users_applications_sourced_byTousers,
          name: [
            app.users_applications_sourced_byTousers.firstName,
            app.users_applications_sourced_byTousers.lastName
          ].filter(Boolean).join(" ") || "Unknown",
        } : null,
        sourcedAt: app.sourced_at,
        job: app.jobs ? {
          ...app.jobs,
          jobType: app.jobs.employment_types?.name || null,
        } : null,
      })),
      interactions: interactions.map((int) => ({
        ...int,
        admin: int.users_talent_pool_interactions_admin_idTousers ? {
          ...int.users_talent_pool_interactions_admin_idTousers,
          name: [
            int.users_talent_pool_interactions_admin_idTousers.firstName,
            int.users_talent_pool_interactions_admin_idTousers.lastName
          ].filter(Boolean).join(" ") || "Unknown",
        } : null,
        job: int.jobs || null,
      })),
      invitations: invitations.map((inv) => ({
        ...inv,
        job: inv.jobs || null,
        invited_by_user: inv.users_job_invitations_invited_byTousers ? {
          ...inv.users_job_invitations_invited_byTousers,
          name: [
            inv.users_job_invitations_invited_byTousers.firstName,
            inv.users_job_invitations_invited_byTousers.lastName
          ].filter(Boolean).join(" ") || "Unknown",
        } : null,
      })),
    });
  } catch (error) {
    console.error("Error fetching candidate details:", error);
    return NextResponse.json(
      { error: "Failed to fetch candidate details" },
      { status: 500 }
    );
  }
}
