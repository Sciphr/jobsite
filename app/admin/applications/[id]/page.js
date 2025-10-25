"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { ResourcePermissionGuard } from "@/app/components/guards/PagePermissionGuard";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { useRequireNotesOnRejection } from "@/app/hooks/useRequireNotesOnRejection";
import { useRequireInterviewFeedback } from "@/app/hooks/useRequireInterviewFeedback";
import RejectionNotesModal from "../../../applications-manager/components/RejectionNotesModal";
import InterviewFeedbackModal from "../../../applications-manager/components/InterviewFeedbackModal";
import HireApprovalStatusModal from "../../../components/HireApprovalStatusModal";
import { useHireApprovalStatus, getHireApprovalForApplication } from "@/app/hooks/useHireApprovalStatus";
import HireApprovalIndicator from "../../../components/HireApprovalIndicator";
import {
  FileText,
  Download,
  Mail,
  Phone,
  Calendar,
  User,
  Briefcase,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  X,
  FileCheck,
  Star,
  Clock,
} from "lucide-react";
import {
  generateInterviewInvitationEmail,
  generateRejectionEmail,
  generateDocumentRequestEmail,
  getApplicantDisplayName,
  getJobTitle,
} from "../../../utils/quickActionEmailTemplates";
import ScreeningAnswers from "../../../components/ScreeningAnswers";

function ApplicationDetailsContent() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getButtonClasses } = useThemeClasses();
  const applicationId = params.id;

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [interviewFeedback, setInterviewFeedback] = useState([]);
  const [scheduledInterviews, setScheduledInterviews] = useState([]);
  const [hireApprovalModal, setHireApprovalModal] = useState({
    isOpen: false,
    type: null,
    message: null,
    hireRequestId: null,
    existingRequestId: null,
  });

  // Get hire approval status for this application
  const { hireApprovalStatus } = useHireApprovalStatus(application ? [application.id] : []);
  const currentHireStatus = application ? getHireApprovalForApplication(hireApprovalStatus, application.id) : null;

  // Notes on rejection functionality
  const {
    isNotesModalOpen,
    pendingStatusChange,
    handleStatusChangeWithNotesCheck,
    completeStatusChangeWithNotes,
    cancelStatusChange,
  } = useRequireNotesOnRejection();

  // Interview feedback functionality
  const {
    isFeedbackModalOpen,
    pendingStatusChange: pendingFeedbackChange,
    interviewsWithoutFeedback,
    handleStatusChangeWithFeedbackCheck,
    completeStatusChangeWithFeedback,
    cancelStatusChange: cancelFeedbackChange,
  } = useRequireInterviewFeedback();

  useEffect(() => {
    const fetchApplicationDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/admin/applications/${applicationId}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            setError("Application not found");
          } else {
            const errorData = await response.json();
            setError(errorData.message || "Failed to load application");
          }
          return;
        }

        const data = await response.json();
        setApplication(data);

        // Fetch interview feedback
        try {
          const feedbackResponse = await fetch(`/api/admin/interview-feedback?applicationId=${applicationId}`);
          if (feedbackResponse.ok) {
            const feedbackData = await feedbackResponse.json();
            setInterviewFeedback(feedbackData.feedback || []);
          }
        } catch (feedbackError) {
          console.error("Error fetching interview feedback:", feedbackError);
          // Don't fail the whole page if feedback fetch fails
        }

        // Fetch scheduled interviews
        try {
          const interviewsResponse = await fetch(`/api/admin/interviews?applicationId=${applicationId}`);
          if (interviewsResponse.ok) {
            const interviewsData = await interviewsResponse.json();
            setScheduledInterviews(interviewsData.interviews || []);
          }
        } catch (interviewsError) {
          console.error("Error fetching interviews:", interviewsError);
          // Don't fail the whole page if interviews fetch fails
        }
      } catch (err) {
        console.error("Error fetching application:", err);
        setError("An error occurred while loading the application");
      } finally {
        setLoading(false);
      }
    };

    if (applicationId) {
      fetchApplicationDetails();
    }
  }, [applicationId]);

  const updateApplicationStatus = async (newStatus) => {
    if (!application) return;

    // First check for interview feedback requirements
    const feedbackResult = await handleStatusChangeWithFeedbackCheck(
      applicationId,
      newStatus,
      application.status,
      async (id, status) => {
        try {
          setUpdating(true);
          const response = await fetch(`/api/admin/applications/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          });

          if (response.ok) {
            const updatedData = await response.json();
            
            // Check if this was a hire approval request
            if (updatedData.requiresApproval) {
              setHireApprovalModal({
                isOpen: true,
                type: 'success',
                message: updatedData.message,
                hireRequestId: updatedData.hireRequestId,
                existingRequestId: null,
              });
              // Invalidate hire approval status to show the new pending request
              queryClient.invalidateQueries(['hire-approval-status']);
              // Don't update application state since status didn't actually change
              return { statusUnchanged: true };
            }
            
            setApplication(updatedData);
            return updatedData;
          } else {
            const errorData = await response.json();
            
            // Check if it's an interview feedback requirement
            if (errorData.requiresInterviewFeedback) {
              return errorData; // Let the feedback hook handle this
            }
            
            // Check if it's a hire approval conflict
            if (response.status === 409 && errorData.alreadyPending) {
              setHireApprovalModal({
                isOpen: true,
                type: 'already-pending',
                message: errorData.message,
                hireRequestId: null,
                existingRequestId: errorData.existingRequestId,
              });
              return { statusUnchanged: true };
            }
            
            alert(`Error updating status: ${errorData.message}`);
            throw new Error(errorData.message);
          }
        } catch (error) {
          console.error("Error updating status:", error);
          alert("An error occurred while updating the application status");
          throw error;
        } finally {
          setUpdating(false);
        }
      }
    );

    // If feedback was blocked, don't proceed to rejection notes check
    if (feedbackResult === false) {
      return; // Interview feedback modal will handle this
    }

    // Then check for rejection notes requirements
    const result = await handleStatusChangeWithNotesCheck(
      applicationId,
      newStatus,
      application.status,
      application.notes,
      async (id, status) => {
        try {
          setUpdating(true);
          const response = await fetch(`/api/admin/applications/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          });

          if (response.ok) {
            const updatedData = await response.json();
            setApplication(updatedData);
            return updatedData;
          } else {
            const errorData = await response.json();
            alert(`Error updating status: ${errorData.message}`);
            throw new Error(errorData.message);
          }
        } catch (error) {
          console.error("Error updating status:", error);
          alert("An error occurred while updating the application status");
          throw error;
        } finally {
          setUpdating(false);
        }
      }
    );

    // If result contains updated application data, update the local state
    if (result && typeof result === 'object' && result.id) {
      setApplication(result);
    }
  };

  const handleEmailAction = async (emailType) => {
    if (!application) return;

    const applicantName = getApplicantDisplayName(application);
    const jobTitle = getJobTitle(application);

    // Fetch company name from settings
    let companyName = "your company"; // fallback
    try {
      const response = await fetch("/api/settings/public?key=site_name");
      if (response.ok) {
        const data = await response.json();
        companyName = data.value || companyName;
      }
    } catch (error) {
      console.warn("Could not fetch company name, using fallback:", error);
    }

    let emailData;

    switch (emailType) {
      case "interview":
        emailData = generateInterviewInvitationEmail(
          applicantName,
          jobTitle,
          companyName
        );
        break;
      case "rejection":
        emailData = generateRejectionEmail(
          applicantName,
          jobTitle,
          companyName
        );
        break;
      case "documents":
        emailData = generateDocumentRequestEmail(
          applicantName,
          jobTitle,
          companyName
        );
        break;
      default:
        return;
    }

    // Open mailto link in new tab/window
    window.open(emailData.mailtoUrl, "_blank");
  };

  const downloadResume = async (storagePath, applicantName) => {
    if (!storagePath) {
      alert("No resume file path found");
      return;
    }

    try {
      const apiUrl = `/api/resume-download?path=${encodeURIComponent(storagePath)}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API Error: ${errorData.error}`);
      }

      // The response is now the file itself, not JSON with URL
      const blob = await response.blob();

      // Create download link
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${applicantName || "applicant"}_resume.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download error:", error);
      alert(`Failed to download resume: ${error.message}`);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      Applied: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      Reviewing:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      Interview:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      Hired:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
      Rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return (
      colors[status] ||
      "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    );
  };

  const statusOptions = [
    "Applied",
    "Reviewing",
    "Interview",
    "Hired",
    "Rejected",
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold admin-text mb-2">
              Loading Application...
            </h2>
            <p className="admin-text-light">
              Please wait while we fetch the application details
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm admin-text-light">
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="hover:text-blue-600 transition-colors duration-200"
          >
            Dashboard
          </button>
          <span>/</span>
          <button
            onClick={() => router.push("/admin/applications")}
            className="hover:text-blue-600 transition-colors duration-200"
          >
            Applications
          </button>
          <span>/</span>
          <span className="admin-text font-medium">Application Details</span>
        </nav>

        <div className="admin-card rounded-lg shadow p-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <h2 className="text-xl font-semibold admin-text mb-2">
            Unable to Load Application
          </h2>
          <p className="admin-text-light mb-6 max-w-md mx-auto">{error}</p>
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => router.push("/admin/applications")}
              className={`px-4 py-2 rounded-lg transition-colors duration-200 ${getButtonClasses("secondary")}`}
            >
              Back to Applications
            </button>
            <button
              onClick={() => window.location.reload()}
              className={`px-4 py-2 rounded-lg transition-colors duration-200 ${getButtonClasses("primary")}`}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm admin-text-light">
        <button
          onClick={() => router.push("/admin/dashboard")}
          className="hover:text-blue-600 transition-colors duration-200"
        >
          Dashboard
        </button>
        <span>/</span>
        <button
          onClick={() => router.push("/admin/applications")}
          className="hover:text-blue-600 transition-colors duration-200"
        >
          Applications
        </button>
        <span>/</span>
        <span className="admin-text font-medium">
          {application?.name || application?.email || "Application Details"}
        </span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push("/admin/applications")}
            className="p-2 admin-text-light hover:text-blue-600 transition-colors duration-200"
            title="Back to applications"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold admin-text">
              Application Details
            </h1>
            <p className="admin-text-light mt-1">
              {application?.job?.title} • Applied{" "}
              {new Date(application?.appliedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {/* View Full Profile Button */}
          <button
            onClick={() => router.push(`/applications-manager/candidate/${applicationId}`)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${getButtonClasses("accent")}`}
            title="View comprehensive candidate profile with timeline, interviews, and notes"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">View Full Profile</span>
          </button>

          {application?.job?.slug && (
            <a
              href={`/jobs/${application.job.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${getButtonClasses("secondary")}`}
              title="View job posting"
            >
              <ExternalLink className="h-4 w-4" />
              <span>View Job</span>
            </a>
          )}
        </div>
      </div>

      {/* Application Status Banner */}
      <div className="admin-card rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <span className="text-blue-600 text-lg font-semibold">
                {application?.name?.charAt(0)?.toUpperCase() ||
                  application?.email?.charAt(0)?.toUpperCase() ||
                  "A"}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold admin-text">
                {application?.name || "Anonymous"}
              </h3>
              <p className="admin-text-light">{application?.email}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="admin-text-light font-medium">Status:</span>
            <div className="flex items-center space-x-2">
              <select
                value={application?.status}
                onChange={(e) => updateApplicationStatus(e.target.value)}
                disabled={updating}
                className={`px-3 py-2 rounded-lg text-sm font-medium border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${getStatusColor(application?.status)} ${updating ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {statusOptions.map((status) => (
                  <option
                    key={status}
                    value={status}
                    className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {status}
                  </option>
                ))}
              </select>
              {/* Show hire approval indicator */}
              {currentHireStatus?.hasPendingRequest && (
                <HireApprovalIndicator
                  hasPendingRequest={currentHireStatus.hasPendingRequest}
                  requestedBy={currentHireStatus.requestedBy}
                  requestedAt={currentHireStatus.requestedAt}
                  size="md"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Top Row - Applicant and Position Info */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Applicant Information */}
          <div className="admin-card rounded-lg shadow p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold admin-text">
                Applicant Information
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block admin-text-light font-medium mb-1">
                  Name
                </label>
                <p className="admin-text">
                  {application?.name || "Not provided"}
                </p>
              </div>
              <div>
                <label className="block admin-text-light font-medium mb-1">
                  Email
                </label>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 admin-text-light" />
                  <a
                    href={`mailto:${application?.email}`}
                    className="admin-text hover:text-blue-600 hover:underline transition-colors duration-200"
                  >
                    {application?.email}
                  </a>
                </div>
              </div>
              <div>
                <label className="block admin-text-light font-medium mb-1">
                  Phone
                </label>
                {application?.phone ? (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 admin-text-light" />
                    <a
                      href={`tel:${application.phone}`}
                      className="admin-text hover:text-green-600 hover:underline transition-colors duration-200"
                    >
                      {application.phone}
                    </a>
                  </div>
                ) : (
                  <p className="admin-text-light">Not provided</p>
                )}
              </div>
              <div>
                <label className="block admin-text-light font-medium mb-1">
                  Applied Date
                </label>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 admin-text-light" />
                  <p className="admin-text">
                    {new Date(application?.appliedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Position Details */}
          <div className="admin-card rounded-lg shadow p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Briefcase className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold admin-text">
                Position Details
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block admin-text-light font-medium mb-1">
                  Position
                </label>
                <p className="admin-text font-semibold">
                  {application?.job?.title}
                </p>
              </div>
              <div>
                <label className="block admin-text-light font-medium mb-1">
                  Department
                </label>
                <p className="admin-text">{application?.job?.department}</p>
              </div>
              <div>
                <label className="block admin-text-light font-medium mb-1">
                  Location
                </label>
                <p className="admin-text">{application?.job?.location}</p>
              </div>
              <div>
                <label className="block admin-text-light font-medium mb-1">
                  Employment Type
                </label>
                <p className="admin-text">{application?.job?.employmentType}</p>
              </div>
              <div>
                <label className="block admin-text-light font-medium mb-1">
                  Experience Level
                </label>
                <p className="admin-text">
                  {application?.job?.experienceLevel}
                </p>
              </div>
              <div>
                <label className="block admin-text-light font-medium mb-1">
                  Remote Policy
                </label>
                <p className="admin-text">{application?.job?.remotePolicy}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Second Row - Content and Actions (only show if there's content) */}
        {(application?.coverLetter || application?.notes) && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Cover Letter or Notes - Takes up 2 columns on desktop */}
            <div className="xl:col-span-2">
              {application?.coverLetter && (
                <div className="admin-card rounded-lg shadow p-6 h-full">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                      <Mail className="h-5 w-5 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold admin-text">
                      Cover Letter
                    </h3>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 h-96 overflow-y-auto">
                    <p className="admin-text whitespace-pre-wrap leading-relaxed">
                      {application.coverLetter}
                    </p>
                  </div>
                </div>
              )}

              {/* Show internal notes here if no cover letter */}
              {!application?.coverLetter && application?.notes && (
                <div className="admin-card rounded-lg shadow p-6 h-full">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                      <FileText className="h-5 w-5 text-yellow-600" />
                    </div>
                    <h3 className="text-lg font-semibold admin-text">
                      Internal Notes
                    </h3>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 h-96 overflow-y-auto">
                    <p className="admin-text whitespace-pre-wrap leading-relaxed">
                      {application.notes}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions Sidebar */}
            <div className="space-y-6">
              {/* Resume */}
              {application?.resumeUrl && (
                <div className="admin-card rounded-lg shadow p-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                      <Download className="h-5 w-5 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-semibold admin-text">Resume</h3>
                  </div>
                  <button
                    onClick={() =>
                      downloadResume(application.resumeUrl, application.name)
                    }
                    className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors duration-200 ${getButtonClasses("primary")}`}
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Resume</span>
                  </button>
                </div>
              )}

              {/* Quick Actions */}
              <div className="admin-card rounded-lg shadow p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold admin-text">
                    Quick Email Actions
                  </h3>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => handleEmailAction("interview")}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-100 text-green-800 hover:bg-green-200 rounded-lg transition-colors duration-200"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Email Interview Invitation</span>
                  </button>
                  <button
                    onClick={() => handleEmailAction("rejection")}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-100 text-red-800 hover:bg-red-200 rounded-lg transition-colors duration-200"
                  >
                    <X className="h-4 w-4" />
                    <span>Send Rejection Email</span>
                  </button>
                  <button
                    onClick={() => handleEmailAction("documents")}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded-lg transition-colors duration-200"
                  >
                    <FileCheck className="h-4 w-4" />
                    <span>Request Documents</span>
                  </button>
                </div>
              </div>

              {/* Scheduled Interviews - Read-only list */}
              {scheduledInterviews.length > 0 && (
                <div className="admin-card rounded-lg shadow p-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                      <Calendar className="h-5 w-5 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-semibold admin-text">
                      Scheduled Interviews ({scheduledInterviews.length})
                    </h3>
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {scheduledInterviews.map((interview) => (
                      <div key={interview.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border-l-4 border-indigo-500">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              interview.type === 'phone' ? 'bg-green-100 text-green-800' :
                              interview.type === 'video' ? 'bg-blue-100 text-blue-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {interview.type?.charAt(0).toUpperCase() + interview.type?.slice(1) || 'Interview'}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              interview.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              interview.status === 'accepted' ? 'bg-green-100 text-green-800' :
                              interview.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {interview.status?.charAt(0).toUpperCase() + interview.status?.slice(1) || 'Pending'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-sm admin-text mb-1">
                          <Clock className="h-4 w-4 admin-text-light" />
                          <span>
                            {new Date(interview.scheduled_at).toLocaleDateString()} at{' '}
                            {new Date(interview.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {interview.duration && (
                          <p className="text-xs admin-text-light">
                            Duration: {interview.duration} minutes
                          </p>
                        )}
                        {interview.meeting_link && (
                          <a
                            href={interview.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-600 hover:text-indigo-800 inline-flex items-center mt-2"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Join Meeting
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Internal Notes - Only show here if there's also a cover letter */}
              {application?.coverLetter && application?.notes && (
                <div className="admin-card rounded-lg shadow p-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                      <FileText className="h-5 w-5 text-yellow-600" />
                    </div>
                    <h3 className="text-lg font-semibold admin-text">
                      Internal Notes
                    </h3>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-40 overflow-y-auto">
                    <p className="admin-text whitespace-pre-wrap leading-relaxed text-sm">
                      {application.notes}
                    </p>
                  </div>
                </div>
              )}

              {/* Interview Feedback - Show if there's any feedback */}
              {interviewFeedback.length > 0 && (
                <div className="admin-card rounded-lg shadow p-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                      <MessageSquare className="h-5 w-5 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold admin-text">
                      Interview Feedback ({interviewFeedback.length})
                    </h3>
                  </div>
                  <div className="space-y-4 max-h-60 overflow-y-auto">
                    {interviewFeedback.map((feedback) => (
                      <div key={feedback.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="font-medium text-sm admin-text">
                              {feedback.metadata?.interviewer_name || feedback.author_name}
                            </span>
                            {feedback.metadata?.rating && (
                              <div className="flex items-center space-x-1 ml-3">
                                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {feedback.metadata.rating}/5
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>
                              {feedback.metadata?.interview_date
                                ? new Date(feedback.metadata.interview_date).toLocaleDateString()
                                : new Date(feedback.created_at).toLocaleDateString()
                              }
                            </span>
                          </div>
                        </div>
                        <p className="admin-text text-sm whitespace-pre-wrap leading-relaxed">
                          {feedback.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Screening Questions Answers Section */}
        {application?.job?.application_type === "full" && (
          <div className="admin-card rounded-lg shadow p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                <FileText className="h-5 w-5 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold admin-text">
                Screening Questions
              </h3>
            </div>
            <ScreeningAnswers applicationId={application.id} />
          </div>
        )}

        {/* Actions Row for when there's no cover letter or notes */}
        {!application?.coverLetter && !application?.notes && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Resume - Left Side */}
            {application?.resumeUrl ? (
              <div className="admin-card rounded-lg shadow p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                    <Download className="h-5 w-5 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold admin-text">Resume</h3>
                </div>
                <button
                  onClick={() =>
                    downloadResume(application.resumeUrl, application.name)
                  }
                  className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors duration-200 ${getButtonClasses("primary")}`}
                >
                  <Download className="h-4 w-4" />
                  <span>Download Resume</span>
                </button>
              </div>
            ) : (
              <div className="admin-card rounded-lg shadow p-6 flex items-center justify-center">
                <div className="text-center admin-text-light">
                  <Download className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No resume provided</p>
                </div>
              </div>
            )}

            {/* Quick Email Actions - Right Side */}
            <div className="admin-card rounded-lg shadow p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold admin-text">
                  Quick Email Actions
                </h3>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => handleEmailAction("interview")}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-100 text-green-800 hover:bg-green-200 rounded-lg transition-colors duration-200"
                >
                  <Mail className="h-4 w-4" />
                  <span>Email Interview Invitation</span>
                </button>
                <button
                  onClick={() => handleEmailAction("rejection")}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-100 text-red-800 hover:bg-red-200 rounded-lg transition-colors duration-200"
                >
                  <X className="h-4 w-4" />
                  <span>Send Rejection Email</span>
                </button>
                <button
                  onClick={() => handleEmailAction("documents")}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded-lg transition-colors duration-200"
                >
                  <FileCheck className="h-4 w-4" />
                  <span>Request Documents</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Notes Modal */}
        <RejectionNotesModal
          isOpen={isNotesModalOpen}
          onClose={cancelStatusChange}
          onSubmit={async (notes) => {
            try {
              const updatedApplication = await completeStatusChangeWithNotes(notes);
              // Update local state with the returned data
              if (updatedApplication && updatedApplication.id) {
                setApplication(updatedApplication);
              }
            } catch (error) {
              console.error("Failed to complete rejection with notes:", error);
              // Error is already handled in the hook, just log here
            }
          }}
          applicationName={
            application?.name || application?.email || "this application"
          }
        />

        {/* Interview Feedback Modal */}
        <InterviewFeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={cancelFeedbackChange}
          onSubmit={async (feedbackData) => {
            try {
              const updatedApplication = await completeStatusChangeWithFeedback(feedbackData);
              // Update local state with the returned data
              if (updatedApplication && updatedApplication.id) {
                setApplication(updatedApplication);
              }
            } catch (error) {
              console.error("Failed to complete status change with feedback:", error);
              // Error is already handled in the hook, just log here
            }
          }}
          interviewsWithoutFeedback={interviewsWithoutFeedback}
          applicationName={
            application?.name || application?.email || "this application"
          }
        />

        {/* Hire Approval Status Modal */}
        <HireApprovalStatusModal
          isOpen={hireApprovalModal.isOpen}
          onClose={() => setHireApprovalModal({
            isOpen: false,
            type: null,
            message: null,
            hireRequestId: null,
            existingRequestId: null,
          })}
          type={hireApprovalModal.type}
          message={hireApprovalModal.message}
          applicationName={application?.name || application?.email || "this application"}
          hireRequestId={hireApprovalModal.hireRequestId}
          existingRequestId={hireApprovalModal.existingRequestId}
        />
      </div>
    </div>
  );
}

export default function ApplicationDetailsPage() {
  return (
    <ResourcePermissionGuard
      resource="applications"
      actions={["view"]}
      fallbackPath="/admin/dashboard"
    >
      <ApplicationDetailsContent />
    </ResourcePermissionGuard>
  );
}
