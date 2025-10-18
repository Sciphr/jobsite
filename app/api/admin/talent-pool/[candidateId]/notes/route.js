// app/api/admin/talent-pool/[candidateId]/notes/route.js
import { NextResponse } from "next/server";
import { protectRoute } from "@/app/lib/middleware/apiProtection";
import { appPrisma } from "@/app/lib/prisma";
import { logAuditEvent } from "@/lib/auditMiddleware";

/**
 * POST /api/admin/talent-pool/[candidateId]/notes
 * Add a note/interaction for a talent pool candidate
 * Body: { notes, jobId (optional) }
 */
export async function POST(request, { params }) {
  try {
    const authResult = await protectRoute("talent_pool", "note");
    if (authResult.error) return authResult.error;

    const session = authResult.session;
    const resolvedParams = await params;
    const candidateId = resolvedParams.candidateId;
    const { notes, jobId } = await request.json();

    if (!notes || notes.trim() === "") {
      return NextResponse.json(
        { error: "Notes are required" },
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
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    // If jobId provided, verify it exists
    let job = null;
    if (jobId) {
      job = await appPrisma.jobs.findUnique({
        where: { id: jobId },
        select: {
          id: true,
          title: true,
        },
      });

      if (!job) {
        return NextResponse.json(
          { error: "Job not found" },
          { status: 404 }
        );
      }
    }

    // Create interaction
    const interaction = await appPrisma.talent_pool_interactions.create({
      data: {
        admin_id: session.user.id,
        candidate_id: candidateId,
        job_id: jobId || null,
        interaction_type: "added_note",
        notes,
        metadata: {
          addedAt: new Date().toISOString(),
          addedBy: session.user.name || session.user.email,
        },
      },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Log audit event
    await logAuditEvent({
      eventType: "CREATE",
      category: "TALENT_POOL",
      subcategory: "NOTE",
      entityType: "talent_pool_interaction",
      entityId: interaction.id,
      entityName: "Talent pool note",
      actorId: session.user.id,
      actorName: session.user.name || session.user.email,
      actorType: "user",
      action: "Add talent pool note",
      description: `Added note for ${candidate.name || candidate.email}${job ? ` regarding ${job.title}` : ""}`,
      metadata: {
        candidateId,
        candidateName: candidate.name,
        candidateEmail: candidate.email,
        jobId,
        jobTitle: job?.title,
        noteLength: notes.length,
      },
    });

    return NextResponse.json({
      success: true,
      interaction: {
        id: interaction.id,
        type: interaction.interaction_type,
        notes: interaction.notes,
        createdAt: interaction.created_at,
        admin: interaction.admin,
        job: interaction.job,
      },
      message: "Note added successfully",
    });
  } catch (error) {
    console.error("Error adding talent pool note:", error);
    return NextResponse.json(
      { error: "Failed to add note" },
      { status: 500 }
    );
  }
}
