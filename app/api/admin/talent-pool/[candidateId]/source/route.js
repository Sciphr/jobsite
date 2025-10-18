// app/api/admin/talent-pool/[candidateId]/source/route.js
import { NextResponse } from "next/server";
import { protectRoute } from "@/app/lib/middleware/apiProtection";
import { appPrisma } from "@/app/lib/prisma";
import { logAuditEvent } from "@/lib/auditMiddleware";
import { sendSourcedToPipelineNotification } from "@/app/lib/email";
import { getSystemSetting } from "@/app/lib/settings";

/**
 * POST /api/admin/talent-pool/[candidateId]/source
 * Add a candidate directly to a job pipeline (sourced candidate)
 * Body: { jobId, notes, status }
 */
export async function POST(request, { params }) {
  try {
    const authResult = await protectRoute("talent_pool", "source");
    if (authResult.error) return authResult.error;

    const session = authResult.session;
    const resolvedParams = await params;
    const candidateId = resolvedParams.candidateId;
    const { jobId, notes, status } = await request.json();

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // Verify candidate exists
    const candidate = await appPrisma.users.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    if (candidate.role === "admin") {
      return NextResponse.json(
        { error: "Cannot source admin users" },
        { status: 400 }
      );
    }

    // Verify job exists
    const job = await appPrisma.jobs.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        status: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    if (job.status !== "Active") {
      return NextResponse.json(
        { error: "Cannot source to inactive job" },
        { status: 400 }
      );
    }

    // Check if candidate already has an application for this job
    const existingApplication = await appPrisma.applications.findFirst({
      where: {
        job_id: jobId,
        user_id: candidateId,
      },
    });

    if (existingApplication) {
      return NextResponse.json(
        { error: "Candidate already has an application for this job" },
        { status: 400 }
      );
    }

    // Create sourced application
    const application = await appPrisma.applications.create({
      data: {
        job_id: jobId,
        user_id: candidateId,
        status: status || "New",
        source_type: "sourced",
        sourced_by: session.user.id,
        sourced_at: new Date(),
        applied_at: new Date(), // Set applied_at to now for sourced candidates
        internal_notes: notes || null,
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log talent pool interaction
    await appPrisma.talent_pool_interactions.create({
      data: {
        admin_id: session.user.id,
        candidate_id: candidateId,
        job_id: jobId,
        interaction_type: "sourced_to_job",
        notes: notes || null,
        metadata: {
          applicationId: application.id,
          applicationStatus: application.status,
          sourcedAt: new Date().toISOString(),
        },
      },
    });

    // Log audit event
    await logAuditEvent({
      eventType: "CREATE",
      category: "TALENT_POOL",
      subcategory: "SOURCE",
      entityType: "application",
      entityId: application.id,
      entityName: `Sourced application for ${job.title}`,
      actorId: session.user.id,
      actorName: session.user.name || session.user.email,
      actorType: "user",
      action: "Source candidate to job",
      description: `Added ${candidate.name || candidate.email} to ${job.title} pipeline as sourced candidate`,
      metadata: {
        candidateId,
        candidateName: candidate.name,
        candidateEmail: candidate.email,
        jobId,
        jobTitle: job.title,
        applicationStatus: application.status,
        notes,
      },
    });

    // Send email notification to candidate
    const companyName = await getSystemSetting("site_name", "Our Company");

    const emailResult = await sendSourcedToPipelineNotification({
      candidateEmail: candidate.email,
      candidateName: candidate.name,
      jobTitle: job.title,
      companyName,
      sourcedByName: session.user.name || session.user.email,
    });

    if (!emailResult.success) {
      console.error("Failed to send sourced notification email:", emailResult.error);
      // Don't fail the request - application was created successfully
      // Just log the error for admin awareness
    }

    return NextResponse.json({
      success: true,
      application: {
        id: application.id,
        status: application.status,
        sourceType: application.source_type,
        sourcedAt: application.sourced_at,
        job: application.job,
        candidate: application.user,
      },
      message: "Candidate sourced to job successfully",
    });
  } catch (error) {
    console.error("Error sourcing candidate to job:", error);
    return NextResponse.json(
      { error: "Failed to source candidate to job" },
      { status: 500 }
    );
  }
}
