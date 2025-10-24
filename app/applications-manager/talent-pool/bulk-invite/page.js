"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import {
  ArrowLeft,
  Send,
  Users,
  Briefcase,
  Mail,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  AlertCircle,
} from "lucide-react";

export default function BulkInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { getButtonClasses } = useThemeClasses();

  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [inviteForm, setInviteForm] = useState({
    jobId: "",
    templateId: "",
    subject: "",
    content: "",
    customMessage: "",
  });

  const [results, setResults] = useState(null);

  // Get candidate IDs from URL
  const candidateIds = searchParams.get("candidates")?.split(",") || [];

  useEffect(() => {
    if (candidateIds.length === 0) {
      router.push("/admin/talent-pool");
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch candidates
      const candidatePromises = candidateIds.map((id) =>
        fetch(`/api/admin/talent-pool/${id}`).then((r) => r.json())
      );
      const candidateResponses = await Promise.all(candidatePromises);
      setCandidates(candidateResponses.map((r) => r.candidate));

      // Fetch jobs
      const jobsResponse = await fetch("/api/admin/jobs");
      const jobsData = await jobsResponse.json();
      const activeJobs = (jobsData.jobs || jobsData || [])
        .filter((job) => job.status === "Active");
      setJobs(activeJobs);

      // Fetch email templates
      const templatesResponse = await fetch("/api/admin/communication/templates");
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        const activeTemplates = (templatesData.data || templatesData.templates || [])
          .filter((t) => t.isActive);
        setEmailTemplates(activeTemplates);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (templateId) => {
    const template = emailTemplates.find((t) => t.id === templateId);
    if (template) {
      setInviteForm({
        ...inviteForm,
        templateId,
        subject: template.subject,
        content: template.content,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setResults(null);

    const inviteResults = {
      successful: [],
      failed: [],
      skipped: [],
    };

    // Send invitations to each candidate
    for (const candidate of candidates) {
      try {
        // Check if candidate already applied
        const response = await fetch(
          `/api/admin/talent-pool/${candidate.id}/invite`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jobId: inviteForm.jobId,
              subject: inviteForm.subject,
              content: inviteForm.content,
              customMessage: inviteForm.customMessage,
              templateId: inviteForm.templateId,
            }),
          }
        );

        const data = await response.json();

        if (response.ok) {
          inviteResults.successful.push({
            candidate,
            message: "Invitation sent successfully",
          });
        } else {
          if (data.error?.includes("already")) {
            inviteResults.skipped.push({
              candidate,
              reason: data.error,
            });
          } else {
            inviteResults.failed.push({
              candidate,
              error: data.error || "Failed to send invitation",
            });
          }
        }
      } catch (err) {
        inviteResults.failed.push({
          candidate,
          error: "Network error",
        });
      }
    }

    setResults(inviteResults);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto admin-text" />
          <p className="mt-3 admin-text">Loading candidates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push("/admin/talent-pool")}
          className="flex items-center gap-2 admin-text hover:theme-primary mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Talent Pool
        </button>
        <h1 className="text-3xl font-bold admin-text">Bulk Send Invitations</h1>
        <p className="admin-text-light mt-1">
          Send job invitations to {candidates.length} selected candidate{candidates.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Results Section */}
      {results && (
        <div className="admin-card border admin-border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-bold admin-text">Results Summary</h2>

          {results.successful.length > 0 && (
            <div className="border-l-4 border-green-500 pl-4">
              <div className="flex items-center gap-2 text-green-600 font-semibold mb-2">
                <CheckCircle className="h-5 w-5" />
                {results.successful.length} Successful
              </div>
              <ul className="space-y-1 text-sm admin-text-light">
                {results.successful.map((item, idx) => (
                  <li key={idx}>{item.candidate.name} - {item.message}</li>
                ))}
              </ul>
            </div>
          )}

          {results.skipped.length > 0 && (
            <div className="border-l-4 border-yellow-500 pl-4">
              <div className="flex items-center gap-2 text-yellow-600 font-semibold mb-2">
                <AlertCircle className="h-5 w-5" />
                {results.skipped.length} Skipped
              </div>
              <ul className="space-y-1 text-sm admin-text-light">
                {results.skipped.map((item, idx) => (
                  <li key={idx}>{item.candidate.name} - {item.reason}</li>
                ))}
              </ul>
            </div>
          )}

          {results.failed.length > 0 && (
            <div className="border-l-4 border-red-500 pl-4">
              <div className="flex items-center gap-2 text-red-600 font-semibold mb-2">
                <XCircle className="h-5 w-5" />
                {results.failed.length} Failed
              </div>
              <ul className="space-y-1 text-sm admin-text-light">
                {results.failed.map((item, idx) => (
                  <li key={idx}>{item.candidate.name} - {item.error}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => router.push("/admin/talent-pool")}
            className={`${getButtonClasses("primary")} px-4 py-2 rounded-lg`}
          >
            Back to Talent Pool
          </button>
        </div>
      )}

      {/* Form Section */}
      {!results && (
        <>
          {/* Selected Candidates */}
          <div className="admin-card border admin-border rounded-lg p-6">
            <h2 className="text-lg font-semibold admin-text mb-3 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Selected Candidates
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {candidates.map((candidate) => (
                <div key={candidate.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium admin-text">{candidate.name}</p>
                    <p className="text-sm admin-text-light">{candidate.email}</p>
                    {candidate.location && (
                      <p className="text-xs admin-text-light">{candidate.location}</p>
                    )}
                  </div>
                  {candidate.available_for_opportunities && (
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      Available
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Invitation Form */}
          <form onSubmit={handleSubmit} className="admin-card border admin-border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold admin-text mb-3">Invitation Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium admin-text mb-1">
                  Job Position <span className="text-red-500">*</span>
                </label>
                <select
                  value={inviteForm.jobId}
                  onChange={(e) => setInviteForm({ ...inviteForm, jobId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border admin-border rounded-lg admin-text admin-card focus:ring-2 theme-primary"
                >
                  <option value="">Select a job</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} - {job.department} ({job.location})
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
                  className="w-full px-3 py-2 border admin-border rounded-lg admin-text admin-card focus:ring-2 theme-primary"
                >
                  <option value="">Select a template</option>
                  {emailTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} {template.isDefault ? "(Default)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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
                    className="w-full px-3 py-2 border admin-border rounded-lg admin-text admin-card focus:ring-2 theme-primary"
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
                    className="w-full px-3 py-2 border admin-border rounded-lg admin-text admin-card focus:ring-2 theme-primary font-mono text-sm"
                  />
                  <p className="text-xs admin-text-light mt-1">
                    Available variables: {"{{candidateName}}"}, {"{{jobTitle}}"}, {"{{companyName}}"}, {"{{inviterName}}"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium admin-text mb-1">
                    Personal Message (Optional)
                  </label>
                  <textarea
                    value={inviteForm.customMessage}
                    onChange={(e) => setInviteForm({ ...inviteForm, customMessage: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border admin-border rounded-lg admin-text admin-card focus:ring-2 theme-primary"
                    placeholder="Add a personal note to make the invitation more engaging..."
                  />
                </div>

                {/* Preview Toggle */}
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-sm theme-primary hover:underline flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  {showPreview ? "Hide" : "Show"} Email Preview
                </button>

                {showPreview && candidates.length > 0 && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border admin-border">
                    <h3 className="font-semibold admin-text mb-3">
                      Preview for: {candidates[0].name}
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs admin-text-light font-semibold">SUBJECT:</span>
                        <p className="text-sm admin-text">{inviteForm.subject}</p>
                      </div>
                      <div>
                        <span className="text-xs admin-text-light font-semibold">CONTENT:</span>
                        <div className="mt-2 p-3 bg-white dark:bg-gray-900 rounded border admin-border">
                          <div className="text-sm admin-text whitespace-pre-wrap">
                            {inviteForm.content
                              .replace(/\{\{candidateName\}\}/g, candidates[0].name)
                              .replace(/\{\{jobTitle\}\}/g, jobs.find(j => j.id === inviteForm.jobId)?.title || "[Job Title]")
                              .replace(/\{\{companyName\}\}/g, "Your Company")
                              .replace(/\{\{inviterName\}\}/g, session?.user?.name || session?.user?.email)}
                          </div>
                          {inviteForm.customMessage && (
                            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                              <p className="text-xs admin-text-light mb-1">Personal Message:</p>
                              <p className="text-sm admin-text">{inviteForm.customMessage}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t admin-border">
              <button
                type="button"
                onClick={() => router.push("/admin/talent-pool")}
                className={`${getButtonClasses("secondary")} px-4 py-2 rounded-lg`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !inviteForm.jobId || !inviteForm.templateId}
                className={`${getButtonClasses("success")} px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send {candidates.length} Invitation{candidates.length !== 1 ? "s" : ""}
                  </>
                )}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}