"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import JobForm from "../components/JobForm";
import {
  Briefcase,
  AlertCircle,
  Shield,
  ArrowLeft,
  Loader2,
} from "lucide-react";

export default function CreateJobPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check authentication and authorization
    if (status === "loading") return; // Still loading session

    if (!session) {
      router.push("/auth/signin?callbackUrl=/admin/jobs/create");
      return;
    }

    // Check if user has privilege level 2 or higher (Admin) to create jobs
    if (!session.user.privilegeLevel || session.user.privilegeLevel < 2) {
      setError(
        "You don't have permission to create jobs. Admin access required."
      );
      return;
    }

    setLoading(false);
  }, [session, status, router]);

  // Show loading state while checking session
  if (status === "loading" || loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Loading...
            </h2>
            <p className="text-gray-600">
              Checking your permissions to create jobs
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if user doesn't have permission
  if (error) {
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

      {/* Success/Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="p-1 bg-blue-100 rounded-full mt-0.5">
            <Briefcase className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900 mb-1">
              Creating a new job posting
            </h3>
            <p className="text-sm text-blue-700">
              Fill out all required fields below. You can save as a draft and
              publish later, or set the status to "Active" to publish
              immediately.
            </p>
          </div>
        </div>
      </div>

      {/* Job Form */}
      <JobForm />

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

      {/* Additional Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          After Creating This Job
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 border border-gray-200 rounded-lg">
            <div className="text-2xl mb-2">📊</div>
            <h4 className="font-medium text-gray-900 mb-1">
              Track Applications
            </h4>
            <p className="text-sm text-gray-600">
              Monitor and manage applications as they come in
            </p>
          </div>
          <div className="text-center p-4 border border-gray-200 rounded-lg">
            <div className="text-2xl mb-2">🔍</div>
            <h4 className="font-medium text-gray-900 mb-1">
              Review Candidates
            </h4>
            <p className="text-sm text-gray-600">
              Screen resumes and schedule interviews
            </p>
          </div>
          <div className="text-center p-4 border border-gray-200 rounded-lg">
            <div className="text-2xl mb-2">📈</div>
            <h4 className="font-medium text-gray-900 mb-1">View Analytics</h4>
            <p className="text-sm text-gray-600">
              See job performance and application metrics
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
