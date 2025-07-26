// app/applications-manager/components/ApplicationDetailModal.js
"use client";

import { useState, useEffect } from "react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { useApplicationTimeline } from "@/app/hooks/useApplicationTimeline";
import QuickEmailModal from "./QuickEmailModal";
import InterviewSchedulingModal from "./InterviewSchedulingModal";
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  FileText,
  Download,
  Star,
  MessageSquare,
  Send,
  Save,
  AlertCircle,
  Eye,
  ExternalLink,
  Phone as PhoneIcon,
  Video,
  Plus,
  Hash,
  DollarSign,
  Activity,
  Shield,
  RefreshCw,
  Filter,
  ToggleLeft,
  ToggleRight,
  Edit,
  CheckCircle,
  XCircle,
  Trash2,
} from "lucide-react";

export default function ApplicationDetailModal({
  application,
  isOpen,
  onClose,
  onStatusUpdate,
}) {
  const { getButtonClasses } = useThemeClasses();
  const [activeTab, setActiveTab] = useState("overview");
  const [notes, setNotes] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState("");
  const [isSchedulingInterview, setIsSchedulingInterview] = useState(false);
  const [showQuickEmail, setShowQuickEmail] = useState(false);
  const [showInterviewScheduling, setShowInterviewScheduling] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(true);
  const [includeSystemLogs, setIncludeSystemLogs] = useState(true);
  const [interviews, setInterviews] = useState([]);
  const [interviewsLoading, setInterviewsLoading] = useState(false);
  const [deletingInterviewId, setDeletingInterviewId] = useState(null);

  // Use the timeline hook for audit logs and notes
  const {
    timelineItems,
    applicationInfo,
    loading: timelineLoading,
    error: timelineError,
    addNote,
    refetch: refetchTimeline,
  } = useApplicationTimeline(application?.id, {
    includeSystem: includeSystemLogs,
  });

  // Fetch interviews for this application
  const fetchInterviews = async () => {
    if (!application?.id) return;

    setInterviewsLoading(true);
    try {
      const response = await fetch("/api/admin/interviews");
      if (response.ok) {
        const data = await response.json();
        // Filter interviews for this specific application
        const appInterviews = data.interviews.filter(
          (interview) => interview.applicationId === application.id
        );
        setInterviews(appInterviews);
      }
    } catch (error) {
      console.error("Failed to fetch interviews:", error);
    } finally {
      setInterviewsLoading(false);
    }
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && application) {
      setNotes("");
      setRating(3); // Default rating
      setTags(["Remote OK", "Senior Level"]);
      fetchInterviews();
    } else {
      setInterviews([]);
    }
  }, [isOpen, application]);

  if (!isOpen || !application) return null;

  const statusOptions = [
    "Applied",
    "Reviewing",
    "Interview",
    "Hired",
    "Rejected",
  ];

  const getStatusColor = (status) => {
    const colors = {
      Applied: "bg-blue-100 text-blue-800 border-blue-200",
      Reviewing: "bg-yellow-100 text-yellow-800 border-yellow-200",
      Interview: "bg-green-100 text-green-800 border-green-200",
      Hired: "bg-emerald-100 text-emerald-800 border-emerald-200",
      Rejected: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const handleStatusChange = async (newStatus) => {
    if (onStatusUpdate) {
      await onStatusUpdate(application.id, newStatus);
    }
  };

  const handleAddNote = async () => {
    if (!notes.trim()) return;

    try {
      await addNote(notes.trim());
      setNotes("");
      setIsAddingNote(false);
    } catch (error) {
      console.error("Failed to add note:", error);
      // You could add a toast notification here
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags((prev) => [...prev, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  };

  // Helper functions for timeline display
  const getTimelineItemStyle = (type, severity) => {
    const baseClasses = "w-8 h-8 rounded-full flex items-center justify-center";

    if (severity === "error") return `${baseClasses} bg-red-100 text-red-600`;
    if (severity === "warning")
      return `${baseClasses} bg-yellow-100 text-yellow-600`;
    if (severity === "success")
      return `${baseClasses} bg-green-100 text-green-600`;

    switch (type) {
      case "note":
        return `${baseClasses} bg-blue-100 text-blue-600`;
      case "status_change":
        return `${baseClasses} bg-purple-100 text-purple-600`;
      case "email":
        return `${baseClasses} bg-indigo-100 text-indigo-600`;
      case "created":
        return `${baseClasses} bg-green-100 text-green-600`;
      case "updated":
        return `${baseClasses} bg-yellow-100 text-yellow-600`;
      case "deleted":
        return `${baseClasses} bg-red-100 text-red-600`;
      case "login":
        return `${baseClasses} bg-gray-100 text-gray-600`;
      case "viewed":
        return `${baseClasses} bg-cyan-100 text-cyan-600`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-600`;
    }
  };

  const getTimelineIcon = (type, eventType) => {
    switch (type) {
      case "note":
        return <MessageSquare className="h-4 w-4" />;
      case "status_change":
        return <RefreshCw className="h-4 w-4" />;
      case "email":
        return <Mail className="h-4 w-4" />;
      case "created":
        return <Plus className="h-4 w-4" />;
      case "updated":
        return <Edit className="h-4 w-4" />;
      case "deleted":
        return <X className="h-4 w-4" />;
      case "login":
        return <User className="h-4 w-4" />;
      case "viewed":
        return <Eye className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "error":
        return "bg-red-100 text-red-700";
      case "warning":
        return "bg-yellow-100 text-yellow-700";
      case "success":
        return "bg-green-100 text-green-700";
      case "info":
      default:
        return "bg-blue-100 text-blue-700";
    }
  };

  const handleCallCandidate = () => {
    if (application.phone) {
      // Use tel: protocol to trigger phone call
      window.location.href = `tel:${application.phone}`;
    } else {
      alert("No phone number available for this candidate");
    }
  };

  const handleSendEmail = () => {
    setShowQuickEmail(true);
  };

  const handleEmailSent = () => {
    // Optionally add a success message or update application status
    console.log("Email sent successfully!");
  };

  const handleScheduleInterview = () => {
    setShowInterviewScheduling(true);
  };

  const handleInterviewScheduled = () => {
    // Refresh the interviews list to show the newly scheduled interview
    fetchInterviews();
    console.log("Interview scheduled successfully!");
  };

  const handleViewResume = async (application) => {
    if (!application.resumeUrl) {
      console.error("No resume URL found for this application");
      return;
    }

    try {
      const response = await fetch(
        `/api/resume-download?path=${encodeURIComponent(application.resumeUrl)}`
      );

      if (!response.ok) {
        throw new Error("Failed to get resume URL");
      }

      const data = await response.json();
      window.open(data.downloadUrl, "_blank");
    } catch (error) {
      console.error("Error viewing resume:", error);
    }
  };

  const handleDeleteInterview = async (interviewId) => {
    if (!window.confirm("Are you sure you want to delete this interview? This will also remove it from Google Calendar if it exists.")) {
      return;
    }

    setDeletingInterviewId(interviewId);

    try {
      const response = await fetch(`/api/admin/interviews/${interviewId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Delete response error:', response.status, errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to delete interview`);
      }

      // Remove from local state
      setInterviews(prevInterviews => 
        prevInterviews.filter(interview => interview.id !== interviewId)
      );

      console.log("Interview deleted successfully!");
    } catch (error) {
      console.error('Error deleting interview:', error);
      alert(`Failed to delete interview: ${error.message}`);
    } finally {
      setDeletingInterviewId(null);
    }
  };

  const formatSalary = (min, max, currency) => {
    if (!min && !max) return "Not specified";
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "CAD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    if (min && max) {
      return `${formatter.format(min)} - ${formatter.format(max)}`;
    }
    return formatter.format(min || max);
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: User },
    { id: "timeline", label: "Timeline", icon: Clock },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "interview", label: "Interview", icon: Video },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                <User className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  {application.name || "Anonymous Applicant"}
                </h2>
                <p className="text-blue-100">{application.job?.title}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div
                className={`px-3 py-1 rounded-full border ${getStatusColor(application.status)}`}
              >
                {application.status}
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Sidebar */}
          <div className="w-80 border-r border-gray-200 bg-gray-50">
            {/* Quick Actions */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={handleSendEmail}
                  className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm ${getButtonClasses("primary")}`}
                >
                  <Send className="h-4 w-4" />
                  <span>Send Email</span>
                </button>
                <button
                  onClick={handleScheduleInterview}
                  className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                >
                  <Video className="h-4 w-4" />
                  <span>Schedule Interview</span>
                </button>
                <button
                  onClick={handleCallCandidate}
                  disabled={!application.phone}
                  className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    application.phone
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : "bg-gray-50 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <PhoneIcon className="h-4 w-4" />
                  <span>Call Candidate</span>
                </button>
              </div>
            </div>

            {/* Status Update */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Update Status
              </h3>
              <select
                value={application.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Rating
              </h3>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1"
                  >
                    <Star
                      className={`h-5 w-5 ${
                        star <= rating
                          ? "text-yellow-400 fill-current"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-600">({rating}/5)</span>
              </div>
            </div>

            {/* Tags */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                  >
                    <Hash className="h-3 w-3 mr-1" />
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-blue-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addTag()}
                  placeholder="Add tag..."
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={addTag}
                  className="p-1 text-blue-600 hover:text-blue-800"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Key Info */}
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Key Information
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Applied{" "}
                    {new Date(application.appliedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>3 days in pipeline</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{application.job?.location}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <DollarSign className="h-4 w-4" />
                  <span>
                    {formatSalary(
                      application.job?.salaryMin,
                      application.job?.salaryMax,
                      application.job?.salaryCurrency
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Tabs */}
            <div className="border-b border-gray-200 bg-white">
              <nav className="flex space-x-8 px-6">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab.id
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Contact Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <Mail className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="font-medium">{application.email}</p>
                        </div>
                      </div>
                      {application.phone && (
                        <div className="flex items-center space-x-3">
                          <Phone className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-600">Phone</p>
                            <p className="font-medium">{application.phone}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cover Letter */}
                  {application.coverLetter && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-4">
                        Cover Letter
                      </h3>
                      <div className="prose max-w-none">
                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {application.coverLetter}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Job Details */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">
                      Position Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Department</p>
                        <p className="font-medium">
                          {application.job?.department}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Employment Type</p>
                        <p className="font-medium">
                          {application.job?.employmentType}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Experience Level
                        </p>
                        <p className="font-medium">
                          {application.job?.experienceLevel}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Remote Policy</p>
                        <p className="font-medium">
                          {application.job?.remotePolicy}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "timeline" && (
                <div className="space-y-4">
                  {/* Timeline Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      Application Timeline
                    </h3>
                    <div className="flex items-center space-x-3">
                      {/* Filter Controls */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowAuditLogs(!showAuditLogs)}
                          className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                            showAuditLogs
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          <Shield className="h-3 w-3" />
                          <span>Audit</span>
                        </button>

                        <button
                          onClick={() =>
                            setIncludeSystemLogs(!includeSystemLogs)
                          }
                          className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                            includeSystemLogs
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {includeSystemLogs ? (
                            <ToggleRight className="h-3 w-3" />
                          ) : (
                            <ToggleLeft className="h-3 w-3" />
                          )}
                          <span>System</span>
                        </button>

                        <button
                          onClick={refetchTimeline}
                          disabled={timelineLoading}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Refresh timeline"
                        >
                          <RefreshCw
                            className={`h-4 w-4 ${timelineLoading ? "animate-spin" : ""}`}
                          />
                        </button>
                      </div>

                      <button
                        onClick={() => setIsAddingNote(!isAddingNote)}
                        className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm ${getButtonClasses("secondary")}`}
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Note</span>
                      </button>
                    </div>
                  </div>

                  {/* Add Note Panel */}
                  {isAddingNote && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add a note about this candidate..."
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        rows={3}
                      />
                      <div className="flex items-center justify-end space-x-2 mt-3">
                        <button
                          onClick={() => setIsAddingNote(false)}
                          className="px-3 py-1 text-gray-600 hover:text-gray-800 text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddNote}
                          className={`flex items-center space-x-1 px-3 py-1 rounded text-sm ${getButtonClasses("primary")}`}
                        >
                          <Save className="h-4 w-4" />
                          <span>Save Note</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Timeline Loading State */}
                  {timelineLoading && (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="ml-2 text-gray-600">
                        Loading timeline...
                      </span>
                    </div>
                  )}

                  {/* Timeline Error State */}
                  {timelineError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <span className="text-red-700 font-medium">
                          Error loading timeline
                        </span>
                      </div>
                      <p className="text-red-600 text-sm mt-1">
                        {timelineError}
                      </p>
                    </div>
                  )}

                  {/* Timeline Items */}
                  {!timelineLoading && !timelineError && (
                    <div className="space-y-4">
                      {timelineItems.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                          <p>No timeline events yet</p>
                          <p className="text-sm">Add a note to get started</p>
                        </div>
                      ) : (
                        timelineItems
                          .filter(
                            (item) => showAuditLogs || item.type === "note"
                          )
                          .map((item) => (
                            <div
                              key={`${item.type}-${item.id}`}
                              className="flex space-x-4"
                            >
                              <div className="flex-shrink-0">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center ${getTimelineItemStyle(
                                    item.type,
                                    item.severity
                                  )}`}
                                >
                                  {getTimelineIcon(item.type, item.eventType)}
                                </div>
                              </div>
                              <div className="flex-1 bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium text-sm">
                                      {item.author}
                                    </span>
                                    {item.isSystemGenerated && (
                                      <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
                                        System
                                      </span>
                                    )}
                                    {item.severity &&
                                      item.severity !== "info" && (
                                        <span
                                          className={`px-1.5 py-0.5 text-xs rounded ${getSeverityColor(item.severity)}`}
                                        >
                                          {item.severity}
                                        </span>
                                      )}
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {new Date(item.timestamp).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-gray-700 text-sm">
                                  {item.content}
                                </p>

                                {/* Additional audit info */}
                                {item.eventType && item.type !== "note" && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                      {item.eventType}
                                    </span>
                                    {item.category && (
                                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                                        {item.category}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Status change indicator */}
                                {item.newValues?.status && (
                                  <span
                                    className={`inline-block mt-2 px-2 py-1 rounded-full text-xs ${getStatusColor(item.newValues.status)}`}
                                  >
                                    Status: {item.newValues.status}
                                  </span>
                                )}

                                {/* Changes details */}
                                {item.changes &&
                                  Object.keys(item.changes).length > 0 && (
                                    <div className="mt-2 text-xs text-gray-600">
                                      <details className="cursor-pointer">
                                        <summary className="hover:text-gray-800">
                                          View changes
                                        </summary>
                                        <div className="mt-1 pl-2 border-l-2 border-gray-200">
                                          {Object.entries(item.changes).map(
                                            ([key, change]) => (
                                              <div key={key} className="mb-1">
                                                <span className="font-medium">
                                                  {key}:
                                                </span>
                                                <span className="text-red-600">
                                                  {" "}
                                                  {change.from}
                                                </span>{" "}
                                                →
                                                <span className="text-green-600">
                                                  {" "}
                                                  {change.to}
                                                </span>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </details>
                                    </div>
                                  )}
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "documents" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Documents & Files</h3>

                  {/* Resume */}
                  {application.resumeUrl && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                            <FileText className="h-5 w-5 text-red-600" />
                          </div>
                          <div>
                            <p className="font-medium">Resume</p>
                            <p className="text-sm text-gray-600">
                              PDF Document
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewResume(application)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            title="View resume"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Additional Documents Placeholder */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">
                      No additional documents
                    </p>
                    <p className="text-sm text-gray-500">
                      Cover letters, portfolios, and references will appear here
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "interview" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      Interview Management
                    </h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={fetchInterviews}
                        disabled={interviewsLoading}
                        className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                        title="Refresh interviews"
                      >
                        <RefreshCw className={`h-4 w-4 ${interviewsLoading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                      </button>
                      <button
                        onClick={handleScheduleInterview}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${getButtonClasses("primary")}`}
                      >
                        <Video className="h-4 w-4" />
                        <span>Schedule Interview</span>
                      </button>
                    </div>
                  </div>

                  {/* Interview Content */}
                  {interviewsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : interviews.length > 0 ? (
                    <div className="space-y-4">
                      {interviews.map((interview) => {
                        const getStatusColor = (status) => {
                          switch (status) {
                            case "accepted":
                              return "bg-green-100 text-green-800 border-green-200";
                            case "reschedule_requested":
                              return "bg-yellow-100 text-yellow-800 border-yellow-200";
                            case "pending":
                              return "bg-blue-100 text-blue-800 border-blue-200";
                            default:
                              return "bg-gray-100 text-gray-800 border-gray-200";
                          }
                        };

                        const getStatusIcon = (status) => {
                          switch (status) {
                            case "accepted":
                              return (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              );
                            case "reschedule_requested":
                              return (
                                <AlertCircle className="h-4 w-4 text-yellow-600" />
                              );
                            case "pending":
                              return (
                                <Clock className="h-4 w-4 text-blue-600" />
                              );
                            default:
                              return (
                                <XCircle className="h-4 w-4 text-gray-600" />
                              );
                          }
                        };

                        const getTypeIcon = (type) => {
                          switch (type) {
                            case "video":
                              return <Video className="h-4 w-4" />;
                            case "phone":
                              return <PhoneIcon className="h-4 w-4" />;
                            case "in-person":
                              return <MapPin className="h-4 w-4" />;
                            default:
                              return <Calendar className="h-4 w-4" />;
                          }
                        };

                        const formatDateTime = (dateString) => {
                          const date = new Date(dateString);
                          return {
                            date: date.toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }),
                            time: date.toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            }),
                          };
                        };

                        const { date, time } = formatDateTime(
                          interview.scheduledAt
                        );
                        const isUpcoming =
                          new Date(interview.scheduledAt) > new Date();
                        const isPast =
                          new Date(interview.scheduledAt) < new Date();

                        return (
                          <div
                            key={interview.id}
                            className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                {getTypeIcon(interview.type)}
                                <div>
                                  <h4 className="font-medium text-gray-900 capitalize">
                                    {interview.type} Interview
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    {date} at {time}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <div
                                  className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(interview.status)}`}
                                >
                                  {getStatusIcon(interview.status)}
                                  <span className="capitalize">
                                    {interview.status.replace("_", " ")}
                                  </span>
                                </div>
                                <span
                                  className={`text-xs font-medium px-2 py-1 rounded ${
                                    isUpcoming
                                      ? "bg-blue-100 text-blue-800"
                                      : isPast
                                        ? "bg-gray-100 text-gray-600"
                                        : "bg-green-100 text-green-800"
                                  }`}
                                >
                                  {isUpcoming
                                    ? "Upcoming"
                                    : isPast
                                      ? "Past"
                                      : "Today"}
                                </span>
                                <button
                                  onClick={() => handleDeleteInterview(interview.id)}
                                  disabled={deletingInterviewId === interview.id}
                                  className={`p-1.5 rounded-md transition-colors ${
                                    deletingInterviewId === interview.id
                                      ? "text-gray-300 cursor-not-allowed"
                                      : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                                  }`}
                                  title={deletingInterviewId === interview.id ? "Deleting..." : "Delete interview"}
                                >
                                  {deletingInterviewId === interview.id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">
                                  Duration:
                                </span>
                                <span className="ml-2 text-gray-600">
                                  {interview.duration} minutes
                                </span>
                              </div>
                              {interview.location && (
                                <div>
                                  <span className="font-medium text-gray-700">
                                    Location:
                                  </span>
                                  <span className="ml-2 text-gray-600">
                                    {interview.location}
                                  </span>
                                </div>
                              )}
                              {interview.type === 'video' && interview.meetingLink && (
                                <div>
                                  <span className="font-medium text-gray-700">
                                    Meeting Link:
                                  </span>
                                  <a
                                    href={interview.meetingLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-2 text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center space-x-1"
                                  >
                                    <span>
                                      {interview.meetingProvider === 'zoom' ? 'Join Zoom Meeting' :
                                       interview.meetingProvider === 'google' ? 'Join Google Meet' :
                                       'Join Meeting'}
                                    </span>
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              )}
                              {interview.respondedAt && (
                                <div>
                                  <span className="font-medium text-gray-700">
                                    Responded:
                                  </span>
                                  <span className="ml-2 text-gray-600">
                                    {new Date(
                                      interview.respondedAt
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                              <div>
                                <span className="font-medium text-gray-700">
                                  Token Expires:
                                </span>
                                <span className="ml-2 text-gray-600">
                                  {new Date(
                                    interview.expiresAt
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            {interview.agenda && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="text-sm">
                                  <span className="font-medium text-gray-700">
                                    Agenda:
                                  </span>
                                  <p className="mt-1 text-gray-600">
                                    {interview.agenda}
                                  </p>
                                </div>
                              </div>
                            )}

                            {interview.hasRescheduleRequest && (
                              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                                <div className="flex items-center space-x-2">
                                  <MessageSquare className="h-4 w-4 text-yellow-600" />
                                  <span className="text-sm font-medium text-yellow-800">
                                    Reschedule request submitted
                                  </span>
                                  <span className="text-xs text-yellow-600">
                                    {new Date(
                                      interview.latestRescheduleRequest?.submittedAt
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            )}

                            {interview.status === "pending" &&
                              new Date() > new Date(interview.expiresAt) && (
                                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                                  <div className="flex items-center space-x-2">
                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                    <span className="text-sm font-medium text-red-800">
                                      Response token has expired
                                    </span>
                                  </div>
                                </div>
                              )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">
                        No interviews scheduled
                      </p>
                      <p className="text-sm text-gray-500 mb-4">
                        Schedule phone, video, or in-person interviews
                      </p>
                      <div className="flex items-center justify-center space-x-3">
                        <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                          <PhoneIcon className="h-4 w-4" />
                          <span>Phone Call</span>
                        </button>
                        <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                          <Video className="h-4 w-4" />
                          <span>Video Call</span>
                        </button>
                        <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                          <MapPin className="h-4 w-4" />
                          <span>In Person</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Email Modal */}
      <QuickEmailModal
        application={application}
        isOpen={showQuickEmail}
        onClose={() => setShowQuickEmail(false)}
        onSent={handleEmailSent}
      />

      {/* Interview Scheduling Modal */}
      <InterviewSchedulingModal
        application={application}
        isOpen={showInterviewScheduling}
        onClose={() => setShowInterviewScheduling(false)}
        onScheduled={handleInterviewScheduled}
      />
    </div>
  );
}
