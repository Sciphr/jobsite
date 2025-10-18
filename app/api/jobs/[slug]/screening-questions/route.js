// app/api/jobs/[slug]/screening-questions/route.js
import { NextResponse } from "next/server";
import { appPrisma } from "@/app/lib/prisma";

// GET - Get screening questions for a job (public endpoint, no auth required)
export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;

    // Get job by slug
    const job = await appPrisma.jobs.findUnique({
      where: { slug: resolvedParams.slug },
      select: {
        id: true,
        title: true,
        application_type: true,
        status: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Only return questions if job is open and has full application type
    if (job.status !== "Open") {
      return NextResponse.json(
        { error: "Job is not accepting applications" },
        { status: 400 }
      );
    }

    if (job.application_type !== "full") {
      return NextResponse.json({ questions: [] });
    }

    // Get screening questions for this job
    const questions = await appPrisma.job_screening_questions.findMany({
      where: { job_id: job.id },
      orderBy: { sort_order: "asc" },
      select: {
        id: true,
        question_text: true,
        question_type: true,
        options: true,
        is_required: true,
        placeholder_text: true,
        help_text: true,
      },
    });

    // Parse options JSON for each question
    const parsedQuestions = questions.map((q) => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : null,
    }));

    return NextResponse.json({ questions: parsedQuestions });
  } catch (error) {
    console.error("Error fetching screening questions:", error);
    return NextResponse.json(
      { error: "Failed to fetch screening questions" },
      { status: 500 }
    );
  }
}
