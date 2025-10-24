"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import {
  ArrowLeft,
  UserCheck,
  Users,
  Briefcase,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  FileText,
} from "lucide-react";

export default function BulkSourcePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getButtonClasses } = useThemeClasses();

  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [sourceForm, setSourceForm] = useState({
    jobId: "",
    status: "Applied",
    notes: "",
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
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setResults(null);

    const sourceResults = {
      successful: [],
      failed: [],
      skipped: [],
    };

    // Source each candidate to the job
    for (const candidate of candidates) {
      try {
        const response = await fetch(
          `/api/admin/talent-pool/${candidate.id}/source`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jobId: sourceForm.jobId,
              status: sourceForm.status,
              notes: sourceForm.notes,
            }),
          }
        );

        const data = await response.json();

        if (response.ok) {
          sourceResults.successful.push({
            candidate,
            message: `Added to pipeline as ${sourceForm.status}`,
          });
        } else {
          if (data.error?.includes("already")) {
            sourceResults.skipped.push({
              candidate,
              reason: data.error,
            });
          } else {
            sourceResults.failed.push({
              candidate,
              error: data.error || "Failed to source candidate",
            });
          }
        }
      } catch (err) {
        sourceResults.failed.push({
          candidate,
          error: "Network error",
        });
      }
    }

    setResults(sourceResults);
    setSubmitting(false);
  };

  const statusOptions = [
    { value: "Applied", label: "Applied", color: "bg-blue-100 text-blue-700" },
    { value: "Reviewing", label: "Reviewing", color: "bg-yellow-100 text-yellow-700" },
    { value: "Interview", label: "Interview", color: "bg-purple-100 text-purple-700" },
    { value: "Hired", label: "Hired", color: "bg-green-100 text-green-700" },
    { value: "Rejected", label: "Rejected", color: "bg-red-100 text-red-700" },
  ];

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
        <h1 className="text-3xl font-bold admin-text">Bulk Add to Pipeline</h1>
        <p className="admin-text-light mt-1">
          Source {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} directly to a job pipeline
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
                {results.successful.length} Successfully Sourced
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

          <div className="flex gap-3 pt-4 border-t admin-border">
            <button
              onClick={() => router.push("/admin/talent-pool")}
              className={`${getButtonClasses("primary")} px-4 py-2 rounded-lg`}
            >
              Back to Talent Pool
            </button>
            {results.successful.length > 0 && (
              <button
                onClick={() => router.push(`/admin/applications?jobId=${sourceForm.jobId}`)}
                className={`${getButtonClasses("accent")} px-4 py-2 rounded-lg`}
              >
                View Applications
              </button>
            )}
          </div>
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
                    {candidate.current_title && (
                      <p className="text-xs admin-text-light">
                        {candidate.current_title}
                        {candidate.current_company && ` at ${candidate.current_company}`}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {candidate.skills && candidate.skills.length > 0 && (
                      <p className="text-xs admin-text-light mb-1">
                        {candidate.skills.length} skills
                      </p>
                    )}
                    {candidate.years_experience && (
                      <p className="text-xs admin-text-light">
                        {candidate.years_experience} yrs exp
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Source Form */}
          <form onSubmit={handleSubmit} className="admin-card border admin-border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold admin-text mb-3">Pipeline Details</h2>

            <div>
              <label className="block text-sm font-medium admin-text mb-1">
                Job Position <span className="text-red-500">*</span>
              </label>
              <select
                value={sourceForm.jobId}
                onChange={(e) => setSourceForm({ ...sourceForm, jobId: e.target.value })}
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
              <p className="text-xs admin-text-light mt-1">
                Candidates will be added directly to this job's application pipeline
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium admin-text mb-1">
                Initial Status <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {statusOptions.map((status) => (
                  <label
                    key={status.value}
                    className="relative flex items-center p-3 border admin-border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <input
                      type="radio"
                      value={status.value}
                      checked={sourceForm.status === status.value}
                      onChange={(e) => setSourceForm({ ...sourceForm, status: e.target.value })}
                      className="mr-3"
                    />
                    <span className={`px-2 py-1 text-xs rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs admin-text-light mt-2">
                Select the initial status for all sourced candidates
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium admin-text mb-1">
                <FileText className="inline h-4 w-4 mr-1" />
                Internal Notes (Optional)
              </label>
              <textarea
                value={sourceForm.notes}
                onChange={(e) => setSourceForm({ ...sourceForm, notes: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border admin-border rounded-lg admin-text admin-card focus:ring-2 theme-primary"
                placeholder="Add any notes about why these candidates were sourced, special considerations, etc."
              />
              <p className="text-xs admin-text-light mt-1">
                These notes will be added to each candidate's application and visible only to your team
              </p>
            </div>

            {/* Summary */}
            {sourceForm.jobId && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <h3 className="font-semibold admin-text mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Summary
                </h3>
                <p className="text-sm admin-text">
                  You are about to add <strong>{candidates.length} candidate{candidates.length !== 1 ? "s" : ""}</strong> to
                  the <strong>{jobs.find(j => j.id === sourceForm.jobId)?.title}</strong> pipeline
                  with status <strong>{sourceForm.status}</strong>.
                </p>
                <p className="text-xs admin-text-light mt-2">
                  Each candidate will receive an email notification about being added to the pipeline.
                </p>
              </div>
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
                disabled={submitting || !sourceForm.jobId}
                className={`${getButtonClasses("primary")} px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sourcing...
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4" />
                    Add {candidates.length} to Pipeline
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