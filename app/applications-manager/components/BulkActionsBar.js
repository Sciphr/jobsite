"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle, 
  Clock, 
  Calendar, 
  UserCheck, 
  X, 
  Mail, 
  ChevronDown,
  Zap,
  Users,
  Send
} from "lucide-react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";

const STATUS_OPTIONS = [
  { id: "Applied", label: "Applied", icon: Clock, color: "blue", desc: "Mark as newly applied" },
  { id: "Reviewing", label: "Under Review", icon: CheckCircle, color: "yellow", desc: "Currently being reviewed" },
  { id: "Interview", label: "Interview", icon: Calendar, color: "green", desc: "Schedule for interview" },
  { id: "Hired", label: "Hired", icon: UserCheck, color: "emerald", desc: "Successfully hired" },
  { id: "Rejected", label: "Rejected", icon: X, color: "red", desc: "Not selected" },
];

export default function BulkActionsBar({ 
  selectedCount, 
  onBulkStatusChange, 
  onBulkEmail, 
  onClearSelection,
  isLoading = false 
}) {
  const { getButtonClasses } = useThemeClasses();
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showEmailOptions, setShowEmailOptions] = useState(false);

  if (selectedCount === 0) return null;

  const handleStatusChange = async (statusId) => {
    setShowStatusDropdown(false);
    await onBulkStatusChange(statusId);
  };

  const handleBulkEmail = async (emailType) => {
    setShowEmailOptions(false);
    await onBulkEmail(emailType);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, y: -20, height: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-6 shadow-sm"
      >
        <div className="flex items-center justify-between">
          {/* Selection Summary */}
          <div className="flex items-center space-x-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center space-x-2 bg-blue-100 px-3 py-2 rounded-lg"
            >
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-blue-800 font-semibold">
                {selectedCount} application{selectedCount !== 1 ? 's' : ''} selected
              </span>
            </motion.div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClearSelection}
              className="text-gray-500 hover:text-gray-700 text-sm flex items-center space-x-1"
            >
              <X className="h-4 w-4" />
              <span>Clear selection</span>
            </motion.button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {/* Quick Status Actions */}
            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleStatusChange("Reviewing")}
                disabled={isLoading}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Review</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleStatusChange("Interview")}
                disabled={isLoading}
                className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <Calendar className="h-4 w-4" />
                <span>Interview</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleStatusChange("Rejected")}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>Reject</span>
              </motion.button>
            </div>

            {/* Status Dropdown */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                disabled={isLoading}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <Zap className="h-4 w-4" />
                <span>More Status</span>
                <motion.div
                  animate={{ rotate: showStatusDropdown ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-4 w-4" />
                </motion.div>
              </motion.button>

              <AnimatePresence>
                {showStatusDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-50"
                  >
                    <div className="p-2">
                      {STATUS_OPTIONS.map((status) => {
                        const Icon = status.icon;
                        return (
                          <motion.button
                            key={status.id}
                            whileHover={{ scale: 1.02, x: 2 }}
                            onClick={() => handleStatusChange(status.id)}
                            className="w-full text-left px-3 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-start space-x-3"
                          >
                            <Icon className={`h-5 w-5 mt-0.5 text-${status.color}-500`} />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {status.label}
                              </div>
                              <div className="text-xs text-gray-500">
                                {status.desc}
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Email Actions */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowEmailOptions(!showEmailOptions)}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <Send className="h-4 w-4" />
                <span>Send Email</span>
                <motion.div
                  animate={{ rotate: showEmailOptions ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-4 w-4" />
                </motion.div>
              </motion.button>

              <AnimatePresence>
                {showEmailOptions && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50"
                  >
                    <div className="p-2">
                      <motion.button
                        whileHover={{ scale: 1.02, x: 2 }}
                        onClick={() => handleBulkEmail("custom")}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        📝 Custom Email
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02, x: 2 }}
                        onClick={() => handleBulkEmail("Reviewing")}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        👀 Application Review Update
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02, x: 2 }}
                        onClick={() => handleBulkEmail("Interview")}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        📅 Interview Invitation
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02, x: 2 }}
                        onClick={() => handleBulkEmail("Rejected")}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        📋 Application Status Update
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center mt-3 pt-3 border-t border-blue-200"
          >
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-blue-600">Processing...</span>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}