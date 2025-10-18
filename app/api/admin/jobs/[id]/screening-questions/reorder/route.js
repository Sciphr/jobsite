// app/api/admin/jobs/[id]/screening-questions/reorder/route.js
import { NextResponse } from "next/server";
import { protectRoute } from "@/app/lib/middleware/apiProtection";
import { appPrisma } from "@/app/lib/prisma";
import { logAuditEvent } from "@/lib/auditMiddleware";

// POST - Reorder screening questions
export async function POST(request, { params }) {
  try {
    const authResult = await protectRoute("jobs", "update");
    if (authResult.error) return authResult.error;

    const session = authResult.session;
    const resolvedParams = await params;
    const body = await request.json();

    const { questionIds } = body; // Array of question IDs in new order

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json(
        { error: "questionIds array is required" },
        { status: 400 }
      );
    }

    // Update sort_order for each question in a transaction
    await appPrisma.$transaction(
      questionIds.map((questionId, index) =>
        appPrisma.job_screening_questions.update({
          where: { id: questionId },
          data: { sort_order: (index + 1) * 10 }, // 10, 20, 30, etc.
        })
      )
    );

    // Get job details for audit log
    const job = await appPrisma.jobs.findUnique({
      where: { id: resolvedParams.id },
      select: { title: true },
    });

    // Log audit event
    await logAuditEvent({
      eventType: "UPDATE",
      category: "JOB",
      subcategory: "SCREENING_QUESTION_REORDER",
      entityType: "job",
      entityId: resolvedParams.id,
      relatedJobId: resolvedParams.id,
      actorId: session.user.id,
      actorName: session.user.name || session.user.email,
      actorType: "user",
      action: "Reorder screening questions",
      description: `Reordered screening questions for job: ${job?.title || resolvedParams.id}`,
      metadata: {
        question_count: questionIds.length,
      },
    });

    return NextResponse.json({ success: true, message: "Questions reordered successfully" });
  } catch (error) {
    console.error("Error reordering screening questions:", error);
    return NextResponse.json(
      { error: "Failed to reorder screening questions" },
      { status: 500 }
    );
  }
}
