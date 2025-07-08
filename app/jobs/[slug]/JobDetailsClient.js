"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Copy, Check, Heart, Loader2, UserPlus, Shield } from "lucide-react";
import { useSession } from "next-auth/react";
import JobApplicationForm from "./JobApplicationForm";

export default function JobDetailsClient({
  job,
  allowGuestApplications,
  siteConfig,
}) {
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [userResumes, setUserResumes] = useState([]);
  const [loadingResumes, setLoadingResumes] = useState(false);
  const { data: session, status } = useSession();
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [checkingApplication, setCheckingApplication] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState(null);

  // Check if job is already saved when component mounts
  useEffect(() => {
    if (session?.user?.id && job.id) {
      checkSavedStatus();
    }
  }, [session, job.id]);

  useEffect(() => {
    if (session?.user?.id && job.id) {
      checkApplicationStatus();
    }
  }, [session, job.id]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserProfile();
    }
  }, [session]);

  const fetchUserProfile = async () => {
    try {
      setLoadingProfile(true);
      const response = await fetch("/api/profile");
      if (response.ok) {
        const profile = await response.json();
        setUserProfile(profile);
      } else {
        console.error("Failed to fetch user profile");
        setUserProfile(null);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setUserProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Fetch user resumes when user is authenticated
  useEffect(() => {
    if (session?.user?.id) {
      fetchUserResumes();
    }
  }, [session]);

  const fetchUserResumes = async () => {
    try {
      setLoadingResumes(true);
      const response = await fetch("/api/resumes");
      if (response.ok) {
        const resumes = await response.json();
        setUserResumes(resumes);
      } else {
        console.error("Failed to fetch resumes");
        setUserResumes([]);
      }
    } catch (error) {
      console.error("Error fetching user resumes:", error);
      setUserResumes([]);
    } finally {
      setLoadingResumes(false);
    }
  };

  const checkSavedStatus = async () => {
    try {
      setCheckingStatus(true);
      const response = await fetch(`/api/saved-jobs?jobId=${job.id}`);
      if (response.ok) {
        const data = await response.json();
        setIsSaved(data.isSaved);
      }
    } catch (error) {
      console.error("Error checking saved status:", error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const checkApplicationStatus = async () => {
    try {
      setCheckingApplication(true);
      const response = await fetch(`/api/applications?jobId=${job.id}`);
      if (response.ok) {
        const data = await response.json();
        setHasApplied(data.hasApplied);
        setApplicationStatus(data.status || null);
      } else {
        setHasApplied(false);
        setApplicationStatus(null);
      }
    } catch (error) {
      console.error("Error checking application status:", error);
      setHasApplied(false);
      setApplicationStatus(null);
    } finally {
      setCheckingApplication(false);
    }
  };

  const handleSaveJob = async () => {
    if (!session?.user?.id) {
      window.location.href = "/auth/signin";
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/saved-jobs", {
        method: isSaved ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId: job.id,
        }),
      });

      if (response.ok) {
        setIsSaved(!isSaved);
        const action = isSaved ? "removed from" : "added to";
        `Job ${action} saved jobs`;
      } else {
        const error = await response.json();
        console.error("Error saving job:", error);
      }
    } catch (error) {
      console.error("Error saving job:", error);
    } finally {
      setIsLoading(false);
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
    setHasApplied(true);
    setApplicationStatus("Applied");

    // Show success message
    alert("Application submitted successfully!");

    // Optional: Re-check application status from server to ensure consistency
    setTimeout(() => {
      checkApplicationStatus();
    }, 1000);
  };

  const renderApplyButton = () => {
    const isUserLoggedIn = !!session?.user?.id;
    const isLoading = loadingResumes || loadingProfile || checkingApplication;

    // If user is logged in and has already applied
    if (isUserLoggedIn && hasApplied) {
      return (
        <button
          className="w-full py-3 px-4 rounded-md bg-green-100 text-green-800 border border-green-200 font-medium mb-4 cursor-default"
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
          className="w-full py-3 px-4 rounded-md bg-gray-100 text-gray-600 font-medium mb-4 cursor-not-allowed"
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
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-amber-800">
                  Account Required
                </h4>
                <p className="text-sm text-amber-700 mt-1">
                  You need to create an account to apply for this position.
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/auth/signin"
              className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="flex items-center justify-center gap-2 py-3 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium text-sm"
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
        className="w-full py-3 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium mb-4"
        onClick={handleApplyClick}
      >
        {isUserLoggedIn ? "Apply Now" : "Apply as Guest"}
      </button>
    );
  };

  const renderGuestApplicationNotice = () => {
    if (session?.user?.id || !allowGuestApplications) return null;

    return (
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <UserPlus className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-800 font-medium">Applying as Guest</p>
            <p className="text-blue-700 mt-1">
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
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-gray-500 hover:text-gray-800">
              Home
            </Link>
            <span className="text-gray-400">/</span>
            <Link href="/jobs" className="text-gray-500 hover:text-gray-700">
              Jobs
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium">{job.title}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-8">
              {/* Job Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-gray-900">
                      {job.title}
                    </h1>
                    {job.featured && (
                      <span className="bg-yellow-100 text-yellow-800 text-sm px-3 py-1 rounded-full">
                        Featured
                      </span>
                    )}
                  </div>

                  {/* Save Job Button - Desktop */}
                  {session && (
                    <div className="hidden md:block">
                      <button
                        onClick={handleSaveJob}
                        disabled={isLoading || checkingStatus}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
                          isSaved
                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        } ${
                          isLoading || checkingStatus
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Heart
                            className={`h-4 w-4 ${
                              isSaved ? "fill-current" : ""
                            }`}
                          />
                        )}
                        {isSaved ? "Saved" : "Save Job"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-gray-600 mb-4">
                  <span className="font-medium">{job.department}</span>
                  <span className="text-gray-400">•</span>
                  <span>{job.location}</span>
                  <span className="text-gray-400">•</span>
                  <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
                    {job.category.name}
                  </span>
                </div>
                <p className="text-gray-700 text-lg leading-relaxed">
                  {job.summary}
                </p>
              </div>

              {/* Job Details */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8 p-6 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Employment Type
                  </h3>
                  <p className="text-gray-600">{job.employmentType}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Experience Level
                  </h3>
                  <p className="text-gray-600">{job.experienceLevel}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Years Experience
                  </h3>
                  <p className="text-gray-600">
                    {job.yearsExperienceRequired || "Not specified"}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Remote Policy
                  </h3>
                  <p className="text-gray-600">{job.remotePolicy}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Education Required
                  </h3>
                  <p className="text-gray-600">
                    {job.educationRequired || "Not specified"}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Posted Date
                  </h3>
                  <p className="text-gray-600">
                    {new Date(job.postedAt).toLocaleDateString()}
                  </p>
                </div>
                {job.startDate && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Start Date
                    </h3>
                    <p className="text-gray-600">
                      {new Date(job.startDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Status</h3>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      job.status === "Active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {job.status}
                  </span>
                </div>
              </div>

              {/* Salary Information */}
              {job.showSalary && job.salaryMin && job.salaryMax && (
                <div className="mb-8 p-6 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Salary Range
                  </h3>
                  <p className="text-2xl font-bold text-green-700">
                    {job.salaryCurrency} {job.salaryMin.toLocaleString()} -{" "}
                    {job.salaryMax.toLocaleString()}
                  </p>
                  {job.salaryPeriod && (
                    <p className="text-sm text-gray-600 mt-1">
                      per {job.salaryPeriod}
                    </p>
                  )}
                </div>
              )}

              {/* Job Description */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Job Description
                </h2>
                <div className="prose prose-lg max-w-none text-gray-700">
                  {job.description ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: job.description.replace(/\n/g, "<br />"),
                      }}
                    />
                  ) : (
                    <p>No detailed description available.</p>
                  )}
                </div>
              </div>

              {/* Requirements */}
              {job.requirements && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Requirements
                  </h2>
                  <div className="prose prose-lg max-w-none text-gray-700">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: job.requirements.replace(/\n/g, "<br />"),
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Preferred Qualifications */}
              {job.preferredQualifications && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Preferred Qualifications
                  </h2>
                  <div className="prose prose-lg max-w-none text-gray-700">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: job.preferredQualifications.replace(
                          /\n/g,
                          "<br />"
                        ),
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Benefits */}
              {job.benefits && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Benefits
                  </h2>
                  <div className="prose prose-lg max-w-none text-gray-700">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: job.benefits.replace(/\n/g, "<br />"),
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 mt-8 lg:mt-0">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Apply for this position
                </h3>
                {job.applicationDeadline && (
                  <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                    <p className="text-sm text-orange-800">
                      <span className="font-medium">Application Deadline:</span>
                      <br />
                      {new Date(job.applicationDeadline).toLocaleDateString()}
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
                    disabled={isLoading || checkingStatus}
                    className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-md transition-colors duration-200 font-medium ${
                      isSaved
                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    } ${
                      isLoading || checkingStatus
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {isLoading ? (
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
                <div className="border-t pt-6">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Quick Info
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Job Slug:</span>
                      <span className="font-medium text-gray-900">
                        {job.slug}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Department:</span>
                      <span className="font-medium text-gray-900">
                        {job.department}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Location:</span>
                      <span className="font-medium text-gray-900">
                        {job.location}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium text-gray-900">
                        {job.employmentType}
                      </span>
                    </div>
                    {/* Only show salary if job.showSalary is true */}
                    {job.showSalary && job.salaryMin && job.salaryMax && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Salary:</span>
                        <span className="font-medium text-gray-900">
                          {job.salaryCurrency} {job.salaryMin.toLocaleString()}{" "}
                          - {job.salaryMax.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {job.applicationDeadline && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Deadline:</span>
                        <span className="font-medium text-gray-900">
                          {new Date(
                            job.applicationDeadline
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Share Job */}
              {!showApplicationForm && (
                <div className="border-t pt-6 mt-6">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Share Job
                  </h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCopyLink}
                      className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-md hover:bg-gray-200 transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? "Copied!" : "Copy Link"}
                    </button>
                    <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-md hover:bg-gray-200 transition-colors text-sm">
                      Email
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Back to Jobs Link */}
        <div className="mt-8">
          <Link
            href="/jobs"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
            <svg
              className="w-5 h-5 mr-2"
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
