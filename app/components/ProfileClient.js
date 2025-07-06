"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

export default function ProfileClient({ session }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [profile, setProfile] = useState(null);
  const [savedJobs, setSavedJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    fetchProfileData();
  }, [session]);

  const fetchProfileData = async () => {
    try {
      const [profileRes, savedJobsRes, applicationsRes, resumeRes] =
        await Promise.all([
          fetch("/api/profile"),
          fetch("/api/saved-jobs"),
          fetch("/api/applications"),
          fetch("/api/resumes"), // Changed back to /api/resumes since that's your actual endpoint
        ]);

      const [profileData, savedJobsData, applicationsData, resumeData] =
        await Promise.all([
          profileRes.json(),
          savedJobsRes.json(),
          applicationsRes.json(),
          resumeRes.json(),
        ]);

      console.log("Saved Jobs Data:", savedJobsData); // Debug log
      console.log("Applications Data:", applicationsData); // Debug log
      console.log("Resume Data:", resumeData); // Debug log

      setProfile(profileData);
      setSavedJobs(savedJobsData);
      setApplications(applicationsData);

      // Handle resume data - it might be an array, so take the first one if it exists
      if (Array.isArray(resumeData) && resumeData.length > 0) {
        setResume(resumeData[0]);
      } else if (resumeData && !Array.isArray(resumeData)) {
        setResume(resumeData);
      } else {
        setResume(null);
      }

      // Initialize edit form with current data
      setEditForm({
        firstName: profileData.firstName || "",
        lastName: profileData.lastName || "",
        email: profileData.email || "",
        phone: profileData.phone || "",
      });
    } catch (err) {
      console.error("Error fetching profile data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a PDF or Word document");
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/resumes", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setResume(result.resume); // Set the resume from the response
        // Reset file input
        event.target.value = "";
      } else {
        const error = await response.json();
        alert(error.message || "Failed to upload resume");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload resume");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteResume = async () => {
    if (!confirm("Are you sure you want to delete this resume?")) return;

    try {
      const response = await fetch("/api/resumes", {
        method: "DELETE",
      });

      if (response.ok) {
        setResume(null);
      } else {
        alert("Failed to delete resume");
      }
    } catch (error) {
      console.error("Error deleting resume:", error);
      alert("Failed to delete resume");
    }
  };

  const handleDownloadResume = async (fileName) => {
    try {
      console.log("Downloading resume:", fileName);
      console.log("Storage path:", resume.storagePath);

      const response = await fetch(
        `/api/resume-download?path=${encodeURIComponent(resume.storagePath)}`
      );

      console.log("Download response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Download URL received:", data.downloadUrl);

        // Create a temporary link element for download
        const link = document.createElement("a");
        link.href = data.downloadUrl;
        link.download = fileName;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const errorData = await response.json();
        console.error("Download failed:", errorData);
        alert(`Failed to download resume: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error downloading resume:", error);
      alert("Failed to download resume");
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        setEditMode(false);
      }
    } catch (err) {
      console.error("Error updating profile:", err);
    }
  };

  const handleInputChange = (e) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value,
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "applied":
        return "bg-blue-100 text-blue-800";
      case "reviewing":
        return "bg-yellow-100 text-yellow-800";
      case "interview":
        return "bg-purple-100 text-purple-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "hired":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Skeleton */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
                  <div className="h-5 bg-gray-200 rounded w-64 animate-pulse"></div>
                </div>
                <div className="h-10 bg-gray-200 rounded w-20 animate-pulse"></div>
              </div>
            </div>

            {/* Navigation Tabs Skeleton */}
            <div className="px-6">
              <div className="flex space-x-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="py-4">
                    <div className="h-5 bg-gray-200 rounded w-20 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4">
              <div className="flex justify-between items-center mb-6">
                <div className="h-7 bg-gray-200 rounded w-40 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i}>
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                    <div className="h-5 bg-gray-200 rounded w-full animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Small loading indicator in bottom right */}
          <div className="fixed bottom-4 right-4 bg-white rounded-full p-3 shadow-lg border">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
              <span className="text-gray-600 text-sm font-medium">
                Loading...
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile?.firstName} {profile?.lastName}
                </h1>
                <p className="text-gray-600">{profile?.email}</p>
              </div>
              <button
                onClick={() => signOut()}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="px-6">
            <nav className="flex space-x-8">
              {["overview", "resume", "saved-jobs", "applications"].map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                      activeTab === tab
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {tab.replace("-", " ")}
                  </button>
                )
              )}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white shadow rounded-lg">
          {activeTab === "overview" && (
            <div className="px-6 py-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Profile Information
                </h2>
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <div className="space-x-2">
                    <button
                      onClick={() => setEditMode(false)}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {!editMode ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <p className="text-gray-900">
                      {profile?.firstName || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <p className="text-gray-900">
                      {profile?.lastName || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <p className="text-gray-900">{profile?.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <p className="text-gray-900">
                      {profile?.phone || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Member Since
                    </label>
                    <p className="text-gray-900">
                      {formatDate(profile?.createdAt)}
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleEditSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={editForm.firstName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={editForm.lastName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700  focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={editForm.email}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700  focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={editForm.phone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700  focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md text-sm font-medium"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === "resume" && (
            <div className="px-6 py-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  My Resume
                </h2>
                {(!resume || !resume.fileName || !resume.id) && (
                  <div className="flex items-center space-x-4">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="resume-upload"
                      disabled={uploading}
                    />
                    <label
                      htmlFor="resume-upload"
                      className={`bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium cursor-pointer ${
                        uploading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {uploading ? "Uploading..." : "Upload Resume"}
                    </label>
                  </div>
                )}
              </div>

              {!resume || !resume.fileName || !resume.id ? (
                <div className="text-center py-8">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-gray-500 mt-2">No resume uploaded yet.</p>
                  <p className="text-gray-400 text-sm">
                    Upload your resume to get started.
                  </p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                  <div className="flex items-start space-x-4">
                    {/* File Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-red-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* File Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {resume.fileName}
                      </h3>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {resume.fileType?.includes("pdf")
                            ? "PDF"
                            : resume.fileType?.includes("word")
                            ? "DOC"
                            : resume.fileType?.toUpperCase() || "UNKNOWN"}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatFileSize(resume.fileSize)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Uploaded on {formatDate(resume.uploadedAt)}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex-shrink-0 flex flex-col space-y-2">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleDownloadResume(resume.fileName)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                        >
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Download
                        </button>
                        <button
                          onClick={handleDeleteResume}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                        >
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          Delete
                        </button>
                      </div>

                      {/* Replace Button */}
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="resume-replace"
                          disabled={uploading}
                        />
                        <label
                          htmlFor="resume-replace"
                          className={`inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer transition-colors ${
                            uploading ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          {uploading ? (
                            <>
                              <svg
                                className="animate-spin w-4 h-4 mr-1"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Uploading...
                            </>
                          ) : (
                            <>
                              <svg
                                className="w-4 h-4 mr-1"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                                />
                              </svg>
                              Replace
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "saved-jobs" && (
            <div className="px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Saved Jobs ({savedJobs.length})
              </h2>
              {savedJobs.length === 0 ? (
                <div className="text-center py-8">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  <p className="text-gray-500 mt-2">No saved jobs yet.</p>
                  <p className="text-gray-400 text-sm">
                    Browse jobs and save the ones you're interested in.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedJobs.map((savedJob) => (
                    <div
                      key={savedJob.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">
                            {savedJob.job?.title || "Job Title Not Available"}
                          </h3>
                          <p className="text-gray-600">
                            {savedJob.job?.department ||
                              "Department Not Available"}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span>
                              {savedJob.job?.location ||
                                "Location Not Available"}
                            </span>
                            <span>•</span>
                            <span>
                              {savedJob.job?.employmentType ||
                                "Type Not Available"}
                            </span>
                            <span>•</span>
                            <span>
                              {savedJob.job?.remotePolicy ||
                                "Policy Not Available"}
                            </span>
                          </div>
                          {savedJob.job?.salaryMin &&
                            savedJob.job?.salaryMax && (
                              <p className="text-green-600 text-sm mt-1">
                                ${savedJob.job.salaryMin.toLocaleString()} - $
                                {savedJob.job.salaryMax.toLocaleString()}{" "}
                                {savedJob.job.salaryCurrency}
                              </p>
                            )}
                          <p className="text-gray-500 text-sm mt-2">
                            Saved on {formatDate(savedJob.savedAt)}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() =>
                              router.push(`/jobs/${savedJob.job?.slug}`)
                            }
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm font-medium"
                          >
                            View Job
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "applications" && (
            <div className="px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Job Applications ({applications.length})
              </h2>
              {applications.length === 0 ? (
                <div className="text-center py-8">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-gray-500 mt-2">No applications yet.</p>
                  <p className="text-gray-400 text-sm">
                    Apply to jobs to track your application status here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.map((application) => (
                    <div
                      key={application.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">
                            {application.job?.title ||
                              "Job Title Not Available"}
                          </h3>
                          <p className="text-gray-600">
                            {application.job?.department ||
                              "Department Not Available"}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span>
                              {application.job?.location ||
                                "Location Not Available"}
                            </span>
                            <span>•</span>
                            <span>
                              {application.job?.employmentType ||
                                "Type Not Available"}
                            </span>
                            <span>•</span>
                            <span>
                              {application.job?.remotePolicy ||
                                "Policy Not Available"}
                            </span>
                          </div>
                          <p className="text-gray-500 text-sm mt-2">
                            Applied on {formatDate(application.appliedAt)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                              application.status
                            )}`}
                          >
                            {application.status || "Applied"}
                          </span>
                          <button
                            onClick={() =>
                              router.push(`/jobs/${application.job?.slug}`)
                            }
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                          >
                            View Job
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
