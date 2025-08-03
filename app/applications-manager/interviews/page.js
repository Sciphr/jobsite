"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { useDeleteInterview } from "@/app/hooks/useAdminData";
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Video,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  ExternalLink,
  Users,
  Timer,
  TrendingUp,
  MessageSquare,
  Trash2,
  MoreVertical,
  Edit,
  Copy,
  Send,
  Star,
  CheckCircle2,
  Download,
  Plus,
} from "lucide-react";

import { useRouter } from "next/navigation";

export default function InterviewsPage() {
  const { data: session } = useSession();
  const { getStatCardClasses, getButtonClasses } = useThemeClasses();
  const deleteInterviewMutation = useDeleteInterview();
  const router = useRouter();

  const [interviews, setInterviews] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingInterviewId, setDeletingInterviewId] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [showNotesModal, setShowNotesModal] = useState(null);
  const [interviewNotes, setInterviewNotes] = useState("");
  const [interviewRating, setInterviewRating] = useState(0);
  const [savingNotes, setSavingNotes] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showMyOnly, setShowMyOnly] = useState(false);
  const [timeFilter, setTimeFilter] = useState("all"); // all, today, week, upcoming, past

  // Fetch interviews
  const fetchInterviews = async () => {
    try {
      const params = new URLSearchParams();
      if (showMyOnly) params.set("myOnly", "true");
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);

      const response = await fetch(
        `/api/admin/interviews?${params.toString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setInterviews(data.interviews);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error("Failed to fetch interviews:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, [statusFilter, typeFilter, showMyOnly]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionMenuOpen && !event.target.closest(".relative")) {
        setActionMenuOpen(null);
      }
    };

    if (actionMenuOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [actionMenuOpen]);

  // Close modals when pressing escape
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        if (showNotesModal) {
          setShowNotesModal(null);
          setInterviewNotes("");
          setInterviewRating(0);
        }
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, [showNotesModal]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInterviews();
  };

  const handleDeleteInterview = async (interviewId) => {
    if (
      !confirm(
        "Are you sure you want to delete this interview? This will also remove it from your calendar."
      )
    ) {
      return;
    }

    setDeletingInterviewId(interviewId);

    // Optimistic update - remove from local state immediately
    setInterviews((prevInterviews) =>
      prevInterviews.filter((interview) => interview.id !== interviewId)
    );
    setSummary((prevSummary) => ({
      ...prevSummary,
      total: Math.max(0, (prevSummary.total || 0) - 1),
    }));

    try {
      await deleteInterviewMutation.mutateAsync(interviewId);
    } catch (error) {
      console.error("Failed to delete interview:", error);
      alert("Failed to delete interview. Please try again.");
      // Refresh to restore the correct state
      fetchInterviews();
    } finally {
      setDeletingInterviewId(null);
    }
  };

  const handleCopyMeetingLink = async (interview) => {
    if (!interview.meetingLink) {
      alert("No meeting link available for this interview");
      return;
    }

    try {
      await navigator.clipboard.writeText(interview.meetingLink);
      alert("Meeting link copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy link:", error);
      alert("Failed to copy link. Please try again.");
    }
  };

  const handleSendReminder = async (interviewId) => {
    try {
      const response = await fetch(
        `/api/admin/interviews/${interviewId}/reminder`,
        {
          method: "POST",
        }
      );

      if (response.ok) {
        alert("Reminder email sent successfully!");
        fetchInterviews(); // Refresh to update last_reminder_sent_at
      } else {
        throw new Error("Failed to send reminder");
      }
    } catch (error) {
      console.error("Failed to send reminder:", error);
      alert("Failed to send reminder email. Please try again.");
    }
  };

  const handleMarkCompleted = async (interviewId) => {
    try {
      const response = await fetch(
        `/api/admin/interviews/${interviewId}/complete`,
        {
          method: "PATCH",
        }
      );

      if (response.ok) {
        alert("Interview marked as completed!");
        fetchInterviews(); // Refresh to show updated status
      } else {
        throw new Error("Failed to mark as completed");
      }
    } catch (error) {
      console.error("Failed to mark as completed:", error);
      alert("Failed to mark interview as completed. Please try again.");
    }
  };

  const handleResendInvitation = async (interviewId) => {
    try {
      const response = await fetch(
        `/api/admin/interviews/${interviewId}/resend`,
        {
          method: "POST",
        }
      );

      if (response.ok) {
        alert("Invitation resent successfully!");
        fetchInterviews(); // Refresh to show updated data
      } else {
        throw new Error("Failed to resend invitation");
      }
    } catch (error) {
      console.error("Failed to resend invitation:", error);
      alert("Failed to resend invitation. Please try again.");
    }
  };

  const handleDownloadCalendarEvent = (interview) => {
    const startDate = new Date(interview.scheduledAt);
    const endDate = new Date(startDate.getTime() + interview.duration * 60000);

    const formatDate = (date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//JobSite//Interview Calendar//EN
BEGIN:VEVENT
UID:interview-${interview.id}@jobsite.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${interview.type.charAt(0).toUpperCase() + interview.type.slice(1)} Interview: ${interview.candidateName}
DESCRIPTION:Interview with ${interview.candidateName} for ${interview.jobTitle}\\nDuration: ${interview.duration} minutes\\nType: ${interview.type}${interview.meetingLink ? "\\nMeeting Link: " + interview.meetingLink : ""}
LOCATION:${interview.location || (interview.type === "video" ? "Video Call" : "")}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `interview-${interview.candidateName}-${startDate.toISOString().split("T")[0]}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveNotes = async () => {
    if (!showNotesModal) return;

    setSavingNotes(true);
    try {
      const response = await fetch(
        `/api/admin/interviews/${showNotesModal}/notes`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            notes: interviewNotes,
            rating: interviewRating || null,
          }),
        }
      );

      if (response.ok) {
        alert("Notes saved successfully!");
        setShowNotesModal(null);
        setInterviewNotes("");
        setInterviewRating(0);
        fetchInterviews(); // Refresh to show updated data
      } else {
        throw new Error("Failed to save notes");
      }
    } catch (error) {
      console.error("Failed to save notes:", error);
      alert("Failed to save notes. Please try again.");
    } finally {
      setSavingNotes(false);
    }
  };

  const openNotesModal = (interview) => {
    setShowNotesModal(interview.id);
    setInterviewNotes(interview.interviewNotes || "");
    setInterviewRating(interview.interviewRating || 0);
  };


  // Filter interviews based on search and time filter
  const filteredInterviews = useMemo(() => {
    let filtered = interviews;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (interview) =>
          interview.candidateName
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          interview.candidateEmail
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          interview.jobTitle
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          interview.jobDepartment
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    // Time filter
    if (timeFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      filtered = filtered.filter((interview) => {
        const interviewDate = new Date(interview.scheduledAt);

        switch (timeFilter) {
          case "today":
            return interviewDate.toDateString() === today.toDateString();
          case "week":
            return interviewDate >= now && interviewDate <= weekFromNow;
          case "upcoming":
            return interviewDate > now;
          case "past":
            return interviewDate < now;
          default:
            return true;
        }
      });
    }

    return filtered.sort(
      (a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)
    );
  }, [interviews, searchTerm, timeFilter]);

  const getStatusIcon = (status) => {
    switch (status) {
      case "accepted":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "reschedule_requested":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-600" />;
    }
  };

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

  const getTypeIcon = (type) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />;
      case "phone":
        return <Phone className="h-4 w-4" />;
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
        weekday: "short",
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

  const getTimeUntilInterview = (scheduledAt) => {
    const now = new Date();
    const interviewDate = new Date(scheduledAt);
    const diffMs = interviewDate - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) return "Past";
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays <= 7) return `In ${diffDays} days`;
    return `In ${Math.ceil(diffDays / 7)} weeks`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold admin-text">
            Interview Management
          </h1>
          <p className="admin-text-light mt-2 text-sm md:text-base">
            Manage and track all interview schedules and responses
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push("/applications-manager/interviews/create")}
            className={`flex items-center space-x-2 px-3 py-2 md:px-4 md:py-2 rounded-lg transition-colors duration-200 shadow-sm text-sm ${getButtonClasses("primary")}`}
          >
            <Plus className="h-4 w-4" />
            <span>Create Interview</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`flex items-center space-x-2 px-3 py-2 md:px-4 md:py-2 rounded-lg transition-colors duration-200 shadow-sm text-sm ${getButtonClasses("secondary")} ${refreshing ? "opacity-50" : ""}`}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="admin-card p-4 md:p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg md:text-2xl font-bold admin-text">
                {summary.total || 0}
              </div>
              <div className="text-xs md:text-sm admin-text-light font-medium">
                Total Interviews
              </div>
            </div>
            <div className="p-2 md:p-3 rounded-lg bg-blue-100">
              <Calendar className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="admin-card p-4 md:p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg md:text-2xl font-bold admin-text">
                {summary.upcoming || 0}
              </div>
              <div className="text-xs md:text-sm admin-text-light font-medium">
                Upcoming
              </div>
            </div>
            <div className="p-2 md:p-3 rounded-lg bg-green-100">
              <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="admin-card p-4 md:p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg md:text-2xl font-bold admin-text">
                {summary.accepted || 0}
              </div>
              <div className="text-xs md:text-sm admin-text-light font-medium">
                Confirmed
              </div>
            </div>
            <div className="p-2 md:p-3 rounded-lg bg-emerald-100">
              <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="admin-card p-4 md:p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg md:text-2xl font-bold admin-text">
                {summary.pending || 0}
              </div>
              <div className="text-xs md:text-sm admin-text-light font-medium">
                Pending Response
              </div>
            </div>
            <div className="p-2 md:p-3 rounded-lg bg-yellow-100">
              <Clock className="h-5 w-5 md:h-6 md:w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-card p-4 md:p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4">
          {/* Search */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search interviews..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-600 dark:placeholder-gray-400 admin-text bg-white dark:bg-gray-700 text-sm"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 admin-text bg-white dark:bg-gray-700 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="reschedule_requested">Reschedule Requested</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 admin-text bg-white dark:bg-gray-700 text-sm"
          >
            <option value="all">All Types</option>
            <option value="video">Video</option>
            <option value="phone">Phone</option>
            <option value="in-person">In-Person</option>
          </select>

          {/* Time Filter */}
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 admin-text bg-white dark:bg-gray-700 text-sm"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
          </select>

          {/* My Interviews Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="myOnly"
              checked={showMyOnly}
              onChange={(e) => setShowMyOnly(e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="myOnly" className="text-sm admin-text">
              My interviews only
            </label>
          </div>
        </div>
      </div>

      {/* Interviews List */}
      <div className="space-y-4">
        {filteredInterviews.length === 0 ? (
          <div className="text-center py-12 admin-card rounded-lg shadow">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium admin-text mb-2">
              No interviews found
            </h3>
            <p className="admin-text-light">
              {searchTerm ||
              statusFilter !== "all" ||
              typeFilter !== "all" ||
              timeFilter !== "all"
                ? "Try adjusting your filters to see more results."
                : "No interviews have been scheduled yet."}
            </p>
          </div>
        ) : (
          filteredInterviews.map((interview) => {
            const { date, time } = formatDateTime(interview.scheduledAt);
            const timeUntil = getTimeUntilInterview(interview.scheduledAt);

            return (
              <div
                key={interview.id}
                className="admin-card p-6 rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header Row */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(interview.type)}
                          <h3 className="text-lg font-semibold admin-text">
                            {interview.candidateName} - {interview.jobTitle}
                          </h3>
                        </div>
                        <div
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(interview.status)}`}
                        >
                          {getStatusIcon(interview.status)}
                          <span className="capitalize">
                            {interview.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-sm font-medium px-2 py-1 rounded ${
                            interview.isUpcoming
                              ? "bg-blue-100 text-blue-800"
                              : interview.isPast
                                ? "bg-gray-100 text-gray-600"
                                : "bg-green-100 text-green-800"
                          }`}
                        >
                          {timeUntil}
                        </span>
                        <a
                          href={`/applications-manager/candidate/${interview.applicationId}`}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="View Application"
                        >
                          <ExternalLink className="h-4 w-4 admin-text-light" />
                        </a>

                        {/* Actions Dropdown */}
                        <div className="relative">
                          <button
                            onClick={() =>
                              setActionMenuOpen(
                                actionMenuOpen === interview.id
                                  ? null
                                  : interview.id
                              )
                            }
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="More actions"
                          >
                            <MoreVertical className="h-4 w-4 admin-text-light" />
                          </button>

                          {actionMenuOpen === interview.id && (
                            <div className="absolute right-0 top-10 bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 py-2 min-w-48 z-50">
                              {/* Copy Meeting Link */}
                              {interview.meetingLink && (
                                <button
                                  onClick={() => {
                                    handleCopyMeetingLink(interview);
                                    setActionMenuOpen(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                                >
                                  <Copy className="h-4 w-4" />
                                  <span>Copy Meeting Link</span>
                                </button>
                              )}

                              {/* Send Reminder */}
                              {interview.status === "accepted" &&
                                !interview.isCompleted && (
                                  <button
                                    onClick={() => {
                                      handleSendReminder(interview.id);
                                      setActionMenuOpen(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                                  >
                                    <Send className="h-4 w-4" />
                                    <span>Send Reminder</span>
                                  </button>
                                )}

                              {/* Resend Invitation */}
                              {interview.status === "pending" && (
                                <button
                                  onClick={() => {
                                    handleResendInvitation(interview.id);
                                    setActionMenuOpen(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                                >
                                  <Mail className="h-4 w-4" />
                                  <span>Resend Invitation</span>
                                </button>
                              )}

                              {/* Mark as Completed */}
                              {!interview.isCompleted && interview.isPast && (
                                <button
                                  onClick={() => {
                                    handleMarkCompleted(interview.id);
                                    setActionMenuOpen(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span>Mark as Completed</span>
                                </button>
                              )}

                              {/* Add Notes */}
                              <button
                                onClick={() => {
                                  openNotesModal(interview);
                                  setActionMenuOpen(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                              >
                                <Edit className="h-4 w-4" />
                                <span>
                                  {interview.interviewNotes
                                    ? "Edit Notes"
                                    : "Add Notes"}
                                </span>
                              </button>

                              {/* Download Calendar Event */}
                              <button
                                onClick={() => {
                                  handleDownloadCalendarEvent(interview);
                                  setActionMenuOpen(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                              >
                                <Download className="h-4 w-4" />
                                <span>Download Calendar Event</span>
                              </button>

                              <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>

                              {/* Delete Interview */}
                              <button
                                onClick={() => {
                                  handleDeleteInterview(interview.id);
                                  setActionMenuOpen(null);
                                }}
                                disabled={deletingInterviewId === interview.id}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 hover:text-red-800 flex items-center space-x-2 disabled:opacity-50"
                              >
                                {deletingInterviewId === interview.id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                                <span>Delete Interview</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 admin-text-light" />
                        <div>
                          <div className="text-sm font-medium admin-text">
                            {date}
                          </div>
                          <div className="text-sm admin-text-light">{time}</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Timer className="h-4 w-4 admin-text-light" />
                        <div>
                          <div className="text-sm font-medium admin-text">
                            {interview.duration} min
                          </div>
                          <div className="text-sm admin-text-light capitalize">
                            {interview.type}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 admin-text-light" />
                        <div>
                          <div className="text-sm font-medium admin-text">
                            {interview.candidateEmail}
                          </div>
                          <div className="text-sm admin-text-light">
                            {interview.jobDepartment}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 admin-text-light" />
                        <div>
                          <div className="text-sm font-medium admin-text">
                            {interview.hiringManager.name}
                            {interview.hiringManager.isMe && (
                              <span className="text-purple-600 ml-1">
                                (You)
                              </span>
                            )}
                          </div>
                          <div className="text-sm admin-text-light">
                            Hiring Manager
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Location/Agenda */}
                    {(interview.location || interview.agenda) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        {interview.location && (
                          <div>
                            <div className="text-xs font-medium admin-text-light uppercase tracking-wide mb-1">
                              Location
                            </div>
                            <div className="text-sm admin-text">
                              {interview.location}
                            </div>
                          </div>
                        )}
                        {interview.agenda && (
                          <div>
                            <div className="text-xs font-medium admin-text-light uppercase tracking-wide mb-1">
                              Agenda
                            </div>
                            <div className="text-sm admin-text line-clamp-2">
                              {interview.agenda}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Reschedule Request Alert */}
                    {interview.hasRescheduleRequest && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-800">
                            Reschedule request submitted
                          </span>
                          <span className="text-xs text-yellow-600">
                            {new Date(
                              interview.latestRescheduleRequest.submittedAt
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Expired Token Warning */}
                    {interview.isExpired && interview.status === "pending" && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium text-red-800">
                            Response token has expired
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Interview Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold admin-text">
                Interview Notes & Rating
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {/* Rating */}
              <div>
                <label className="block text-sm font-medium admin-text mb-2">
                  Interview Rating (Optional)
                </label>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setInterviewRating(star)}
                      className="p-1"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= interviewRating
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm admin-text-light">
                    {interviewRating > 0 ? `${interviewRating}/5` : "No rating"}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium admin-text mb-2">
                  Interview Notes
                </label>
                <textarea
                  value={interviewNotes}
                  onChange={(e) => setInterviewNotes(e.target.value)}
                  placeholder="Add notes about the interview, candidate performance, feedback, etc..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text bg-white dark:bg-gray-700"
                  rows={6}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowNotesModal(null);
                  setInterviewNotes("");
                  setInterviewRating(0);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className={`px-4 py-2 rounded-lg transition-colors ${getButtonClasses("primary")} ${
                  savingNotes ? "opacity-50" : ""
                }`}
              >
                {savingNotes ? (
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </div>
                ) : (
                  "Save Notes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
