// app/api/admin/jobs/[id]/screening-questions/batch/route.js
import { NextResponse } from "next/server";
import { protectRoute } from "@/app/lib/middleware/apiProtection";
import { appPrisma } from "@/app/lib/prisma";
import { logAuditEvent } from "@/lib/auditMiddleware";

// POST - Batch save all screening questions
export async function POST(request, { params }) {
  try {
    const authResult = await protectRoute("jobs", "update");
    if (authResult.error) return authResult.error;

    const session = authResult.session;
    const resolvedParams = await params;
    const body = await request.json();
    const { questions } = body;

    if (!Array.isArray(questions)) {
      return NextResponse.json(
        { error: "Questions must be an array" },
        { status: 400 }
      );
    }

    // Delete all existing questions for this job
    await appPrisma.job_screening_questions.deleteMany({
      where: { job_id: resolvedParams.id },
    });

    // Create all new questions
    const createdQuestions = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      // Validate
      if (!q.question_text || !q.question_type) {
        continue; // Skip invalid questions
      }

      const validTypes = ["text", "textarea", "multiple_choice", "checkbox", "yes_no", "file_upload", "date"];
      if (!validTypes.includes(q.question_type)) {
        continue; // Skip invalid question types
      }

      // Validate options for multiple_choice and checkbox
      if (["multiple_choice", "checkbox"].includes(q.question_type)) {
        const options = Array.isArray(q.options) ? q.options : (q.options ? JSON.parse(q.options) : []);
        if (options.length < 2) {
          continue; // Skip if not enough options
        }
      }

      const created = await appPrisma.job_screening_questions.create({
        data: {
          job_id: resolvedParams.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options ? (Array.isArray(q.options) ? JSON.stringify(q.options) : q.options) : null,
          is_required: q.is_required || false,
          placeholder_text: q.placeholder_text || null,
          help_text: q.help_text || null,
          sort_order: i * 10,
          created_from_template_id: q.created_from_template_id || null,
        },
      });

      createdQuestions.push(created);

      // Update template usage if created from template
      if (q.created_from_template_id) {
        await appPrisma.question_templates.update({
          where: { id: q.created_from_template_id },
          data: {
            usage_count: { increment: 1 },
            last_used_at: new Date(),
          },
        }).catch(() => {
          // Template might not exist anymore, ignore error
        });
      }
    }

    // Get job details for audit log
    const job = await appPrisma.jobs.findUnique({
      where: { id: resolvedParams.id },
      select: { title: true },
    });

    // Log audit event
    await logAuditEvent({
      eventType: "UPDATE",
      category: "JOB",
      subcategory: "SCREENING_QUESTIONS",
      entityType: "job",
      entityId: resolvedParams.id,
      relatedJobId: resolvedParams.id,
      actorId: session.user.id,
      actorName: session.user.name || session.user.email,
      actorType: "user",
      action: "Batch update screening questions",
      description: `Updated all screening questions for job: ${job?.title || resolvedParams.id}`,
      metadata: {
        question_count: createdQuestions.length,
      },
    });

    return NextResponse.json({
      success: true,
      questions: createdQuestions,
      count: createdQuestions.length,
    });
  } catch (error) {
    console.error("Error batch saving screening questions:", error);
    return NextResponse.json(
      { error: "Failed to save screening questions" },
      { status: 500 }
    );
  }
}
