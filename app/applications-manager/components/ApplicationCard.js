"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useThemeClasses } from "../../contexts/AdminThemeContext";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  FileText,
  Download,
  Eye,
  Star,
  Briefcase,
  ArrowRight,
  ChevronDown,
  MoreHorizontal,
  ExternalLink,
} from "lucide-react";

export default function ApplicationCard({ 
  application, 
  onClick,
  onStatusChange,
  onDownloadResume,
  onViewDetails,
  showJob = true,
  compact = false 
}) {
  const { getButtonClasses, getStatCardClasses } = useThemeClasses();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const getStatusClasses = (status) => {
    const statusMap = {
      Applied: "theme-stat-1-bg bg-opacity-20 theme-stat-1",
      Reviewing: "theme-warning-bg bg-opacity-20 theme-warning",
      Interview: "theme-stat-2-bg bg-opacity-20 theme-stat-2",
      Hired: "theme-success-bg bg-opacity-20 theme-success",
      Rejected: "theme-danger-bg bg-opacity-20 theme-danger",
    };
    return statusMap[status] || "admin-card admin-text";
  };

  const statusOptions = [
    "Applied",
    "Reviewing", 
    "Interview",
    "Hired",
    "Rejected"
  ];

  const handleStatusChange = (newStatus) => {
    if (onStatusChange) {
      onStatusChange(application.id, newStatus);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      const days = Math.floor(diffInHours / 24);
      return `${days}d ago`;
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: compact ? 1.02 : 1.01 }}
      className={`admin-card rounded-lg border shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer ${
        compact ? 'p-4' : 'p-6'
      }`}
      onClick={onClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <div className={`${getStatCardClasses(0).bg} rounded-full flex items-center justify-center text-white font-medium ${
            compact ? 'w-10 h-10 text-sm' : 'w-12 h-12 text-lg'
          }`}>
            {application.name?.charAt(0)?.toUpperCase() || 
             application.email?.charAt(0)?.toUpperCase() || 
             'A'}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold admin-text truncate ${compact ? 'text-sm' : 'text-base'}`}>
              {application.name || 'Anonymous Applicant'}
            </h3>
            {showJob && application.job && (
              <p className={`admin-text-light truncate flex items-center space-x-1 ${compact ? 'text-xs' : 'text-sm'} mt-1`}>
                <Briefcase className="h-3 w-3 flex-shrink-0" />
                <span>{application.job.title}</span>
              </p>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center space-x-2">
          <motion.span
            whileHover={{ scale: 1.05 }}
            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusClasses(application.status)}`}
          >
            {application.status}
          </motion.span>
          
          {application.is_archived && (
            <span className="px-2 py-1 rounded-full text-xs admin-text-light admin-card bg-opacity-50">
              Archived
            </span>
          )}
        </div>
      </div>

      {/* Contact Information */}
      <div className={`space-y-2 mb-4 ${compact ? 'text-xs' : 'text-sm'}`}>
        <div className="admin-text-light flex items-center space-x-2">
          <Mail className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{application.email}</span>
        </div>
        
        {application.phone && (
          <div className="admin-text-light flex items-center space-x-2">
            <Phone className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{application.phone}</span>
          </div>
        )}

        {application.location && (
          <div className="admin-text-light flex items-center space-x-2">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{application.location}</span>
          </div>
        )}
      </div>

      {/* Application Details */}
      <div className="flex items-center justify-between mb-4">
        <div className="admin-text-light flex items-center space-x-2 text-xs">
          <Calendar className="h-3 w-3" />
          <span>Applied {formatDate(application.appliedAt)}</span>
        </div>
        
        <div className="admin-text-light text-xs">
          {formatTimeAgo(application.appliedAt)}
        </div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ 
          opacity: showActions || isExpanded ? 1 : 0, 
          height: showActions || isExpanded ? 'auto' : 0 
        }}
        className="border-t admin-border pt-3 overflow-hidden"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Status Selector */}
            <select
              value={application.status}
              onChange={(e) => {
                e.stopPropagation();
                handleStatusChange(e.target.value);
              }}
              className={`px-2 py-1 rounded text-xs font-medium admin-border border focus:ring-2 theme-primary-bg focus:ring-opacity-50 ${getStatusClasses(application.status)}`}
              onClick={(e) => e.stopPropagation()}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status} className="admin-text admin-card">
                  {status}
                </option>
              ))}
            </select>

            {/* Resume Download */}
            {application.resumeUrl && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onDownloadResume) onDownloadResume(application);
                }}
                className={`p-2 rounded-md ${getButtonClasses('primary')} opacity-70 hover:opacity-100 text-xs`}
                title="Download Resume"
              >
                <Download className="h-3 w-3" />
              </motion.button>
            )}

            {/* View Details */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                if (onViewDetails) onViewDetails(application);
              }}
              className={`p-2 rounded-md ${getButtonClasses('primary')} opacity-70 hover:opacity-100 text-xs`}
              title="View Details"
            >
              <Eye className="h-3 w-3" />
            </motion.button>
          </div>

          {/* More Actions */}
          <div className="flex items-center space-x-2">
            {application.rating && (
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 theme-warning" fill="currentColor" />
                <span className="text-xs admin-text-light">{application.rating}</span>
              </div>
            )}
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1 rounded-md admin-text-light hover:admin-text transition-colors"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </motion.button>
          </div>
        </div>

        {/* Extended Details */}
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ 
            opacity: isExpanded ? 1 : 0,
            height: isExpanded ? 'auto' : 0
          }}
          className="mt-3 pt-3 border-t admin-border overflow-hidden"
        >
          {application.notes && (
            <div className="mb-3">
              <h4 className="text-xs font-medium admin-text mb-1">Notes:</h4>
              <p className="text-xs admin-text-light">{application.notes}</p>
            </div>
          )}

          {application.skills && (
            <div className="mb-3">
              <h4 className="text-xs font-medium admin-text mb-2">Skills:</h4>
              <div className="flex flex-wrap gap-1">
                {application.skills.split(',').map((skill, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 rounded-full text-xs admin-card admin-text-light bg-opacity-50"
                  >
                    {skill.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {application.experience && (
            <div className="mb-3">
              <h4 className="text-xs font-medium admin-text mb-1">Experience:</h4>
              <p className="text-xs admin-text-light">{application.experience} years</p>
            </div>
          )}

          <div className="flex items-center justify-between text-xs admin-text-light">
            <span>ID: {application.id}</span>
            {application.updatedAt && (
              <span>Updated: {formatDate(application.updatedAt)}</span>
            )}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}