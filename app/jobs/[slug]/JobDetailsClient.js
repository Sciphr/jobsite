"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Copy,
  Check,
  Heart,
  Loader2,
  UserPlus,
  Shield,
  Mail,
} from "lucide-react";
import { useSession } from "next-auth/react";
import JobApplicationForm from "./JobApplicationForm";
import { generateJobShareMailtoUrl } from "../../utils/emailTemplates";
import { formatDate, formatNumber } from "../../utils/dateFormat";
import { cleanHtmlForDisplay } from "../../utils/htmlSanitizer";
import {
  usePublicJob,
  useSavedJobStatus,
  useApplicationStatus,
  useSaveJobMutation,
} from "../../hooks/usePublicJobsData";
import { useQuery } from "@tanstack/react-query";

export default function JobDetailsClient({
  job: initialJob,
  allowGuestApplications,
  siteConfig,
}) {
  const [copied, setCopied] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const { data: session, status } = useSession();

  // Use React Query to get job data (with SSR fallback)
  const { data: job } = usePublicJob(initialJob?.slug, {
    initialData: initialJob,
  });

  // Use React Query for user-specific data
  const { data: savedData, isLoading: loadingSaved } = useSavedJobStatus(job?.id);
  const { data: applicationData, isLoading: loadingApplication } = useApplicationStatus(job?.id);
  
  // Use React Query for user profile (only if authenticated and showing application form)
  const { data: userProfile, isLoading: loadingProfile } = useQuery({
    queryKey: ["user", "profile"],
    queryFn: async () => {
      const response = await fetch("/api/profile");
      if (!response.ok) throw new Error("Failed to fetch profile");
      return response.json();
    },
    enabled: !!session?.user?.id && showApplicationForm,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Use React Query for user resumes (only if authenticated and showing application form)
  const { data: resumesData, isLoading: loadingResumes } = useQuery({
    queryKey: ["user", "resumes"],
    queryFn: async () => {
      const response = await fetch("/api/resumes");
      if (!response.ok) throw new Error("Failed to fetch resumes");
      return response.json();
    },
    enabled: !!session?.user?.id && showApplicationForm,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  // Extract data with fallbacks
  const isSaved = savedData?.isSaved || false;
  const hasApplied = applicationData?.hasApplied || false;
  const applicationStatus = applicationData?.status || null;
  const userResumes = resumesData?.resumes || [];

  // Use optimistic mutation for save/unsave
  const saveJobMutation = useSaveJobMutation();



  const handleSaveJob = async () => {
    if (!session?.user?.id) {
      window.location.href = "/auth/signin";
      return;
    }

    try {
      await saveJobMutation.mutateAsync({
        jobId: job.id,
        action: isSaved ? "unsave" : "save",
      });
      
      const action = isSaved ? "removed from" : "added to";
      console.log(`Job ${action} saved jobs`);
    } catch (error) {
      console.error("Error saving job:", error);
      alert("Failed to save job. Please try again.");
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleEmailShare = () => {
    try {
      const siteUrl = window.location.origin;
      const mailtoUrl = generateJobShareMailtoUrl(job, siteUrl);
      window.open(mailtoUrl, "_blank");
    } catch (err) {
      console.error("Failed to generate email:", err);
    }
  };

  const handleApplyClick = () => {
    // Check if user is logged in and has already applied
    if (session?.user?.id && hasApplied) {
      alert(
        `You have already applied to this position. Status: ${applicationStatus}`
      );
      return;
    }

    // Check guest application policy
    if (!session?.user?.id && !allowGuestApplications) {
      // Redirect to sign up/sign in page
      window.location.href =
        "/auth/signin?callbackUrl=" + encodeURIComponent(window.location.href);
      return;
    }

    // Allow application (both logged-in users and guests if allowed)
    setShowApplicationForm(true);
  };

  const handleApplicationSuccess = () => {
    setShowApplicationForm(false);

    // Show success message
    alert("Application submitted successfully!");

    // Invalidate application status to refresh from server
    // This will be handled automatically by React Query when the component re-renders
  };

  const renderApplyButton = () => {
    const isUserLoggedIn = !!session?.user?.id;
    const isLoading = loadingResumes || loadingProfile || loadingApplication;

    // If user is logged in and has already applied
    if (isUserLoggedIn && hasApplied) {
      return (
        <button
          className="w-full py-3 px-4 rounded-md bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700 font-medium mb-4 cursor-default transition-colors duration-200"
          disabled
        >
          <div className="flex items-center justify-center gap-2">
            <Check className="h-4 w-4" />
            Applied • {applicationStatus}
          </div>
        </button>
      );
    }

    // If loading user data
    if (isLoading) {
      return (
        <button
          className="w-full py-3 px-4 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium mb-4 cursor-not-allowed transition-colors duration-200"
          disabled
        >
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        </button>
      );
    }

    // If user is not logged in and guest applications are not allowed
    if (!isUserLoggedIn && !allowGuestApplications) {
      return (
        <div className="space-y-3 mb-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg transition-colors duration-200">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Account Required
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  You need to create an account to apply for this position.
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/auth/signin"
              className="flex items-center justify-center gap-2 py-3 px-4 text-white rounded-md transition-colors font-medium text-sm"
              style={{ backgroundColor: "var(--site-primary)" }}
              onMouseEnter={(e) =>
                (e.target.style.backgroundColor = "var(--site-primary-hover)")
              }
              onMouseLeave={(e) =>
                (e.target.style.backgroundColor = "var(--site-primary)")
              }
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="flex items-center justify-center gap-2 py-3 px-4 text-white rounded-md transition-colors font-medium text-sm"
              style={{ backgroundColor: "var(--site-success)" }}
              onMouseEnter={(e) =>
                (e.target.style.backgroundColor = "var(--site-success)")
              }
              onMouseLeave={(e) =>
                (e.target.style.backgroundColor = "var(--site-success)")
              }
            >
              <UserPlus className="h-4 w-4" />
              Sign Up
            </Link>
          </div>
        </div>
      );
    }

    // Standard apply button (logged in user or guest applications allowed)
    return (
      <button
        className="w-full py-3 px-4 rounded-md text-white transition-colors font-medium mb-4"
        style={{ backgroundColor: "var(--site-primary)" }}
        onMouseEnter={(e) =>
          (e.target.style.backgroundColor = "var(--site-primary-hover)")
        }
        onMouseLeave={(e) =>
          (e.target.style.backgroundColor = "var(--site-primary)")
        }
        onClick={handleApplyClick}
      >
        {isUserLoggedIn ? "Apply Now" : "Apply as Guest"}
      </button>
    );
  };

  const renderGuestApplicationNotice = () => {
    if (session?.user?.id || !allowGuestApplications) return null;

    return (
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors duration-200">
        <div className="flex items-start space-x-2">
          <UserPlus className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-800 dark:text-blue-200 font-medium">
              Applying as Guest
            </p>
            <p className="text-blue-700 dark:text-blue-300 mt-1">
              You can apply without an account, but{" "}
              <Link
                href="/auth/signup"
                className="underline hover:no-underline"
              >
                creating an account
              </Link>{" "}
              lets you track your applications and save jobs.
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Breadcrumb */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center space-x-2 text-sm">
            <Link
              href="/"
              className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
            >
              Home
            </Link>
            <span className="text-gray-400 dark:text-gray-500">/</span>
            <Link
              href="/jobs"
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
            >
              Jobs
            </Link>
            <span className="text-gray-400 dark:text-gray-500">/</span>
            <span className="text-gray-900 dark:text-white font-medium">
              {job.title}
            </span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transition-colors duration-200 overflow-hidden">
              {/* Job Header */}
              <div className="p-8 border-b border-gray-200 dark:border-gray-600">
                <div>
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white leading-tight">
                          {job.title}
                        </h1>
                        {job.featured && (
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg blur opacity-75"></div>
                            <span className="relative bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-sm px-3 py-1 rounded-lg font-medium shadow-lg">
                              ⭐ Featured
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-blue-600 dark:text-blue-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m0 0h1m-1 0v3m-1 0h1m0-3h3m-1 3h1"
                            />
                          </svg>
                        </div>
                        <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                          {job.department}
                        </span>
                        <span className="text-gray-400 dark:text-gray-500">
                          •
                        </span>
                        <span className="text-lg text-gray-600 dark:text-gray-400">
                          {job.location}
                        </span>
                      </div>

                      <div className="inline-flex items-center gap-2 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg px-4 py-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: "var(--site-primary)" }}
                        ></span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {job.categories.name}
                        </span>
                      </div>
                    </div>

                    {/* Save Job Button - Desktop */}
                    {session && (
                      <div className="hidden md:block">
                        <button
                          onClick={handleSaveJob}
                          disabled={saveJobMutation.isPending || loadingSaved}
                          className={`group flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                            isSaved
                              ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/50"
                              : "text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
                          } ${
                            saveJobMutation.isPending || loadingSaved
                              ? "opacity-50 cursor-not-allowed transform-none"
                              : ""
                          }`}
                        >
                          {saveJobMutation.isPending ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Heart
                              className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${
                                isSaved ? "fill-current animate-pulse" : ""
                              }`}
                            />
                          )}
                          <span className="font-medium">
                            {isSaved ? "Saved" : "Save Job"}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Job Key Details */}
                  <div className="flex flex-wrap items-center gap-3 mt-6">
                    <div className="inline-flex items-center gap-2 bg-white/60 dark:bg-gray-800/60 rounded-lg px-4 py-2 border border-gray-200/50 dark:border-gray-600/50">
                      <svg
                        className="w-4 h-4 text-blue-600 dark:text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v2a2 2 0 002 2H6a2 2 0 002-2V6"
                        />
                      </svg>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {job.employment_types?.name || job.employmentType}
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-2 bg-white/60 dark:bg-gray-800/60 rounded-lg px-4 py-2 border border-gray-200/50 dark:border-gray-600/50">
                      <svg
                        className="w-4 h-4 text-purple-600 dark:text-purple-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {job.experience_levels?.name || job.experienceLevel}
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-2 bg-white/60 dark:bg-gray-800/60 rounded-lg px-4 py-2 border border-gray-200/50 dark:border-gray-600/50">
                      <svg
                        className="w-4 h-4 text-green-600 dark:text-green-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {job.remote_policies?.name || (job.remotePolicy === "Remote"
                          ? "Remote Work"
                          : job.remotePolicy)}
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-2 bg-white/60 dark:bg-gray-800/60 rounded-lg px-4 py-2 border border-gray-200/50 dark:border-gray-600/50">
                      <svg
                        className="w-4 h-4 text-gray-500 dark:text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Posted {formatDate(job.postedAt)}
                      </span>
                    </div>

                    {job.applicationDeadline && (
                      <div className="inline-flex items-center gap-2 bg-orange-50 dark:bg-orange-900/30 rounded-lg px-4 py-2 border border-orange-200 dark:border-orange-700">
                        <svg
                          className="w-4 h-4 text-orange-600 dark:text-orange-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                          />
                        </svg>
                        <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                          Deadline: {formatDate(job.applicationDeadline)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="p-8 space-y-8">
                {/* Job Summary */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Job Overview
                  </h2>
                  <div className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed prose prose-lg dark:prose-invert max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: cleanHtmlForDisplay(job.summary) }} />
                  </div>
                </div>

                {/* Job Description */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Job Description
                  </h2>
                  <div className="prose prose-lg dark:prose-invert max-w-none">
                    <div
                      className="text-gray-700 dark:text-gray-300 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: cleanHtmlForDisplay(job.description) }}
                    />
                  </div>
                </div>

                {/* Salary Information */}
                {job.showSalary && job.salaryMin && job.salaryMax && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-green-600 dark:text-green-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                          />
                        </svg>
                      </div>
                      Compensation
                    </h2>
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-xl border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-green-600 dark:text-green-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                            Annual Salary Range
                          </p>
                          <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                            {job.salaryCurrency}{" "}
                            {job.salaryMin?.toLocaleString()} -{" "}
                            {job.salaryMax?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Requirements */}
                {job.requirements && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      Requirements
                    </h2>
                    <div className="prose prose-lg dark:prose-invert max-w-none">
                      <div
                        className="text-gray-700 dark:text-gray-300 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: cleanHtmlForDisplay(job.requirements) }}
                      />
                    </div>
                  </div>
                )}

                {/* Preferred Qualifications */}
                {job.preferredQualifications && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      Preferred Qualifications
                    </h2>
                    <div className="prose prose-lg dark:prose-invert max-w-none">
                      <div
                        className="text-gray-700 dark:text-gray-300 leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: job.preferredQualifications,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Benefits */}
                {job.benefits && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      Benefits & Perks
                    </h2>
                    <div className="prose prose-lg dark:prose-invert max-w-none">
                      <div
                        className="text-gray-700 dark:text-gray-300 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: job.benefits }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 mt-8 lg:mt-0">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sticky top-8 border border-gray-200 dark:border-gray-700 transition-colors duration-200 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-blue-600 dark:text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                      />
                    </svg>
                  </div>
                  Apply for this position
                </h3>
                {job.applicationDeadline && (
                  <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md transition-colors duration-200">
                    <p className="text-sm text-orange-800 dark:text-orange-200">
                      <span className="font-medium">Application Deadline:</span>
                      <br />
                      {formatDate(job.applicationDeadline)}
                    </p>
                  </div>
                )}

                {/* Guest Application Notice */}
                {renderGuestApplicationNotice()}

                {/* Apply Button or Application Form */}
                {showApplicationForm ? (
                  <JobApplicationForm
                    job={job}
                    user={userProfile}
                    userResumes={userResumes}
                    onSuccess={handleApplicationSuccess}
                    onCancel={() => setShowApplicationForm(false)}
                    allowGuestApplications={allowGuestApplications}
                  />
                ) : (
                  renderApplyButton()
                )}

                {/* Save Job Button - Mobile/Sidebar */}
                {session && !showApplicationForm && (
                  <button
                    onClick={handleSaveJob}
                    disabled={saveJobMutation.isPending || loadingSaved}
                    className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-md transition-colors duration-200 font-medium ${
                      isSaved
                        ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
                        : "text-white"
                    } ${
                      saveJobMutation.isPending || loadingSaved
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                    style={
                      !isSaved ? { backgroundColor: "var(--site-primary)" } : {}
                    }
                    onMouseEnter={
                      !isSaved
                        ? (e) =>
                            (e.target.style.backgroundColor =
                              "var(--site-primary-hover)")
                        : undefined
                    }
                    onMouseLeave={
                      !isSaved
                        ? (e) =>
                            (e.target.style.backgroundColor =
                              "var(--site-primary)")
                        : undefined
                    }
                  >
                    {saveJobMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Heart
                        className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`}
                      />
                    )}
                    {isSaved ? "Saved to Profile" : "Save Job"}
                  </button>
                )}
              </div>

              {/* Job Quick Info */}
              {!showApplicationForm && (
                <div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-purple-600 dark:text-purple-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    Quick Info
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        Department
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {job.department}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        Location
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {job.location}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        Type
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {job.employment_types?.name || job.employmentType}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        Experience
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {job.experience_levels?.name || job.experienceLevel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        Remote
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {job.remote_policies?.name || (job.remotePolicy === "Remote"
                          ? "Yes"
                          : job.remotePolicy)}
                      </span>
                    </div>
                    {/* Only show salary if job.showSalary is true */}
                    {job.showSalary && job.salaryMin && job.salaryMax && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="text-center">
                          <div className="text-sm text-green-600 dark:text-green-400 font-medium mb-1">
                            Salary Range
                          </div>
                          <div className="text-sm font-bold text-green-700 dark:text-green-300">
                            {job.salaryCurrency} {formatNumber(job.salaryMin)} -{" "}
                            {formatNumber(job.salaryMax)}
                          </div>
                        </div>
                      </div>
                    )}
                    {job.applicationDeadline && (
                      <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                        <span className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                          Deadline
                        </span>
                        <span className="text-sm font-bold text-orange-700 dark:text-orange-300">
                          {formatDate(job.applicationDeadline)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Share Job */}
              {!showApplicationForm && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Share Job
                  </h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCopyLink}
                      className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-3 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? "Copied!" : "Copy Link"}
                    </button>
                    <button
                      onClick={handleEmailShare}
                      className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-3 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <Mail size={16} />
                      Email
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Back to Jobs Link */}
        <div className="mt-8 text-center">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium dark:text-blue-400 dark:hover:text-blue-500 transition-colors duration-200 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 px-6 py-3 rounded-lg"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to All Jobs
          </Link>
        </div>
      </div>
    </div>
  );
}
