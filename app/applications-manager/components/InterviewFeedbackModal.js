// app/applications-manager/components/InterviewFeedbackModal.js
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Star, MessageSquare, Calendar, User } from "lucide-react";

export default function InterviewFeedbackModal({
  isOpen,
  onClose,
  onSubmit,
  interviewsWithoutFeedback = [],
  applicationName = "",
}) {
  const [selectedInterviewId, setSelectedInterviewId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Set first interview as default when modal opens
  useState(() => {
    if (isOpen && interviewsWithoutFeedback.length > 0 && !selectedInterviewId) {
      setSelectedInterviewId(interviewsWithoutFeedback[0].id);
    }
  }, [isOpen, interviewsWithoutFeedback]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!feedback.trim()) {
      alert("Please provide feedback before submitting.");
      return;
    }

    if (!selectedInterviewId) {
      alert("Please select an interview to provide feedback for.");
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        interviewId: selectedInterviewId,
        feedback: feedback.trim(),
        rating: rating || null,
      });
      
      // Reset form
      setFeedback("");
      setRating(0);
      setSelectedInterviewId("");
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setFeedback("");
      setRating(0);
      setSelectedInterviewId("");
      onClose();
    }
  };

  const selectedInterview = interviewsWithoutFeedback.find(
    (interview) => interview.id === selectedInterviewId
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <MessageSquare className="h-6 w-6 mr-2 text-blue-600" />
                Interview Feedback Required
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Provide feedback for completed interviews before changing status
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={submitting}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Application Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Application:</strong> {applicationName}
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
              {interviewsWithoutFeedback.length} completed interview(s) require feedback
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Interview Selection */}
            {interviewsWithoutFeedback.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Interview
                </label>
                <select
                  value={selectedInterviewId}
                  onChange={(e) => setSelectedInterviewId(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Choose an interview...</option>
                  {interviewsWithoutFeedback.map((interview) => (
                    <option key={interview.id} value={interview.id}>
                      {new Date(interview.scheduled_at).toLocaleDateString()} - {interview.interviewer?.firstName} {interview.interviewer?.lastName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Interview Details (for single interview or selected interview) */}
            {selectedInterview && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Interview Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <Calendar className="h-4 w-4 mr-2" />
                    {new Date(selectedInterview.scheduled_at).toLocaleDateString()} at{" "}
                    {new Date(selectedInterview.scheduled_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <User className="h-4 w-4 mr-2" />
                    {selectedInterview.interviewer?.firstName} {selectedInterview.interviewer?.lastName}
                  </div>
                </div>
              </div>
            )}

            {/* Rating (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rating (Optional)
              </label>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star === rating ? 0 : star)}
                    disabled={submitting}
                    className={`p-1 rounded transition-colors ${
                      star <= rating
                        ? "text-yellow-400 hover:text-yellow-500"
                        : "text-gray-300 dark:text-gray-600 hover:text-gray-400"
                    }`}
                  >
                    <Star className={`h-6 w-6 ${star <= rating ? "fill-current" : ""}`} />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    {rating}/5 stars
                  </span>
                )}
              </div>
            </div>

            {/* Feedback Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Interview Feedback <span className="text-red-500">*</span>
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                disabled={submitting}
                placeholder="Provide detailed feedback about the interview, including candidate performance, answers to key questions, cultural fit, and recommendations..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows="6"
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                This feedback will be saved to the application notes and can be referenced later.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !feedback.trim() || !selectedInterviewId}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Submitting...
                  </>
                ) : (
                  "Submit Feedback"
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}