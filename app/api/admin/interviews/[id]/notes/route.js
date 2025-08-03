// app/api/admin/interviews/[id]/notes/route.js
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

    const { notes, rating } = await request.json();

    // Find the interview
    const interview = await appPrisma.interview_tokens.findUnique({
      where: { id },
      include: {
        applications: {
          include: {
            jobs: {
              select: {
                createdBy: true
              }
            }
          }
        }
      }
    });

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    // Update interview with notes and rating
    const updatedInterview = await appPrisma.interview_tokens.update({
      where: { id },
      data: {
        interview_notes: notes || null,
        interview_rating: rating && rating > 0 ? rating : null,
        updated_at: new Date(),
      },
    });

    // Add application note about the interview notes being added/updated
    await appPrisma.application_notes.create({
      data: {
        application_id: interview.application_id,
        content: notes 
          ? `Interview notes ${interview.interview_notes ? 'updated' : 'added'}${rating ? ` with rating ${rating}/5` : ''}`
          : 'Interview notes removed',
        type: "interview_notes",
        author_id: session.user.id,
        author_name: session.user.name || session.user.email,
        metadata: {
          interviewTokenId: interview.id,
          hasNotes: !!notes,
          rating: rating || null,
        },
        is_system_generated: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Interview notes saved successfully",
      interview: updatedInterview
    });

  } catch (error) {
    console.error("Error saving interview notes:", error);
    return NextResponse.json(
      { error: "Failed to save interview notes", details: error.message },
      { status: 500 }
    );
  }
}