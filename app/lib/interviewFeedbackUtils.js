// app/lib/interviewFeedbackUtils.js
import { appPrisma } from "./prisma";
import { getSystemSetting } from "./settings";

/**
 * Check if interview feedback is required based on settings
 */
export async function isInterviewFeedbackRequired() {
  try {
    return await getSystemSetting("require_interview_feedback", false);
  } catch (error) {
    console.error("Error checking interview feedback requirement:", error);
    return false;
  }
}

/**
 * Check if an application has completed interviews without feedback
 */
export async function hasCompletedInterviewsWithoutFeedback(applicationId) {
  try {
    // Get completed interviews for this application
    const completedInterviews = await appPrisma.interviews.findMany({
      where: {
        application_id: applicationId,
        status: "completed",
      },
      select: {
        id: true,
        scheduled_at: true,
        interviewer_id: true,
        users_interviews_interviewer_idTousers: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (completedInterviews.length === 0) {
      return { hasCompletedInterviews: false, interviewsWithoutFeedback: [] };
    }

    // Check which interviews don't have feedback notes
    const interviewsWithoutFeedback = [];
    
    for (const interview of completedInterviews) {
      const feedbackExists = await appPrisma.application_notes.findFirst({
        where: {
          application_id: applicationId,
          type: "interview_feedback",
          metadata: {
            path: ["interview_id"],
            equals: interview.id,
          },
        },
      });

      if (!feedbackExists) {
        interviewsWithoutFeedback.push({
          id: interview.id,
          scheduled_at: interview.scheduled_at,
          interviewer: interview.users_interviews_interviewer_idTousers,
        });
      }
    }

    return {
      hasCompletedInterviews: true,
      interviewsWithoutFeedback,
      totalCompletedInterviews: completedInterviews.length,
    };
  } catch (error) {
    console.error("Error checking interview feedback:", error);
    return { hasCompletedInterviews: false, interviewsWithoutFeedback: [] };
  }
}

/**
 * Create interview feedback note
 */
export async function createInterviewFeedback({
  applicationId,
  interviewId,
  feedback,
  rating = null,
  authorId,
  authorName,
}) {
  try {
    // Get interview details for metadata
    const interview = await appPrisma.interviews.findUnique({
      where: { id: interviewId },
      include: {
        users_interviews_interviewer_idTousers: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!interview) {
      throw new Error("Interview not found");
    }

    // Create the feedback note
    const feedbackNote = await appPrisma.application_notes.create({
      data: {
        application_id: applicationId,
        content: feedback,
        type: "interview_feedback",
        author_id: authorId,
        author_name: authorName,
        metadata: {
          interview_id: interviewId,
          interview_date: interview.scheduled_at,
          interviewer_name: interview.users_interviews_interviewer_idTousers
            ? `${interview.users_interviews_interviewer_idTousers.firstName} ${interview.users_interviews_interviewer_idTousers.lastName}`.trim()
            : "Unknown",
          rating: rating,
        },
      },
    });

    return feedbackNote;
  } catch (error) {
    console.error("Error creating interview feedback:", error);
    throw error;
  }
}

/**
 * Get all interview feedback for an application
 */
export async function getInterviewFeedback(applicationId) {
  try {
    const feedback = await appPrisma.application_notes.findMany({
      where: {
        application_id: applicationId,
        type: "interview_feedback",
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return feedback;
  } catch (error) {
    console.error("Error getting interview feedback:", error);
    return [];
  }
}

/**
 * Check if status change should be blocked due to missing interview feedback
 */
export async function shouldBlockStatusChange(applicationId, currentStatus, newStatus) {
  // Only check if moving FROM Interview status and feedback is required
  if (currentStatus !== "Interview" || !await isInterviewFeedbackRequired()) {
    return { shouldBlock: false };
  }

  const result = await hasCompletedInterviewsWithoutFeedback(applicationId);
  
  if (result.interviewsWithoutFeedback.length > 0) {
    return {
      shouldBlock: true,
      message: `Interview feedback is required before changing status. ${result.interviewsWithoutFeedback.length} completed interview(s) need feedback.`,
      interviewsWithoutFeedback: result.interviewsWithoutFeedback,
    };
  }

  return { shouldBlock: false };
}