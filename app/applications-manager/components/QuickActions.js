"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  ChevronDown,
  Archive,
  ArchiveRestore
} from "lucide-react";

const QUICK_ACTIONS = [
  { id: "Reviewing", icon: CheckCircle, color: "yellow", label: "Review" },
  { id: "Interview", icon: Calendar, color: "green", label: "Interview" },
  { id: "Hired", icon: UserCheck, color: "emerald", label: "Hire" },
  { id: "Rejected", icon: X, color: "red", label: "Reject" },
];

// Custom hook for dropdown positioning
function useDropdownPosition(isOpen, triggerRef, compact = true) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const dropdownWidth = compact ? 128 : 192; // w-32 = 128px, w-48 = 192px
      const dropdownHeight = compact ? 200 : 120; // estimated height

      let top = rect.bottom + 8; // mt-2 = 8px
      let left;

      if (compact) {
        // For compact (kanban), center the dropdown
        left = rect.left + (rect.width / 2) - (dropdownWidth / 2);
      } else {
        // For table view, align to the right of the button but ensure it doesn't go off screen
        left = rect.right - dropdownWidth;
      }

      // Prevent dropdown from going off screen
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Adjust horizontal position if needed
      if (left < 8) left = 8;
      if (left + dropdownWidth > viewportWidth - 8) {
        left = viewportWidth - dropdownWidth - 8;
      }

      // Adjust vertical position if needed (show above if no space below)
      if (top + dropdownHeight > viewportHeight - 8) {
        top = rect.top - dropdownHeight - 8;
      }

      setPosition({ top, left });
    }
  }, [isOpen, triggerRef, compact]);

  return position;
}

export default function QuickActions({
  application,
  onStatusChange,
  onEmail,
  onView,
  onArchive,
  compact = false,
  showLabels = true
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const triggerRef = useRef(null);
  const dropdownPosition = useDropdownPosition(showDropdown, triggerRef, compact);

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

  const handleArchive = () => {
    if (onArchive) {
      onArchive(application.id, !application.is_archived);
    }
  };

  const handleView = () => {
    onView(application);
  };

  // Portal dropdown component
  const PortalDropdown = ({ children, position, width = "w-32" }) => {
    if (typeof document === 'undefined') return null;

    return createPortal(
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -5 }}
        transition={{ duration: compact ? 0.1 : 0.15 }}
        className={`fixed ${width} admin-card rounded-lg shadow-xl border border-gray-200 dark:border-gray-600`}
        style={{
          top: position.top,
          left: position.left,
          zIndex: 999999
        }}
        onMouseLeave={() => setShowDropdown(false)}
      >
        {children}
      </motion.div>,
      document.body
    );
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-1">
        {/* Compact view with only essential actions */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleView}
          className="p-1.5 admin-text-light hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
          title="View Details"
        >
          <Eye className="h-3.5 w-3.5" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleEmail}
          className="p-1.5 admin-text-light hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
          title="Send Email"
        >
          <Mail className="h-3.5 w-3.5" />
        </motion.button>

        <div className="relative">
          <motion.button
            ref={triggerRef}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-1.5 admin-text-light hover:admin-text hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
            title="More Actions"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </motion.button>

          <AnimatePresence>
            {showDropdown && (
              <PortalDropdown position={dropdownPosition}>
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
                            ? 'bg-gray-50 dark:bg-gray-700 admin-text-light cursor-not-allowed'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 admin-text'
                        }`}
                      >
                        <Icon className={`h-3 w-3 ${isCurrentStatus ? 'admin-text-light' : `text-${action.color}-500`}`} />
                        <span>{action.label}</span>
                      </motion.button>
                    );
                  })}

                  {/* Archive/Unarchive Button */}
                  {onArchive && (
                    <>
                      <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                      <motion.button
                        whileHover={{ x: 2 }}
                        onClick={() => {
                          handleArchive();
                          setShowDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs transition-colors flex items-center space-x-2 hover:bg-gray-50 dark:hover:bg-gray-700 admin-text"
                      >
                        {application.is_archived ? (
                          <>
                            <ArchiveRestore className="h-3 w-3 text-blue-500" />
                            <span>Unarchive</span>
                          </>
                        ) : (
                          <>
                            <Archive className="h-3 w-3 text-gray-500" />
                            <span>Archive</span>
                          </>
                        )}
                      </motion.button>
                    </>
                  )}
                </div>
              </PortalDropdown>
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

      {/* Archive/Unarchive Button */}
      {onArchive && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleArchive}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center space-x-1 ${
            application.is_archived
              ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
              : "bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          }`}
          title={application.is_archived ? "Unarchive Application" : "Archive Application"}
        >
          {application.is_archived ? (
            <ArchiveRestore className="h-3.5 w-3.5" />
          ) : (
            <Archive className="h-3.5 w-3.5" />
          )}
          {showLabels && <span>{application.is_archived ? "Unarchive" : "Archive"}</span>}
        </motion.button>
      )}

      {/* More Actions Dropdown */}
      <div className="relative">
        <motion.button
          ref={triggerRef}
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
            <PortalDropdown position={dropdownPosition} width="w-48">
              <div className="py-2">
                <motion.button
                  whileHover={{ x: 2 }}
                  onClick={() => {
                    handleView();
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2 admin-text"
                >
                  <Eye className="h-4 w-4 admin-text-light" />
                  <span>View Full Details</span>
                </motion.button>

                <motion.button
                  whileHover={{ x: 2 }}
                  onClick={() => {
                    handleStatusChange("Rejected");
                    setShowDropdown(false);
                  }}
                  disabled={application.status === "Rejected" || isLoading}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed admin-text"
                >
                  <X className="h-4 w-4 text-red-500" />
                  <span>Reject Application</span>
                </motion.button>
              </div>
            </PortalDropdown>
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