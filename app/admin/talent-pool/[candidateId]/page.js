"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
} from "lucide-react";

export default function TalentPoolCandidatePage() {
  const params = useParams();
  const router = useRouter();
  const { getButtonClasses } = useThemeClasses();
  const candidateId = params.candidateId;

  const [candidate, setCandidate] = useState(null);
  const [applications, setApplications] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);

  // Form states
  const [inviteForm, setInviteForm] = useState({ jobId: "", message: "" });
  const [sourceForm, setSourceForm] = useState({ jobId: "", notes: "", status: "New" });
  const [noteForm, setNoteForm] = useState({ notes: "", jobId: "" });
  const [jobs, setJobs] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    fetchCandidateDetails();
    fetchActiveJobs();
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
        // Filter only active jobs
        const activeJobs = data.jobs.filter((job) => job.status === "Active");
        setJobs(activeJobs);
      }
    } catch (err) {
      console.error("Error fetching jobs:", err);
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
      setInviteForm({ jobId: "", message: "" });

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
      setSourceForm({ jobId: "", notes: "", status: "New" });

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
              onClick={() => setShowInviteModal(true)}
              className={`${getButtonClasses("primary")} flex items-center gap-2`}
            >
              <Send className="h-4 w-4" />
              Send Invitation
            </button>
            <button
              onClick={() => setShowSourceModal(true)}
              className={`${getButtonClasses("secondary")} flex items-center gap-2`}
            >
              <UserPlus className="h-4 w-4" />
              Add to Pipeline
            </button>
            <button
              onClick={() => setShowNoteModal(true)}
              className={`${getButtonClasses("secondary")} flex items-center gap-2`}
            >
              <MessageSquare className="h-4 w-4" />
              Add Note
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
                    <h3 className="font-semibold admin-text">{app.job.title}</h3>
                    <div className="flex items-center gap-3 text-sm admin-text-light mt-1">
                      <span>Status: {app.status}</span>
                      <span>•</span>
                      <span>Source: {app.sourceType}</span>
                      <span>•</span>
                      <span>Applied: {new Date(app.appliedAt).toLocaleDateString()}</span>
                    </div>
                    {app.sourcedBy && (
                      <p className="text-sm admin-text-light mt-1">
                        Sourced by: {app.sourcedBy.name || app.sourcedBy.email}
                      </p>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(app.status.toLowerCase())}`}>
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
                    <h3 className="font-semibold admin-text">{inv.job.title}</h3>
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
                    <p className="text-sm admin-text-light mt-1">
                      By: {inv.invited_by_user.name || inv.invited_by_user.email}
                    </p>
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
        <h2 className="text-xl font-bold admin-text mb-4">Interaction History</h2>
        {interactions.length === 0 ? (
          <p className="admin-text-light text-center py-4">No interactions yet</p>
        ) : (
          <div className="space-y-3">
            {interactions.map((interaction) => (
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
                        {interaction.interaction_type.replace(/_/g, " ")}
                      </h3>
                      <span className="text-sm admin-text-light">
                        {new Date(interaction.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm admin-text-light mt-1">
                      By: {interaction.admin.name || interaction.admin.email}
                    </p>
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
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="admin-card border admin-border rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold admin-text mb-4">Send Job Invitation</h3>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium admin-text mb-1">
                  Job *
                </label>
                <select
                  value={inviteForm.jobId}
                  onChange={(e) => setInviteForm({ ...inviteForm, jobId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border admin-border rounded-lg focus:ring-2 theme-primary theme-primary-border admin-text admin-card"
                >
                  <option value="">Select a job</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium admin-text mb-1">
                  Custom Message (optional)
                </label>
                <textarea
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                  rows={4}
                  placeholder="Add a personal message to the invitation..."
                  className="w-full px-3 py-2 border admin-border rounded-lg focus:ring-2 theme-primary theme-primary-border admin-text admin-card"
                />
              </div>
              {actionError && (
                <p className="text-sm theme-danger">{actionError}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`${getButtonClasses("primary")} flex-1`}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Invitation"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteForm({ jobId: "", message: "" });
                    setActionError(null);
                  }}
                  className={getButtonClasses("secondary")}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Source Modal */}
      {showSourceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="admin-card border admin-border rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold admin-text mb-4">Add to Job Pipeline</h3>
            <form onSubmit={handleSource} className="space-y-4">
              <div>
                <label className="block text-sm font-medium admin-text mb-1">
                  Job *
                </label>
                <select
                  value={sourceForm.jobId}
                  onChange={(e) => setSourceForm({ ...sourceForm, jobId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border admin-border rounded-lg focus:ring-2 theme-primary theme-primary-border admin-text admin-card"
                >
                  <option value="">Select a job</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
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
                  className="w-full px-3 py-2 border admin-border rounded-lg focus:ring-2 theme-primary theme-primary-border admin-text admin-card"
                >
                  <option value="New">New</option>
                  <option value="Screening">Screening</option>
                  <option value="Interview">Interview</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium admin-text mb-1">
                  Internal Notes (optional)
                </label>
                <textarea
                  value={sourceForm.notes}
                  onChange={(e) => setSourceForm({ ...sourceForm, notes: e.target.value })}
                  rows={4}
                  placeholder="Add internal notes about this candidate..."
                  className="w-full px-3 py-2 border admin-border rounded-lg focus:ring-2 theme-primary theme-primary-border admin-text admin-card"
                />
              </div>
              {actionError && (
                <p className="text-sm theme-danger">{actionError}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`${getButtonClasses("primary")} flex-1`}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add to Pipeline"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSourceModal(false);
                    setSourceForm({ jobId: "", notes: "", status: "New" });
                    setActionError(null);
                  }}
                  className={getButtonClasses("secondary")}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="admin-card border admin-border rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold admin-text mb-4">Add Note</h3>
            <form onSubmit={handleAddNote} className="space-y-4">
              <div>
                <label className="block text-sm font-medium admin-text mb-1">
                  Related Job (optional)
                </label>
                <select
                  value={noteForm.jobId}
                  onChange={(e) => setNoteForm({ ...noteForm, jobId: e.target.value })}
                  className="w-full px-3 py-2 border admin-border rounded-lg focus:ring-2 theme-primary theme-primary-border admin-text admin-card"
                >
                  <option value="">None (General note)</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium admin-text mb-1">
                  Note *
                </label>
                <textarea
                  value={noteForm.notes}
                  onChange={(e) => setNoteForm({ ...noteForm, notes: e.target.value })}
                  rows={4}
                  required
                  placeholder="Add a note about this candidate..."
                  className="w-full px-3 py-2 border admin-border rounded-lg focus:ring-2 theme-primary theme-primary-border admin-text admin-card"
                />
              </div>
              {actionError && (
                <p className="text-sm theme-danger">{actionError}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`${getButtonClasses("primary")} flex-1`}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Note"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNoteModal(false);
                    setNoteForm({ notes: "", jobId: "" });
                    setActionError(null);
                  }}
                  className={getButtonClasses("secondary")}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
