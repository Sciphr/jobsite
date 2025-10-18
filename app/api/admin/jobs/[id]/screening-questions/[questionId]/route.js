// app/api/admin/jobs/[id]/screening-questions/[questionId]/route.js
import { NextResponse } from "next/server";
import { protectRoute } from "@/app/lib/middleware/apiProtection";
import { appPrisma } from "@/app/lib/prisma";
import { logAuditEvent } from "@/lib/auditMiddleware";

// PATCH - Update a screening question
export async function PATCH(request, { params }) {
  try {
    const authResult = await protectRoute("jobs", "update");
    if (authResult.error) return authResult.error;

    const session = authResult.session;
    const resolvedParams = await params;
    const body = await request.json();

    // Check if job has applicants
    const applicantCount = await appPrisma.applications.count({
      where: { jobId: resolvedParams.id },
    });

    // Get existing question
    const existingQuestion = await appPrisma.job_screening_questions.findUnique({
      where: { id: resolvedParams.questionId },
    });

    if (!existingQuestion) {
      return NextResponse.json(
        { error: "Screening question not found" },
        { status: 404 }
      );
    }

    // If job has applicants and not acknowledging the warning, return warning
    if (applicantCount > 0 && !body.acknowledgeWarning) {
      return NextResponse.json(
        {
          warning: true,
          message: `This job has ${applicantCount} applicant(s). Editing questions may result in inconsistent data.`,
          applicantCount,
        },
        { status: 409 }
      );
    }

    const {
      question_text,
      question_type,
      options,
      is_required,
      placeholder_text,
      help_text,
    } = body;

    // Validate options for multiple_choice and checkbox types
    if (question_type && ["multiple_choice", "checkbox"].includes(question_type)) {
      if (!options || !Array.isArray(options) || options.length < 2) {
        return NextResponse.json(
          { error: "Multiple choice and checkbox questions must have at least 2 options" },
          { status: 400 }
        );
      }
    }

    const question = await appPrisma.job_screening_questions.update({
      where: { id: resolvedParams.questionId },
      data: {
        ...(question_text && { question_text }),
        ...(question_type && { question_type }),
        ...(options !== undefined && { options: options ? JSON.stringify(options) : null }),
        ...(is_required !== undefined && { is_required }),
        ...(placeholder_text !== undefined && { placeholder_text }),
        ...(help_text !== undefined && { help_text }),
        updated_at: new Date(),
      },
    });

    // Get job details for audit log
    const job = await appPrisma.jobs.findUnique({
      where: { id: resolvedParams.id },
      select: { title: true },
    });

    // Log audit event
    await logAuditEvent({
      eventType: "UPDATE",
      category: "JOB",
      subcategory: "SCREENING_QUESTION",
      entityType: "job_screening_question",
      entityId: question.id,
      relatedJobId: resolvedParams.id,
      actorId: session.user.id,
      actorName: session.user.name || session.user.email,
      actorType: "user",
      action: "Update screening question",
      description: `Updated screening question for job: ${job?.title || resolvedParams.id}`,
      metadata: {
        question_type: question.question_type,
        applicant_count: applicantCount,
        warning_acknowledged: body.acknowledgeWarning || false,
      },
    });

    return NextResponse.json({ question });
  } catch (error) {
    console.error("Error updating screening question:", error);
    return NextResponse.json(
      { error: "Failed to update screening question" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a screening question from a job
export async function DELETE(request, { params }) {
  try {
    const authResult = await protectRoute("jobs", "update");
    if (authResult.error) return authResult.error;

    const session = authResult.session;
    const resolvedParams = await params;

    const existingQuestion = await appPrisma.job_screening_questions.findUnique({
      where: { id: resolvedParams.questionId },
    });

    if (!existingQuestion) {
      return NextResponse.json(
        { error: "Screening question not found" },
        { status: 404 }
      );
    }

    // Check if job has applicants
    const applicantCount = await appPrisma.applications.count({
      where: { jobId: resolvedParams.id },
    });

    await appPrisma.job_screening_questions.delete({
      where: { id: resolvedParams.questionId },
    });

    // Get job details for audit log
    const job = await appPrisma.jobs.findUnique({
      where: { id: resolvedParams.id },
      select: { title: true },
    });

    // Log audit event
    await logAuditEvent({
      eventType: "DELETE",
      category: "JOB",
      subcategory: "SCREENING_QUESTION",
      entityType: "job_screening_question",
      entityId: resolvedParams.questionId,
      relatedJobId: resolvedParams.id,
      actorId: session.user.id,
      actorName: session.user.name || session.user.email,
      actorType: "user",
      action: "Delete screening question",
      description: `Deleted screening question from job: ${job?.title || resolvedParams.id}`,
      metadata: {
        applicant_count: applicantCount,
      },
    });

    return NextResponse.json({ success: true, message: "Question deleted successfully" });
  } catch (error) {
    console.error("Error deleting screening question:", error);
    return NextResponse.json(
      { error: "Failed to delete screening question" },
      { status: 500 }
    );
  }
}
