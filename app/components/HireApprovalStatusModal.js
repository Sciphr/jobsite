// app/components/HireApprovalStatusModal.js
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, Clock, X, ExternalLink } from "lucide-react";

export default function HireApprovalStatusModal({ 
  isOpen, 
  onClose, 
  type, // 'success', 'already-pending', 'error'
  message,
  applicationName = "this application",
  hireRequestId = null,
  existingRequestId = null
}) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-600" />;
      case 'already-pending':
        return <Clock className="h-12 w-12 text-orange-500" />;
      default:
        return <AlertCircle className="h-12 w-12 text-red-500" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'success':
        return "Hire Approval Requested";
      case 'already-pending':
        return "Already Pending Approval";
      default:
        return "Unable to Process Request";
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'success':
        return "Your request to hire this candidate has been submitted for approval. You'll be notified once it's been reviewed.";
      case 'already-pending':
        return "This application already has a pending hire approval request. Please wait for the existing request to be processed.";
      default:
        return "There was an issue processing your hire request. Please try again or contact an administrator.";
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return "bg-green-50 border-green-200";
      case 'already-pending':
        return "bg-orange-50 border-orange-200";
      default:
        return "bg-red-50 border-red-200";
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 50 }}
          transition={{ type: "spring", duration: 0.3 }}
          className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 border ${getBgColor()}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {getIcon()}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {getTitle()}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="mb-6">
            <p className="text-gray-600 dark:text-gray-400 mb-3">
              <strong>Application:</strong> {applicationName}
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              {message || getDescription()}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div>
              {type === 'already-pending' && existingRequestId && (
                <button
                  onClick={() => {
                    window.open(`/admin/hire-approvals`, '_blank');
                    onClose();
                  }}
                  className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>View Pending Requests</span>
                </button>
              )}
              {type === 'success' && hireRequestId && (
                <button
                  onClick={() => {
                    window.open(`/admin/hire-approvals`, '_blank');
                    onClose();
                  }}
                  className="inline-flex items-center space-x-2 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 text-sm font-medium"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>View Approval Status</span>
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              Got it
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}