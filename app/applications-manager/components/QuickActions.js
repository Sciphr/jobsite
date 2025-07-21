"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle, 
  Clock, 
  Calendar, 
  UserCheck, 
  X, 
  Mail,
  MoreHorizontal,
  Eye,
  Phone,
  Send,
  ChevronDown
} from "lucide-react";

const QUICK_ACTIONS = [
  { id: "Reviewing", icon: CheckCircle, color: "yellow", label: "Review" },
  { id: "Interview", icon: Calendar, color: "green", label: "Interview" },
  { id: "Hired", icon: UserCheck, color: "emerald", label: "Hire" },
  { id: "Rejected", icon: X, color: "red", label: "Reject" },
];

export default function QuickActions({ 
  application, 
  onStatusChange, 
  onEmail, 
  onView,
  compact = false,
  showLabels = true 
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleStatusChange = async (statusId) => {
    if (application.status === statusId) return;
    
    setIsLoading(true);
    try {
      await onStatusChange(application.id, statusId);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmail = () => {
    onEmail(application);
  };

  const handleView = () => {
    onView(application);
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-1">
        {/* Compact view with only essential actions */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleView}
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          title="View Details"
        >
          <Eye className="h-3.5 w-3.5" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleEmail}
          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
          title="Send Email"
        >
          <Mail className="h-3.5 w-3.5" />
        </motion.button>

        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors"
            title="More Actions"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </motion.button>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.1 }}
                className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                onMouseLeave={() => setShowDropdown(false)}
              >
                <div className="py-1">
                  {QUICK_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    const isCurrentStatus = application.status === action.id;
                    
                    return (
                      <motion.button
                        key={action.id}
                        whileHover={{ x: 2 }}
                        onClick={() => {
                          handleStatusChange(action.id);
                          setShowDropdown(false);
                        }}
                        disabled={isCurrentStatus || isLoading}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center space-x-2 ${
                          isCurrentStatus 
                            ? 'bg-gray-50 text-gray-400 cursor-not-allowed' 
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <Icon className={`h-3 w-3 ${isCurrentStatus ? 'text-gray-400' : `text-${action.color}-500`}`} />
                        <span>{action.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Full view with status buttons
  return (
    <div className="flex items-center space-x-2">
      {/* Primary Action Buttons */}
      {QUICK_ACTIONS.slice(0, 3).map((action) => {
        const Icon = action.icon;
        const isCurrentStatus = application.status === action.id;
        
        return (
          <motion.button
            key={action.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleStatusChange(action.id)}
            disabled={isCurrentStatus || isLoading}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center space-x-1 ${
              isCurrentStatus
                ? `bg-${action.color}-100 text-${action.color}-700 cursor-not-allowed opacity-60`
                : `bg-${action.color}-50 text-${action.color}-700 hover:bg-${action.color}-100`
            }`}
            title={isCurrentStatus ? `Currently ${action.label}` : `Mark as ${action.label}`}
          >
            <Icon className="h-3.5 w-3.5" />
            {showLabels && <span>{action.label}</span>}
          </motion.button>
        );
      })}

      {/* Communication Buttons */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleEmail}
        className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium rounded-lg transition-colors flex items-center space-x-1"
        title="Send Email"
      >
        <Mail className="h-3.5 w-3.5" />
        {showLabels && <span>Email</span>}
      </motion.button>

      {application.phone && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.open(`tel:${application.phone}`)}
          className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-medium rounded-lg transition-colors flex items-center space-x-1"
          title="Call Applicant"
        >
          <Phone className="h-3.5 w-3.5" />
          {showLabels && <span>Call</span>}
        </motion.button>
      )}

      {/* More Actions Dropdown */}
      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowDropdown(!showDropdown)}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="More Actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </motion.button>

        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
              onMouseLeave={() => setShowDropdown(false)}
            >
              <div className="py-2">
                <motion.button
                  whileHover={{ x: 2 }}
                  onClick={() => {
                    handleView();
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center space-x-2"
                >
                  <Eye className="h-4 w-4 text-gray-400" />
                  <span>View Full Details</span>
                </motion.button>
                
                <motion.button
                  whileHover={{ x: 2 }}
                  onClick={() => {
                    handleStatusChange("Rejected");
                    setShowDropdown(false);
                  }}
                  disabled={application.status === "Rejected" || isLoading}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="h-4 w-4 text-red-500" />
                  <span>Reject Application</span>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
      )}
    </div>
  );
}