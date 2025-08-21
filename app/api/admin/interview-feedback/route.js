// app/api/admin/interview-feedback/route.js
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { createInterviewFeedback, getInterviewFeedback } from "../../../lib/interviewFeedbackUtils";
import { protectRoute } from "../../../lib/middleware/apiProtection";

export async function POST(req) {
  const authResult = await protectRoute("interviews", "notes");
  if (authResult.error) return authResult.error;
  const { session } = authResult;

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
  const authResult = await protectRoute("interviews", "notes");
  if (authResult.error) return authResult.error;
  const { session } = authResult;

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