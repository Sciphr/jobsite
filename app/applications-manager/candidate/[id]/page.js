// app/applications-manager/candidate/[id]/page.js
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { useApplicationTimeline } from "@/app/hooks/useApplicationTimeline";
import {
  useApplications,
  useUpdateApplicationStatus,
  useDeleteInterview,
} from "@/app/hooks/useAdminData";
import QuickEmailModal from "../../components/QuickEmailModal";
import {
  ArrowLeft,
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
  ToggleLeft,
  ToggleRight,
  Edit,
  CheckCircle,
  XCircle,
  Trash2,
  Home,
  ChevronRight,
} from "lucide-react";

export default function CandidateDetailsPage() {
  const { id: applicationId } = useParams();
  const router = useRouter();
  const { getButtonClasses } = useThemeClasses();
  const [activeTab, setActiveTab] = useState("overview");
  const [notes, setNotes] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState("");
  const [showQuickEmail, setShowQuickEmail] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(true);
  const [includeSystemLogs, setIncludeSystemLogs] = useState(true);
  const [interviews, setInterviews] = useState([]);
  const [interviewsLoading, setInterviewsLoading] = useState(false);
  const [deletingInterviewId, setDeletingInterviewId] = useState(null);

  // Get application data and mutations
  const { data: allApplications = [], isLoading: applicationsLoading } =
    useApplications();
  const application = allApplications.find((app) => app.id === applicationId);
  const updateApplicationMutation = useUpdateApplicationStatus();
  const deleteInterviewMutation = useDeleteInterview();

  // Use the timeline hook for audit logs and notes
  const {
    timelineItems,
    applicationInfo,
    loading: timelineLoading,
    error: timelineError,
    addNote,
    refetch: refetchTimeline,
  } = useApplicationTimeline(applicationId, {
    includeSystem: includeSystemLogs,
  });

  // Fetch interviews for this application
  const fetchInterviews = async () => {
    if (!applicationId) return;

    setInterviewsLoading(true);
    try {
      const response = await fetch("/api/admin/interviews");
      if (response.ok) {
        const data = await response.json();
        const appInterviews = data.interviews.filter(
          (interview) => interview.applicationId === applicationId
        );
        setInterviews(appInterviews);
      }
    } catch (error) {
      console.error("Failed to fetch interviews:", error);
    } finally {
      setInterviewsLoading(false);
    }
  };

  // Initialize state when component mounts
  useEffect(() => {
    if (applicationId) {
      setRating(3); // Default rating
      setTags(["Remote OK", "Senior Level"]);
      fetchInterviews();
    }
  }, [applicationId]);

  if (applicationsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="h-32 bg-gray-200 rounded mb-6"></div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Application Not Found
        </h3>
        <p className="text-gray-500 mb-4">
          The application you're looking for doesn't exist or has been removed.
        </p>
        <button
          onClick={() => router.push("/applications-manager")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${getButtonClasses("primary")}`}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Overview</span>
        </button>
      </div>
    );
  }

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
    updateApplicationMutation.mutate({
      applicationId,
      status: newStatus,
    });
  };

  const handleDeleteInterview = async (interviewId) => {
    if (!confirm("Are you sure you want to delete this interview? This will also remove it from your calendar.")) {
      return;
    }

    setDeletingInterviewId(interviewId);
    try {
      await deleteInterviewMutation.mutateAsync(interviewId);
      // Refresh interviews list
      fetchInterviews();
    } catch (error) {
      console.error("Failed to delete interview:", error);
      alert("Failed to delete interview. Please try again.");
    } finally {
      setDeletingInterviewId(null);
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
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <button
          onClick={() => router.push("/applications-manager")}
          className="hover:text-gray-900 flex items-center space-x-1"
        >
          <Home className="h-4 w-4" />
          <span>Overview</span>
        </button>
        <ChevronRight className="h-4 w-4" />
        <button
          onClick={() =>
            router.push(`/applications-manager/jobs/${application.jobId}`)
          }
          className="hover:text-gray-900"
        >
          {application.job?.title}
        </button>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">
          {application.name || "Anonymous Applicant"}
        </span>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg overflow-hidden text-white">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                <User className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  {application.name || "Anonymous Applicant"}
                </h1>
                <p className="text-blue-100">{application.job?.title}</p>
                <p className="text-blue-200 text-sm">
                  {application.job?.department}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div
                className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(application.status)}`}
              >
                {application.status}
              </div>
              <button
                onClick={() => router.back()}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg border-2 border-white border-opacity-30 bg-white bg-opacity-15 hover:bg-opacity-25 hover:border-opacity-70 hover:shadow-lg hover:scale-105 transition-all duration-300 text-gray-800 font-medium backdrop-blur-md shadow-md"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => setShowQuickEmail(true)}
                className={`w-full flex items-center space-x-2 px-4 py-2 rounded-lg text-sm ${getButtonClasses("primary")}`}
              >
                <Send className="h-4 w-4" />
                <span>Send Email</span>
              </button>
              <button
                onClick={() => router.push(`/applications-manager/candidate/${applicationId}/schedule-interview`)}
                className="w-full flex items-center space-x-2 px-4 py-2 rounded-lg text-sm bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
              >
                <Video className="h-4 w-4" />
                <span>Schedule Interview</span>
              </button>
              <button
                onClick={() => {
                  if (application.phone) {
                    window.location.href = `tel:${application.phone}`;
                  } else {
                    alert("No phone number available for this candidate");
                  }
                }}
                disabled={!application.phone}
                className={`w-full flex items-center space-x-2 px-4 py-2 rounded-lg text-sm transition-colors ${
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
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Update Status
            </h3>
            <select
              value={application.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Rating */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating</h3>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1"
                >
                  <Star
                    className={`h-6 w-6 ${
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

          {/* Key Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Key Information
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-2 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>
                  Applied {new Date(application.appliedAt).toLocaleDateString()}
                </span>
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
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Tabs */}
            <div className="border-b border-gray-200">
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
            <div className="p-6">
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Contact Information */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div className="bg-gray-50 rounded-lg p-6">
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
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">
                      Position Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        timelineItems.map((item) => (
                          <div
                            key={`${item.type}-${item.id}`}
                            className="flex space-x-4"
                          >
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <MessageSquare className="h-4 w-4 text-blue-600" />
                              </div>
                            </div>
                            <div className="flex-1 bg-gray-50 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">
                                  {item.author}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(item.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-gray-700 text-sm">
                                {item.content}
                              </p>
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
                            onClick={async () => {
                              try {
                                const response = await fetch(
                                  `/api/resume-download?path=${encodeURIComponent(application.resumeUrl)}`
                                );
                                if (response.ok) {
                                  const data = await response.json();
                                  window.open(data.downloadUrl, "_blank");
                                }
                              } catch (error) {
                                console.error("Error viewing resume:", error);
                              }
                            }}
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
                    <button
                      onClick={() => router.push(`/applications-manager/candidate/${applicationId}/schedule-interview`)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${getButtonClasses("primary")}`}
                    >
                      <Video className="h-4 w-4" />
                      <span>Schedule Interview</span>
                    </button>
                  </div>

                  {/* Interview Content */}
                  {interviewsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : interviews.length > 0 ? (
                    <div className="space-y-4">
                      {interviews.map((interview) => (
                        <div
                          key={interview.id}
                          className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <Video className="h-5 w-5" />
                              <div>
                                <h4 className="font-medium text-gray-900 capitalize">
                                  {interview.type} Interview
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {new Date(
                                    interview.scheduledAt
                                  ).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  interview.status === "accepted"
                                    ? "bg-green-100 text-green-800"
                                    : interview.status === "pending"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {interview.status}
                              </span>
                              <button
                                onClick={() => handleDeleteInterview(interview.id)}
                                disabled={deletingInterviewId === interview.id}
                                className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                title="Delete interview"
                              >
                                {deletingInterviewId === interview.id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="text-sm text-gray-600">
                              Duration: {interview.duration} minutes
                            </div>
                            
                            {/* Meeting Link */}
                            {interview.meetingLink && (
                              <div className="flex items-center space-x-2 text-sm">
                                <ExternalLink className="h-4 w-4 text-blue-600" />
                                <a
                                  href={interview.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline"
                                >
                                  Join Meeting
                                </a>
                              </div>
                            )}
                            
                            {/* Interview Rating */}
                            {interview.interviewRating && (
                              <div className="flex items-center space-x-2">
                                <Star className="h-4 w-4 text-yellow-500" />
                                <span className="text-sm font-medium text-gray-900">
                                  Rating: {interview.interviewRating}/5
                                </span>
                                <div className="flex space-x-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`h-3 w-3 ${
                                        star <= interview.interviewRating
                                          ? "text-yellow-400 fill-current"
                                          : "text-gray-300"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Interview Notes */}
                            {interview.interviewNotes && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div className="flex items-start space-x-2">
                                  <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <h5 className="text-sm font-medium text-blue-900 mb-1">
                                      Interview Notes
                                    </h5>
                                    <p className="text-sm text-blue-800 whitespace-pre-wrap">
                                      {interview.interviewNotes}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Agenda if available */}
                            {interview.agenda && (
                              <div className="bg-gray-100 border border-gray-200 rounded-lg p-3">
                                <div className="flex items-start space-x-2">
                                  <FileText className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <h5 className="text-sm font-medium text-gray-900 mb-1">
                                      Interview Agenda
                                    </h5>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                      {interview.agenda}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
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
        onSent={() => console.log("Email sent!")}
      />

    </div>
  );
}
