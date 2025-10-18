// app/api/admin/jobs/[id]/screening-questions/route.js
import { NextResponse } from "next/server";
import { protectRoute } from "@/app/lib/middleware/apiProtection";
import { appPrisma } from "@/app/lib/prisma";
import { logAuditEvent } from "@/lib/auditMiddleware";

// GET - Get all screening questions for a job
export async function GET(request, { params }) {
  try {
    const authResult = await protectRoute("jobs", "read");
    if (authResult.error) return authResult.error;

    const resolvedParams = await params;
    const questions = await appPrisma.job_screening_questions.findMany({
      where: { job_id: resolvedParams.id },
      orderBy: { sort_order: "asc" },
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Error fetching screening questions:", error);
    return NextResponse.json(
      { error: "Failed to fetch screening questions" },
      { status: 500 }
    );
  }
}

// POST - Add a screening question to a job
export async function POST(request, { params }) {
  try {
    const authResult = await protectRoute("jobs", "update");
    if (authResult.error) return authResult.error;

    const session = authResult.session;
    const resolvedParams = await params;
    const body = await request.json();

    const {
      question_text,
      question_type,
      options,
      is_required,
      placeholder_text,
      help_text,
      created_from_template_id,
    } = body;

    // Validation
    if (!question_text || !question_type) {
      return NextResponse.json(
        { error: "Question text and type are required" },
        { status: 400 }
      );
    }

    const validTypes = ["text", "textarea", "multiple_choice", "checkbox", "yes_no", "file_upload", "date"];
    if (!validTypes.includes(question_type)) {
      return NextResponse.json(
        { error: "Invalid question type" },
        { status: 400 }
      );
    }

    // Validate options for multiple_choice and checkbox types
    if (["multiple_choice", "checkbox"].includes(question_type)) {
      if (!options || !Array.isArray(options) || options.length < 2) {
        return NextResponse.json(
          { error: "Multiple choice and checkbox questions must have at least 2 options" },
          { status: 400 }
        );
      }
    }

    // Get the current highest sort_order for this job
    const maxSortOrder = await appPrisma.job_screening_questions.aggregate({
      where: { job_id: resolvedParams.id },
      _max: { sort_order: true },
    });

    const nextSortOrder = (maxSortOrder._max.sort_order || 0) + 10;

    const question = await appPrisma.job_screening_questions.create({
      data: {
        job_id: resolvedParams.id,
        question_text,
        question_type,
        options: options ? JSON.stringify(options) : null,
        is_required: is_required || false,
        placeholder_text,
        help_text,
        sort_order: nextSortOrder,
        created_from_template_id: created_from_template_id || null,
      },
    });

    // Update template usage if created from template
    if (created_from_template_id) {
      await appPrisma.question_templates.update({
        where: { id: created_from_template_id },
        data: {
          usage_count: { increment: 1 },
          last_used_at: new Date(),
        },
      });
    }

    // Get job details for audit log
    const job = await appPrisma.jobs.findUnique({
      where: { id: resolvedParams.id },
      select: { title: true },
    });

    // Log audit event
    await logAuditEvent({
      eventType: "CREATE",
      category: "JOB",
      subcategory: "SCREENING_QUESTION",
      entityType: "job_screening_question",
      entityId: question.id,
      relatedJobId: resolvedParams.id,
      actorId: session.user.id,
      actorName: session.user.name || session.user.email,
      actorType: "user",
      action: "Add screening question to job",
      description: `Added screening question to job: ${job?.title || resolvedParams.id}`,
      metadata: {
        question_type: question.question_type,
        is_required: question.is_required,
        from_template: !!created_from_template_id,
      },
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    console.error("Error creating screening question:", error);
    return NextResponse.json(
      { error: "Failed to create screening question" },
      { status: 500 }
    );
  }
}
