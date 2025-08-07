// app/applications-manager/components/RejectionNotesModal.js
"use client";

import { useState } from "react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { X, AlertTriangle, MessageSquare, Save } from "lucide-react";

export default function RejectionNotesModal({
  isOpen,
  onClose,
  onSubmit,
  applicationName = "this application",
}) {
  const { getButtonClasses } = useThemeClasses();
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!notes.trim()) {
      return; // Don't submit if notes are empty
    }

    try {
      setIsSubmitting(true);
      await onSubmit(notes.trim());
      setNotes(""); // Clear notes on success
    } catch (error) {
      console.error("Failed to submit rejection notes:", error);
      // Error handling can be improved with toast notifications
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNotes("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md admin-card rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b admin-border">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold admin-text">
                  Rejection Notes Required
                </h3>
                <p className="text-sm admin-text-light">
                  Enter a reason for rejecting {applicationName}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5 admin-text-light" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label htmlFor="rejection-notes" className="block text-sm font-medium admin-text mb-2">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Rejection Reason</span>
                </div>
              </label>
              <textarea
                id="rejection-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter the reason for rejecting this application..."
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 resize-none admin-text admin-card disabled:opacity-50"
                rows={4}
                autoFocus
              />
              <p className="mt-1 text-xs admin-text-light">
                This note will be added to the application timeline and is required for rejection.
              </p>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg admin-text hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!notes.trim() || isSubmitting}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  !notes.trim() || isSubmitting
                    ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    : getButtonClasses("primary")
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Reject Application</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}