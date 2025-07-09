"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import JobForm from "../../components/JobForm";
import { useJob } from "@/app/hooks/useAdminData";

export default function EditJobPage() {
  const params = useParams();
  const jobId = params.id;

  const {
    data: jobData,
    isLoading: loading,
    isError,
    error: queryError,
  } = useJob(jobId);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isError) {
      setError(queryError?.message || "Failed to load job data");
    }
  }, [isError, queryError]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow border p-6">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-red-900 mb-2">
            Error Loading Job
          </h2>
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <JobForm jobId={jobId} initialData={jobData} />;
}
