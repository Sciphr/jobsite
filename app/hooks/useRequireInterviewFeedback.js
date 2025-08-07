// app/hooks/useRequireInterviewFeedback.js
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

export function useRequireInterviewFeedback() {
  const { data: session } = useSession();
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState(null);
  const [interviewsWithoutFeedback, setInterviewsWithoutFeedback] = useState([]);

  const handleStatusChangeWithFeedbackCheck = async (
    applicationId,
    newStatus,
    currentStatus,
    updateFunction
  ) => {
    try {
      // Attempt the status change first
      const result = await updateFunction(applicationId, newStatus);
      
      // Check if interview feedback is required
      if (result && result.requiresInterviewFeedback) {
        // Store the pending change and open feedback modal
        setPendingStatusChange({
          applicationId,
          newStatus,
          currentStatus,
          updateFunction,
        });
        setInterviewsWithoutFeedback(result.interviewsWithoutFeedback || []);
        setIsFeedbackModalOpen(true);
        
        // Return without the status change
        return false; // Indicates status change was blocked
      }
      
      // Status change was successful
      return result;
    } catch (error) {
      console.error("Error in status change with feedback check:", error);
      throw error;
    }
  };

  const completeStatusChangeWithFeedback = async (feedbackData) => {
    if (!pendingStatusChange || !session?.user) return null;

    try {
      const userName = session.user.firstName && session.user.lastName
        ? `${session.user.firstName} ${session.user.lastName}`.trim()
        : session.user.email || "System";

      // Submit the interview feedback
      const response = await fetch("/api/admin/interview-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: pendingStatusChange.applicationId,
          interviewId: feedbackData.interviewId,
          feedback: feedbackData.feedback,
          rating: feedbackData.rating,
          authorName: userName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit feedback");
      }

      // Now try the status change again
      const statusResult = await pendingStatusChange.updateFunction(
        pendingStatusChange.applicationId,
        pendingStatusChange.newStatus
      );

      // Clear pending state and close modal
      setIsFeedbackModalOpen(false);
      setPendingStatusChange(null);
      setInterviewsWithoutFeedback([]);

      return statusResult;
    } catch (error) {
      console.error("Error completing status change with feedback:", error);
      alert(`Error: ${error.message}`);
      throw error;
    }
  };

  const cancelStatusChange = () => {
    setIsFeedbackModalOpen(false);
    setPendingStatusChange(null);
    setInterviewsWithoutFeedback([]);
  };

  return {
    isFeedbackModalOpen,
    pendingStatusChange,
    interviewsWithoutFeedback,
    handleStatusChangeWithFeedbackCheck,
    completeStatusChangeWithFeedback,
    cancelStatusChange,
  };
}