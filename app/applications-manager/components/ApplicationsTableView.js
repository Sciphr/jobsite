// Applications Table View Component
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Eye,
  Star,
  Bot,
  Clock,
  ChevronRight,
  MoreHorizontal,
  AlertTriangle,
} from "lucide-react";
import { highlightText } from "@/app/components/SmartSearch";
import QuickActions from "./QuickActions";

export default function ApplicationsTableView({
  filteredApplications,
  onStatusChange,
  onViewApplication,
  onEmailApplication,
  onArchiveApplication,
  getButtonClasses,
  staleData,
  trackTimeInStage,
  searchTerm = "",
}) {
  const [sortField, setSortField] = useState("appliedAt");
  const [sortDirection, setSortDirection] = useState("desc");

  // Sort applications
  const sortedApplications = [...filteredApplications].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    // Handle nested fields
    if (sortField === "jobTitle") {
      aValue = a.job?.title || "";
      bValue = b.job?.title || "";
    }

    // Handle dates
    if (sortField === "appliedAt" || sortField === "updatedAt") {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }

    // Handle strings
    if (typeof aValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortDirection === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortHeader = ({ field, children, className = "" }) => (
    <th
      className={`px-6 py-3 text-left text-xs font-medium admin-text-light uppercase tracking-wider cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortField === field && (
          <span className="text-blue-500">
            {sortDirection === "asc" ? "↑" : "↓"}
          </span>
        )}
      </div>
    </th>
  );

  const getStatusColor = (status) => {
    const colors = {
      Applied: "bg-blue-100 text-blue-800 border-blue-200",
      Reviewing: "bg-yellow-100 text-yellow-800 border-yellow-200",
      Interview: "bg-green-100 text-green-800 border-green-200",
      Hired: "bg-emerald-100 text-emerald-800 border-emerald-200",
      Rejected: "bg-red-100 text-red-800 border-red-200",
    };
    return (
      colors[status] ||
      "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600"
    );
  };

  const renderRating = (application) => {
    if (!application.rating) {
      return (
        <div className="flex items-center space-x-1">
          <span className="text-xs admin-text-light">Not rated</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-1">
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-3 w-3 ${
                star <= application.rating
                  ? "text-yellow-400 fill-current"
                  : "text-gray-300"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center space-x-1">
          {application.rating_type === "ai" ? (
            <Bot className="h-3 w-3 text-blue-500" title="AI Rating" />
          ) : (
            <User className="h-3 w-3 text-green-500" title="Manual Rating" />
          )}
          <span className="text-xs admin-text-light">
            ({application.rating})
          </span>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="admin-card rounded-lg shadow overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y admin-border">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <SortHeader field="name">Candidate</SortHeader>
              <SortHeader field="jobTitle">Position</SortHeader>
              <SortHeader field="status">Status</SortHeader>
              <SortHeader field="rating">Rating</SortHeader>
              <SortHeader field="appliedAt">Applied</SortHeader>
              {trackTimeInStage && (
                <th className="px-6 py-3 text-left text-xs font-medium admin-text-light uppercase tracking-wider">
                  Time in Stage
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium admin-text-light uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="admin-card divide-y admin-border">
            <AnimatePresence>
              {sortedApplications.map((application, index) => (
                <motion.tr
                  key={application.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {/* Candidate */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                          {application.name?.charAt(0)?.toUpperCase() ||
                            application.email?.charAt(0)?.toUpperCase() ||
                            "A"}
                        </div>
                        {/* Stale indicator */}
                        {staleData?.applications?.some(
                          (staleApp) => staleApp.id === application.id
                        ) && (
                          <div className="absolute -top-0.5 -right-0.5 bg-orange-500 rounded-full p-0.5 border border-white dark:border-gray-800">
                            <AlertTriangle className="h-2 w-2 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium admin-text truncate">
                          {highlightText(application.name || "Anonymous", searchTerm)}
                        </p>
                        <div className="flex items-center space-x-1 text-xs admin-text-light">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{highlightText(application.email, searchTerm)}</span>
                        </div>
                        {application.phone && (
                          <div className="flex items-center space-x-1 text-xs admin-text-light">
                            <Phone className="h-3 w-3" />
                            <span>{application.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Position */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium admin-text">
                        {highlightText(application.job?.title, searchTerm)}
                      </p>
                      <p className="text-xs admin-text-light">
                        {application.job?.department}
                      </p>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={application.status}
                      onChange={(e) =>
                        onStatusChange(application.id, e.target.value)
                      }
                      className={`px-3 py-1 rounded-full text-xs font-medium border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${getStatusColor(application.status)}`}
                    >
                      <option value="Applied">Applied</option>
                      <option value="Reviewing">Reviewing</option>
                      <option value="Interview">Interview</option>
                      <option value="Hired">Hired</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </td>

                  {/* Rating */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderRating(application)}
                  </td>

                  {/* Applied Date */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-1 text-sm admin-text">
                      <Calendar className="h-4 w-4 admin-text-light" />
                      <span>
                        {new Date(application.appliedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </td>

                  {/* Time in Stage */}
                  {trackTimeInStage && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1 text-sm admin-text">
                        <Clock className="h-4 w-4 admin-text-light" />
                        <span>
                          {(() => {
                            // Calculate days from current_stage_entered_at if available, otherwise use time_in_current_stage_seconds
                            if (application.current_stage_entered_at) {
                              const daysSince = Math.floor(
                                (new Date() -
                                  new Date(
                                    application.current_stage_entered_at
                                  )) /
                                  (1000 * 60 * 60 * 24)
                              );
                              return `${daysSince}d`;
                            } else if (
                              application.time_in_current_stage_seconds
                            ) {
                              return `${Math.floor(application.time_in_current_stage_seconds / 86400)}d`;
                            } else {
                              return "0d";
                            }
                          })()}
                        </span>
                      </div>
                    </td>
                  )}

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <QuickActions
                      application={application}
                      onStatusChange={onStatusChange}
                      onEmail={onEmailApplication}
                      onView={() => onViewApplication(application.id)}
                      onArchive={onArchiveApplication}
                      compact={true}
                      showLabels={false}
                    />
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>

        {sortedApplications.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 admin-text-light"
          >
            <User className="h-12 w-12 mx-auto mb-4 admin-text-light" />
            <p>No applications match the current filters</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
