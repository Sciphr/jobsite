// app/api/admin/interviews/[id]/complete/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { appPrisma } from "../../../../../lib/prisma";

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the interview
    const interview = await appPrisma.interview_tokens.findUnique({
      where: { id },
      include: {
        applications: {
          include: {
            jobs: {
              select: {
                createdBy: true,
                title: true
              }
            }
          }
        }
      }
    });

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    // Check if interview is already completed
    if (interview.is_completed) {
      return NextResponse.json({ error: "Interview is already marked as completed" }, { status: 400 });
    }

    // Update interview as completed
    const updatedInterview = await appPrisma.interview_tokens.update({
      where: { id },
      data: {
        is_completed: true,
        completed_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Add application note about the interview completion
    await appPrisma.application_notes.create({
      data: {
        application_id: interview.application_id,
        content: `Interview completed - ${interview.type} interview for ${interview.applications.jobs.title}`,
        type: "interview_completed",
        author_id: session.user.id,
        author_name: session.user.name || session.user.email,
        metadata: {
          interviewTokenId: interview.id,
          interviewType: interview.type,
          duration: interview.duration,
          completedAt: new Date(),
        },
        is_system_generated: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Interview marked as completed successfully",
      interview: updatedInterview
    });

  } catch (error) {
    console.error("Error marking interview as completed:", error);
    return NextResponse.json(
      { error: "Failed to mark interview as completed", details: error.message },
      { status: 500 }
    );
  }
}