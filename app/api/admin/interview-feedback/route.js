// app/api/admin/interview-feedback/route.js
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { createInterviewFeedback, getInterviewFeedback } from "../../../lib/interviewFeedbackUtils";

export async function POST(req) {
  const session = await getServerSession(authOptions);

  // Check if user is admin (privilege level 1 or higher)
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 1
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const body = await req.json();
    const { applicationId, interviewId, feedback, rating, authorName } = body;

    // Validate required fields
    if (!applicationId || !interviewId || !feedback?.trim()) {
      return new Response(
        JSON.stringify({ 
          message: "Application ID, interview ID, and feedback are required" 
        }),
        { status: 400 }
      );
    }

    // Create the interview feedback
    const feedbackNote = await createInterviewFeedback({
      applicationId,
      interviewId,
      feedback: feedback.trim(),
      rating: rating || null,
      authorId: session.user.id,
      authorName: authorName || session.user.email || "System",
    });

    return new Response(JSON.stringify({
      success: true,
      message: "Interview feedback submitted successfully",
      feedbackId: feedbackNote.id,
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Interview feedback submission error:", error);

    return new Response(JSON.stringify({ 
      message: error.message || "Internal server error" 
    }), {
      status: 500,
    });
  }
}

export async function GET(req) {
  const session = await getServerSession(authOptions);

  // Check if user is admin (privilege level 1 or higher)
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 1
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const { searchParams } = new URL(req.url);
    const applicationId = searchParams.get("applicationId");

    if (!applicationId) {
      return new Response(
        JSON.stringify({ message: "Application ID is required" }),
        { status: 400 }
      );
    }

    // Get interview feedback for the application
    const feedback = await getInterviewFeedback(applicationId);

    return new Response(JSON.stringify({
      success: true,
      feedback,
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Interview feedback fetch error:", error);

    return new Response(JSON.stringify({ 
      message: "Internal server error" 
    }), {
      status: 500,
    });
  }
}