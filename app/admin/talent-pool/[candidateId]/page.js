"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useThemeClasses } from "../../../contexts/AdminThemeContext";
import {
  ArrowLeft,
  Mail,
  MapPin,
  Briefcase,
  Award,
  ExternalLink,
  Calendar,
  UserPlus,
  MessageSquare,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  Github,
  Linkedin,
  Globe,
  Hash,
  Tag,
} from "lucide-react";
export default function TalentPoolCandidatePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { getButtonClasses } = useThemeClasses();
  const candidateId = params.candidateId;

  const [candidate, setCandidate] = useState(null);
  const [applications, setApplications] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [socialProfiles, setSocialProfiles] = useState(null);
  const [candidateTags, setCandidateTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTag, setNewTag] = useState("");

  // Pagination for interactions
  const [interactionPage, setInteractionPage] = useState(1);
  const interactionsPerPage = 5;

  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);

  // Form states
  const [inviteForm, setInviteForm] = useState({
    jobId: "",
    templateId: "",
    subject: "",
    content: "",
    customMessage: ""
  });
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [sourceForm, setSourceForm] = useState({ jobId: "", notes: "", status: "Applied" });
  const [noteForm, setNoteForm] = useState({ notes: "", jobId: "" });
  const [jobs, setJobs] = useState([]);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    fetchCandidateDetails();
    fetchActiveJobs();
    fetchEmailTemplates();
  }, [candidateId]);

  const fetchCandidateDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/talent-pool/${candidateId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch candidate details");
      }

      const data = await response.json();
      setCandidate(data.candidate);
      setApplications(data.applications);
      setInteractions(data.interactions);
      setInvitations(data.invitations);
    } catch (err) {
      console.error("Error fetching candidate:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveJobs = async () => {
    try {
      const response = await fetch("/api/admin/jobs");
      if (response.ok) {
        const data = await response.json();
        // Filter only active jobs - add null safety check
        const jobsList = data.jobs || data || [];
        const activeJobs = Array.isArray(jobsList) ? jobsList.filter((job) => job.status === "Active") : [];
        setJobs(activeJobs);
      }
    } catch (err) {
      console.error("Error fetching jobs:", err);
    }
  };

  const fetchEmailTemplates = async () => {
    try {
      const response = await fetch("/api/admin/communication/templates");
      if (response.ok) {
        const result = await response.json();
        console.log("Fetched templates data:", result);

        // Get all active templates
        const templates = result.data || result.templates || [];
        console.log("All templates:", templates);

        const activeTemplates = templates.filter((t) => t.isActive);
        console.log("Active templates:", activeTemplates);

        setEmailTemplates(activeTemplates);
      } else {
        console.error("Failed to fetch templates, status:", response.status);
      }
    } catch (err) {
      console.error("Error fetching email templates:", err);
    }
  };

  // Recommended jobs feature removed - premium feature

  const handleTemplateChange = (templateId) => {
    const selectedTemplate = emailTemplates.find((t) => t.id === templateId);
    if (selectedTemplate) {
      setInviteForm({
        ...inviteForm,
        templateId: templateId,
        subject: selectedTemplate.subject,
        content: selectedTemplate.content,
      });
    } else {
      setInviteForm({
        ...inviteForm,
        templateId: "",
        subject: "",
        content: "",
      });
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setActionError(null);

    try {
      const response = await fetch(`/api/admin/talent-pool/${candidateId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send invitation");
      }

      setActionSuccess("Invitation sent successfully!");
      setShowInviteModal(false);
      setInviteForm({ jobId: "", templateId: "", subject: "", content: "", customMessage: "" });

      // Refresh data
      fetchCandidateDetails();

      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err) {
      console.error("Error sending invitation:", err);
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSource = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setActionError(null);

    try {
      const response = await fetch(`/api/admin/talent-pool/${candidateId}/source`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sourceForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to source candidate");
      }

      setActionSuccess("Candidate added to job pipeline successfully!");
      setShowSourceModal(false);
      setSourceForm({ jobId: "", notes: "", status: "Applied" });

      // Refresh data
      fetchCandidateDetails();

      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err) {
      console.error("Error sourcing candidate:", err);
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setActionError(null);

    try {
      const response = await fetch(`/api/admin/talent-pool/${candidateId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noteForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add note");
      }

      setActionSuccess("Note added successfully!");
      setShowNoteModal(false);
      setNoteForm({ notes: "", jobId: "" });

      // Refresh data
      fetchCandidateDetails();

      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err) {
      console.error("Error adding note:", err);
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin admin-text mx-auto mb-3" />
        <p className="admin-text">Loading candidate details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-card border admin-border rounded-lg p-8 text-center">
        <XCircle className="h-12 w-12 theme-danger mx-auto mb-3" />
        <h3 className="text-lg font-semibold admin-text mb-2">Error</h3>
        <p className="theme-danger mb-4">{error}</p>
        <button
          onClick={() => router.push("/admin/talent-pool")}
          className={getButtonClasses("secondary")}
        >
          Back to Talent Pool
        </button>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="admin-card border admin-border rounded-lg p-8 text-center">
        <p className="admin-text">Candidate not found</p>
        <button
          onClick={() => router.push("/admin/talent-pool")}
          className={`${getButtonClasses("secondary")} mt-4`}
        >
          Back to Talent Pool
        </button>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      sent: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      viewed: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
      applied: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
      declined: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
      expired: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    };
    return colors[status] || colors.sent;
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.push("/admin/talent-pool")}
        className="flex items-center gap-2 admin-text hover:theme-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Talent Pool
      </button>

      {/* Success/Error Messages */}
      {actionSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="text-green-700">{actionSuccess}</p>
        </div>
      )}

      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <XCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-700">{actionError}</p>
        </div>
      )}

      {/* Candidate Header */}
      <div className="admin-card border admin-border rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold admin-text">
                {candidate.name || "No name provided"}
              </h1>
              {candidate.available_for_opportunities && (
                <span className="px-3 py-1 text-sm rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  Available
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-sm admin-text-light">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {candidate.email}
              </div>
              {candidate.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {candidate.location}
                </div>
              )}
              {candidate.years_experience && (
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  {candidate.years_experience} years experience
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setShowInviteModal(!showInviteModal)}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg ${getButtonClasses(showInviteModal ? "danger" : "success")}`}
            >
              <Send className="h-4 w-4" />
              {showInviteModal ? "Cancel" : "Send Invitation"}
            </button>
            <button
              onClick={() => setShowSourceModal(!showSourceModal)}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg ${getButtonClasses(showSourceModal ? "danger" : "primary")}`}
            >
              <UserPlus className="h-4 w-4" />
              {showSourceModal ? "Cancel" : "Add to Pipeline"}
            </button>
            <button
              onClick={() => setShowNoteModal(!showNoteModal)}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg ${getButtonClasses(showNoteModal ? "danger" : "accent")}`}
            >
              <MessageSquare className="h-4 w-4" />
              {showNoteModal ? "Cancel" : "Add Note"}
            </button>
          </div>
        </div>

        {/* Current Position */}
        {(candidate.current_title || candidate.current_company) && (
          <div className="flex items-center gap-2 mb-4 admin-text">
            <Briefcase className="h-5 w-5 admin-text-light" />
            {candidate.current_title && <span className="font-medium">{candidate.current_title}</span>}
            {candidate.current_title && candidate.current_company && <span>at</span>}
            {candidate.current_company && <span>{candidate.current_company}</span>}
          </div>
        )}

        {/* Bio */}
        {candidate.bio && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold admin-text mb-2">Bio</h3>
            <p className="admin-text-light">{candidate.bio}</p>
          </div>
        )}

        {/* Skills */}
        {candidate.skills && candidate.skills.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold admin-text mb-2">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {candidate.skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 text-sm rounded-full admin-card border admin-border admin-text"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        {(candidate.linkedin_url || candidate.portfolio_url) && (
          <div className="flex items-center gap-4 mb-4">
            {candidate.linkedin_url && (
              <a
                href={candidate.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="theme-primary hover:underline flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                LinkedIn
              </a>
            )}
            {candidate.portfolio_url && (
              <a
                href={candidate.portfolio_url}
                target="_blank"
                rel="noopener noreferrer"
                className="theme-primary hover:underline flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Portfolio
              </a>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-6 text-sm admin-text-light pt-4 border-t admin-border">
          <div>
            <span className="font-semibold admin-text">{candidate.stats.totalApplications}</span> Total Applications
          </div>
          <div>
            <span className="font-semibold admin-text">{candidate.stats.interactionsCount}</span> Interactions
          </div>
          <div>
            <span className="font-semibold admin-text">{candidate.stats.invitationsCount}</span> Invitations
          </div>
          {candidate.stats.activeInvitationsCount > 0 && (
            <div className="theme-warning">
              <span className="font-semibold">{candidate.stats.activeInvitationsCount}</span> Active Invitations
            </div>
          )}
        </div>
      </div>

      {/* Inline Add to Pipeline Form */}
      {showSourceModal && (
        <div className="admin-card border-2 border-blue-500 dark:border-blue-400 rounded-lg p-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold admin-text flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add to Job Pipeline
            </h3>
            <button
              onClick={() => {
                setShowSourceModal(false);
                setSourceForm({ jobId: "", notes: "", status: "Applied" });
                setActionError(null);
              }}
              className="admin-text-light hover:admin-text transition-colors"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSource} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium admin-text mb-1">
                  Job <span className="text-red-500">*</span>
                </label>
                <select
                  value={sourceForm.jobId}
                  onChange={(e) => setSourceForm({ ...sourceForm, jobId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border admin-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text admin-card"
                >
                  <option value="">Select a job</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} - {job.department}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium admin-text mb-1">
                  Initial Status
                </label>
                <select
                  value={sourceForm.status}
                  onChange={(e) => setSourceForm({ ...sourceForm, status: e.target.value })}
                  className="w-full px-3 py-2 border admin-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text admin-card"
                >
                  <option value="Applied">Applied</option>
                  <option value="Reviewing">Reviewing</option>
                  <option value="Interview">Interview</option>
                  <option value="Hired">Hired</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium admin-text mb-1">
                Internal Notes <span className="text-sm admin-text-light">(optional)</span>
              </label>
              <textarea
                value={sourceForm.notes}
                onChange={(e) => setSourceForm({ ...sourceForm, notes: e.target.value })}
                rows={3}
                placeholder="Add internal notes about this candidate (e.g., skills match, previous conversation, referral source...)"
                className="w-full px-3 py-2 border admin-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text admin-card resize-none"
              />
            </div>

            {actionError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{actionError}</p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting || !sourceForm.jobId}
                className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg transition-colors duration-200 flex-1 disabled:opacity-50 disabled:cursor-not-allowed ${getButtonClasses("primary")}`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Adding to Pipeline...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Add to Pipeline
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSourceModal(false);
                  setSourceForm({ jobId: "", notes: "", status: "Applied" });
                  setActionError(null);
                }}
                disabled={submitting}
                className={`px-6 py-2.5 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${getButtonClasses("secondary")}`}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inline Send Invitation Form */}
      {showInviteModal && (
        <div className="admin-card border-2 border-green-500 dark:border-green-400 rounded-lg p-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold admin-text flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Job Invitation
            </h3>
            <button
              onClick={() => {
                setShowInviteModal(false);
                setInviteForm({ jobId: "", templateId: "", subject: "", content: "", customMessage: "" });
                setActionError(null);
              }}
              className="admin-text-light hover:admin-text transition-colors"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium admin-text mb-1">
                  Job <span className="text-red-500">*</span>
                </label>
                <select
                  value={inviteForm.jobId}
                  onChange={(e) => setInviteForm({ ...inviteForm, jobId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border admin-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 admin-text admin-card"
                >
                  <option value="">Select a job</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} - {job.department}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium admin-text mb-1">
                  Email Template <span className="text-red-500">*</span>
                </label>
                <select
                  value={inviteForm.templateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 border admin-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 admin-text admin-card"
                >
                  <option value="">Select a template</option>
                  {emailTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} {template.isDefault ? "(Default)" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs admin-text-light mt-1">
                  Templates can be managed in{" "}
                  <a
                    href="/applications-manager/communication"
                    target="_blank"
                    className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 underline"
                  >
                    Communication Hub
                  </a>
                </p>
              </div>
            </div>

            {/* Template Subject (editable) */}
            {inviteForm.templateId && (
              <>
                <div>
                  <label className="block text-sm font-medium admin-text mb-1">
                    Email Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={inviteForm.subject}
                    onChange={(e) => setInviteForm({ ...inviteForm, subject: e.target.value })}
                    required
                    className="w-full px-3 py-2 border admin-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 admin-text admin-card"
                    placeholder="Email subject line..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium admin-text mb-1">
                    Email Content <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={inviteForm.content}
                    onChange={(e) => setInviteForm({ ...inviteForm, content: e.target.value })}
                    required
                    rows={10}
                    className="w-full px-3 py-2 border admin-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 admin-text admin-card resize-none font-mono text-sm"
                  />
                  <p className="text-xs admin-text-light mt-1">
                    Variables like {`{{candidateName}}`} and {`{{jobTitle}}`} will be replaced automatically.
                  </p>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium admin-text mb-1">
                Additional Notes <span className="text-sm admin-text-light">(optional)</span>
              </label>
              <textarea
                value={inviteForm.customMessage}
                onChange={(e) => setInviteForm({ ...inviteForm, customMessage: e.target.value })}
                rows={3}
                placeholder="Add any additional context or personalized notes for this candidate..."
                className="w-full px-3 py-2 border admin-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 admin-text admin-card resize-none"
              />
              <p className="text-xs admin-text-light mt-1">
                These notes will be appended to the selected template.
              </p>
            </div>

            {/* Email Preview Section */}
            {inviteForm.templateId && inviteForm.subject && inviteForm.content && (
              <div className="border-t admin-border pt-4">
                <button
                  type="button"
                  onClick={() => setShowEmailPreview(!showEmailPreview)}
                  className="text-sm theme-primary hover:underline flex items-center gap-2 mb-3"
                >
                  <Eye className="h-4 w-4" />
                  {showEmailPreview ? "Hide" : "Show"} Email Preview
                </button>

                {showEmailPreview && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border admin-border">
                    <h4 className="font-semibold admin-text mb-3">Email Preview</h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs admin-text-light font-semibold">TO:</span>
                        <p className="text-sm admin-text">{candidate.email}</p>
                      </div>
                      <div>
                        <span className="text-xs admin-text-light font-semibold">SUBJECT:</span>
                        <p className="text-sm admin-text font-medium">{inviteForm.subject}</p>
                      </div>
                      <div>
                        <span className="text-xs admin-text-light font-semibold">MESSAGE:</span>
                        <div className="mt-2 p-4 bg-white dark:bg-gray-900 rounded border admin-border">
                          <div className="text-sm admin-text whitespace-pre-wrap">
                            {inviteForm.content
                              .replace(/\{\{candidateName\}\}/g, candidate.name || "there")
                              .replace(/\{\{jobTitle\}\}/g, jobs.find(j => j.id === inviteForm.jobId)?.title || "[Job Title]")
                              .replace(/\{\{department\}\}/g, jobs.find(j => j.id === inviteForm.jobId)?.department || "[Department]")
                              .replace(/\{\{companyName\}\}/g, "Your Company")
                              .replace(/\{\{inviterName\}\}/g, session?.user?.name || session?.user?.email)
                              .replace(/\{\{location\}\}/g, jobs.find(j => j.id === inviteForm.jobId)?.location || "[Location]")}
                          </div>
                          {inviteForm.customMessage && (
                            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700">
                              <p className="text-xs admin-text-light font-semibold mb-1">PERSONAL MESSAGE:</p>
                              <p className="text-sm admin-text">{inviteForm.customMessage}</p>
                            </div>
                          )}
                          <div className="mt-4 pt-3 border-t admin-border">
                            <p className="text-xs admin-text-light italic">
                              This invitation will include a link for the candidate to apply directly to this position.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {actionError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{actionError}</p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting || !inviteForm.jobId || !inviteForm.templateId || !inviteForm.subject || !inviteForm.content}
                className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg transition-colors duration-200 flex-1 disabled:opacity-50 disabled:cursor-not-allowed ${getButtonClasses("success")}`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending Invitation...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteForm({ jobId: "", templateId: "", subject: "", content: "", customMessage: "" });
                  setActionError(null);
                }}
                disabled={submitting}
                className={`px-6 py-2.5 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${getButtonClasses("secondary")}`}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inline Add Note Form */}
      {showNoteModal && (
        <div className="admin-card border-2 border-purple-500 dark:border-purple-400 rounded-lg p-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold admin-text flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Add Note
            </h3>
            <button
              onClick={() => {
                setShowNoteModal(false);
                setNoteForm({ notes: "", jobId: "" });
                setActionError(null);
              }}
              className="admin-text-light hover:admin-text transition-colors"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleAddNote} className="space-y-4">
            <div>
              <label className="block text-sm font-medium admin-text mb-1">
                Related Job <span className="text-sm admin-text-light">(optional)</span>
              </label>
              <select
                value={noteForm.jobId}
                onChange={(e) => setNoteForm({ ...noteForm, jobId: e.target.value })}
                className="w-full px-3 py-2 border admin-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 admin-text admin-card"
              >
                <option value="">No specific job</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} - {job.department}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium admin-text mb-1">
                Note <span className="text-red-500">*</span>
              </label>
              <textarea
                value={noteForm.notes}
                onChange={(e) => setNoteForm({ ...noteForm, notes: e.target.value })}
                rows={4}
                required
                placeholder="Add internal notes about this candidate (e.g., phone screen notes, referral context, skills assessment...)"
                className="w-full px-3 py-2 border admin-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 admin-text admin-card resize-none"
              />
              <p className="text-xs admin-text-light mt-1">
                This note will be visible to other team members in the interaction history.
              </p>
            </div>

            {actionError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{actionError}</p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting || !noteForm.notes}
                className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg transition-colors duration-200 flex-1 disabled:opacity-50 disabled:cursor-not-allowed ${getButtonClasses("accent")}`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Adding Note...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4" />
                    Add Note
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNoteModal(false);
                  setNoteForm({ notes: "", jobId: "" });
                  setActionError(null);
                }}
                disabled={submitting}
                className={`px-6 py-2.5 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${getButtonClasses("secondary")}`}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Applications */}
      <div className="admin-card border admin-border rounded-lg p-6">
        <h2 className="text-xl font-bold admin-text mb-4">Applications</h2>
        {applications.length === 0 ? (
          <p className="admin-text-light text-center py-4">No applications yet</p>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <div
                key={app.id}
                className="border admin-border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                onClick={() => router.push(`/admin/applications/${app.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold admin-text">{app.job?.title || "Unknown Job"}</h3>
                    <div className="flex items-center gap-3 text-sm admin-text-light mt-1">
                      <span>Status: {app.status}</span>
                      <span>•</span>
                      <span>Source: {app.sourceType || "Unknown"}</span>
                      <span>•</span>
                      <span>Applied: {new Date(app.appliedAt).toLocaleDateString()}</span>
                    </div>
                    {app.sourcedBy && (
                      <p className="text-sm admin-text-light mt-1">
                        Sourced by: {app.sourcedBy.name || app.sourcedBy.email}
                      </p>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(app.status?.toLowerCase() || "sent")}`}>
                    {app.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invitations */}
      <div className="admin-card border admin-border rounded-lg p-6">
        <h2 className="text-xl font-bold admin-text mb-4">Invitations</h2>
        {invitations.length === 0 ? (
          <p className="admin-text-light text-center py-4">No invitations sent yet</p>
        ) : (
          <div className="space-y-3">
            {invitations.map((inv) => (
              <div key={inv.id} className="border admin-border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold admin-text">{inv.job?.title || "Unknown Job"}</h3>
                    <div className="flex items-center gap-3 text-sm admin-text-light mt-1">
                      <span>Sent: {new Date(inv.sent_at).toLocaleDateString()}</span>
                      {inv.viewed_at && (
                        <>
                          <span>•</span>
                          <span>Viewed: {new Date(inv.viewed_at).toLocaleDateString()}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>Expires: {new Date(inv.expires_at).toLocaleDateString()}</span>
                    </div>
                    {inv.invited_by_user && (
                      <p className="text-sm admin-text-light mt-1">
                        By: {inv.invited_by_user.name || inv.invited_by_user.email}
                      </p>
                    )}
                    {inv.message && (
                      <p className="text-sm admin-text mt-2 italic">"{inv.message}"</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(inv.status)}`}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactions */}
      <div className="admin-card border admin-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold admin-text">Interaction History</h2>
          {interactions.length > 0 && (
            <span className="text-sm admin-text-light">
              {interactions.length} total interaction{interactions.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {interactions.length === 0 ? (
          <p className="admin-text-light text-center py-4">No interactions yet</p>
        ) : (
          <>
            <div className="space-y-3">
              {interactions
                .slice((interactionPage - 1) * interactionsPerPage, interactionPage * interactionsPerPage)
                .map((interaction) => (
                  <div key={interaction.id} className="border admin-border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full admin-card border admin-border">
                        {interaction.interaction_type === "viewed_profile" && <Eye className="h-4 w-4 admin-text" />}
                        {interaction.interaction_type === "sent_invitation" && <Send className="h-4 w-4 admin-text" />}
                        {interaction.interaction_type === "added_note" && <MessageSquare className="h-4 w-4 admin-text" />}
                        {interaction.interaction_type === "sourced_to_job" && <UserPlus className="h-4 w-4 admin-text" />}
                        {interaction.interaction_type === "emailed" && <Mail className="h-4 w-4 admin-text" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold admin-text capitalize">
                            {interaction.interaction_type?.replace(/_/g, " ") || "Unknown"}
                          </h3>
                          <span className="text-sm admin-text-light">
                            {new Date(interaction.created_at).toLocaleString()}
                          </span>
                        </div>
                        {interaction.admin && (
                          <p className="text-sm admin-text-light mt-1">
                            By: {interaction.admin.name || interaction.admin.email}
                          </p>
                        )}
                        {interaction.job && (
                          <p className="text-sm admin-text mt-1">Job: {interaction.job.title}</p>
                        )}
                        {interaction.notes && (
                          <p className="text-sm admin-text-light mt-2 italic">"{interaction.notes}"</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Pagination Controls */}
            {interactions.length > interactionsPerPage && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t admin-border">
                <div className="text-sm admin-text-light">
                  Showing {((interactionPage - 1) * interactionsPerPage) + 1} to{" "}
                  {Math.min(interactionPage * interactionsPerPage, interactions.length)} of {interactions.length}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setInteractionPage(page => Math.max(1, page - 1))}
                    disabled={interactionPage === 1}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      interactionPage === 1
                        ? "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700 text-gray-400"
                        : getButtonClasses("secondary")
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setInteractionPage(page => Math.min(Math.ceil(interactions.length / interactionsPerPage), page + 1))}
                    disabled={interactionPage >= Math.ceil(interactions.length / interactionsPerPage)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      interactionPage >= Math.ceil(interactions.length / interactionsPerPage)
                        ? "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700 text-gray-400"
                        : getButtonClasses("secondary")
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Social Profiles Section */}
      <div className="admin-card border admin-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold admin-text flex items-center gap-2">
            <Globe className="h-5 w-5 theme-primary" />
            Social Profiles
          </h2>
          <button
            className={`${getButtonClasses("secondary")} px-3 py-1 text-sm rounded-lg`}
            onClick={() => {/* Fetch social profiles */}}
          >
            Refresh Profiles
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* LinkedIn Profile */}
          {candidate.linkedin_url && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Linkedin className="h-5 w-5 text-blue-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-medium admin-text mb-1">LinkedIn</h3>
                {socialProfiles?.linkedin ? (
                  <div className="text-sm admin-text-light space-y-1">
                    <p>{socialProfiles.linkedin.headline}</p>
                    <p className="text-xs">{socialProfiles.linkedin.connections} connections</p>
                    <p className="text-xs">{socialProfiles.linkedin.summary?.substring(0, 100)}...</p>
                  </div>
                ) : (
                  <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-sm theme-primary hover:underline">
                    View Profile →
                  </a>
                )}
              </div>
            </div>
          )}

          {/* GitHub Profile (if applicable) */}
          {candidate.github_url && (
            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Github className="h-5 w-5 admin-text mt-1" />
              <div className="flex-1">
                <h3 className="font-medium admin-text mb-1">GitHub</h3>
                {socialProfiles?.github ? (
                  <div className="text-sm admin-text-light space-y-1">
                    <p>{socialProfiles.github.repos} repositories</p>
                    <p className="text-xs">{socialProfiles.github.followers} followers</p>
                    <p className="text-xs">Top languages: {socialProfiles.github.languages?.join(", ")}</p>
                  </div>
                ) : (
                  <a href={candidate.github_url} target="_blank" rel="noopener noreferrer" className="text-sm theme-primary hover:underline">
                    View Profile →
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Add Social Profile */}
          <div className="flex items-center justify-center p-3 border-2 border-dashed admin-border rounded-lg">
            <button className="text-sm admin-text-light hover:theme-primary flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Add Social Profile
            </button>
          </div>
        </div>
      </div>

      {/* Tags Section */}
      <div className="admin-card border admin-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold admin-text flex items-center gap-2">
            <Tag className="h-5 w-5 theme-primary" />
            Candidate Tags
          </h2>
          <button
            onClick={() => setShowAddTag(true)}
            className={`${getButtonClasses("secondary")} px-3 py-1 text-sm rounded-lg flex items-center gap-1`}
          >
            <Tag className="h-3 w-3" />
            Add Tag
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {candidateTags.length === 0 ? (
            <p className="admin-text-light text-sm">No tags added yet</p>
          ) : (
            candidateTags.map((tag, idx) => (
              <span
                key={idx}
                className="px-3 py-1 text-sm rounded-full admin-card border admin-border admin-text flex items-center gap-2 group"
              >
                <Hash className="h-3 w-3" />
                {tag.name}
                <button
                  onClick={() => {/* Remove tag */}}
                  className="ml-1 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XCircle className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </div>

        {/* Add Tag Form */}
        {showAddTag && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Enter tag name..."
                className="flex-1 px-3 py-1 text-sm border admin-border rounded admin-text admin-card"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    // Add tag logic
                    setCandidateTags([...candidateTags, { name: newTag, id: Date.now() }]);
                    setNewTag("");
                    setShowAddTag(false);
                  }
                }}
              />
              <button
                onClick={() => {
                  if (newTag.trim()) {
                    setCandidateTags([...candidateTags, { name: newTag, id: Date.now() }]);
                    setNewTag("");
                    setShowAddTag(false);
                  }
                }}
                className={`${getButtonClasses("primary")} px-3 py-1 text-sm rounded`}
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddTag(false);
                  setNewTag("");
                }}
                className="text-sm admin-text-light hover:admin-text"
              >
                Cancel
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {/* Suggested Tags */}
              {['High Potential', 'Technical Lead', 'Senior Level', 'Remote Ready', 'Immediate Availability'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setNewTag(suggestion)}
                  className="text-xs px-2 py-1 rounded admin-card border admin-border hover:theme-primary-bg hover:text-white transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
