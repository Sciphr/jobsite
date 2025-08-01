"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import JobForm from "../components/JobForm";
import { ResourcePermissionGuard } from "@/app/components/guards/PagePermissionGuard";
import {
  Briefcase,
  AlertCircle,
  Shield,
  ArrowLeft,
  Loader2,
  CheckCircle,
} from "lucide-react";

function CreateJobPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const [clonedJobData, setClonedJobData] = useState(null);
  const [loadingCloneData, setLoadingCloneData] = useState(false);

  useEffect(() => {
    // Check authentication and authorization
    if (status === "loading") return; // Still loading session

    if (!session) {
      router.push("/auth/signin?callbackUrl=/admin/jobs/create");
      return;
    }

    // Check if user has privilege level 2 or higher (Admin) to create jobs
    if (!session.user.privilegeLevel || session.user.privilegeLevel < 2) {
      setPermissionError(
        "You don't have permission to create jobs. Admin access required."
      );
      return;
    }

    setLoading(false);
  }, [session, status, router]);

  // ✅ NEW: Fetch job data for cloning
  useEffect(() => {
    const cloneJobId = searchParams.get('clone');
    
    if (cloneJobId && cloneJobId !== 'true' && !clonedJobData && !loadingCloneData) {
      console.log('Fetching job data for cloning:', cloneJobId);
      setLoadingCloneData(true);
      
      fetch(`/api/admin/jobs/${cloneJobId}`)
        .then(response => response.json())
        .then(data => {
          if (data) {
            console.log('Fetched job data for cloning:', data);
            // Prepare clone data
            const cloneData = {
              ...data,
              title: `${data.title} (Copy)`,
              slug: `${data.slug}-copy-${Date.now()}`,
              id: undefined,
              createdAt: undefined,
              updatedAt: undefined,
              applicationCount: undefined,
            };
            setClonedJobData(cloneData);
          }
        })
        .catch(error => {
          console.error('Error fetching job for cloning:', error);
        })
        .finally(() => {
          setLoadingCloneData(false);
        });
    }
  }, [searchParams, clonedJobData, loadingCloneData]);

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    setError(null);

    try {
      console.log("Submitting job data:", formData);

      const response = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        console.log("Job created successfully:", result);
        setSuccess(true);

        // Redirect to jobs list after a short delay
        setTimeout(() => {
          router.push("/admin/jobs");
        }, 2000);
      } else {
        console.error("Failed to create job:", result);
        // Stay on the form and show the error
        setError(
          result.message ||
            "Failed to create job. Please check the form and try again."
        );

        // Scroll to top to show error message
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (error) {
      console.error("Error creating job:", error);
      setError(
        "An unexpected error occurred. Please check your internet connection and try again."
      );

      // Scroll to top to show error message
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle form cancellation
  const handleCancel = () => {
    router.push("/admin/jobs");
  };

  // Show loading state while checking session or loading clone data
  if (status === "loading" || loading || loadingCloneData) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Loading...
            </h2>
            <p className="text-gray-600">
              {loadingCloneData 
                ? "Loading job data for cloning..." 
                : "Checking your permissions to create jobs"
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if user doesn't have permission
  if (permissionError && !success) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push("/admin/jobs")}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
              title="Back to jobs"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Create New Job
              </h1>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <Shield className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-red-900 mb-2">
            Access Denied
          </h2>
          <p className="text-red-700 mb-6 max-w-md mx-auto">{error}</p>
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => router.push("/admin/jobs")}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
            >
              Back to Jobs
            </button>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show success state
  if (success) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Job Created Successfully!
            </h2>
            <p className="text-gray-600 mb-4">
              Your job posting has been created. Redirecting to jobs list...
            </p>
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => router.push("/admin/jobs")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                View All Jobs
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render the job form for authorized users
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-gray-600">
        <button
          onClick={() => router.push("/admin/dashboard")}
          className="hover:text-gray-900 transition-colors duration-200"
        >
          Dashboard
        </button>
        <span>/</span>
        <button
          onClick={() => router.push("/admin/jobs")}
          className="hover:text-gray-900 transition-colors duration-200"
        >
          Jobs
        </button>
        <span>/</span>
        <span className="text-gray-900 font-medium">Create</span>
      </nav>

      {/* Page Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => router.push("/admin/jobs")}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
          title="Back to jobs"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {clonedJobData ? "Clone Job" : "Create New Job"}
          </h1>
          <p className="text-gray-600 mt-1">
            {clonedJobData 
              ? "Review and modify the cloned job information below"
              : "Fill out the form below to create a new job posting"
            }
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && !success && (
        <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-900 mb-1">
                Unable to Create Job
              </h3>
              <p className="text-sm text-red-700">{error}</p>
              <p className="text-xs text-red-600 mt-2">
                Please review the form below and fix any issues, then try
                submitting again.
              </p>
            </div>
            <button
              onClick={() => setError(null)}
              className="flex-shrink-0 p-1 text-red-400 hover:text-red-600 transition-colors duration-200"
              title="Dismiss error"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Success/Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="p-1 bg-blue-100 rounded-full mt-0.5">
            <Briefcase className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900 mb-1">
              {clonedJobData ? "Cloning job posting" : "Creating a new job posting"}
            </h3>
            <p className="text-sm text-blue-700">
              {clonedJobData 
                ? "The form has been pre-filled with data from the original job. Review and modify as needed before creating."
                : "Fill out all required fields below. You can save as a draft and publish later, or set the status to \"Active\" to publish immediately."
              }
            </p>
          </div>
        </div>
      </div>

      {/* Job Form */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <JobForm
          initialData={clonedJobData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitting={submitting}
        />
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Writing Tips</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Use clear, descriptive job titles</li>
              <li>• Include specific requirements and qualifications</li>
              <li>• Mention company culture and benefits</li>
              <li>• Be transparent about salary ranges</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Best Practices</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Use bullet points for easy reading</li>
              <li>• Keep descriptions concise but comprehensive</li>
              <li>• Include remote work policies clearly</li>
              <li>• Set realistic application deadlines</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreateJobPage() {
  return (
    <ResourcePermissionGuard 
      resource="jobs" 
      actions={["create"]}
      fallbackPath="/admin/dashboard"
    >
      <CreateJobPageContent />
    </ResourcePermissionGuard>
  );
}
