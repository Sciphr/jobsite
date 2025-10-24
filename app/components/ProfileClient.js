"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { ThemedButton } from "./ThemedButton";
import NotificationsTab from "./NotificationsTab";

export default function ProfileClient({ session }) {
  const router = useRouter();
  const queryClient = useQueryClient();
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
    linkedinUrl: "",
    portfolioUrl: "",
    facebookUrl: "",
    twitterUrl: "",
    instagramUrl: "",
    blueskyUrl: "",
  });

  const [maxResumeSize, setMaxResumeSize] = useState(5);
  const [allowedFileTypes, setAllowedFileTypes] = useState([
    "pdf",
    "doc",
    "docx",
  ]);

  // Add these state variables after your existing useState declarations
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Add these functions after your existing functions (before the JSX return)
  const handlePasswordInputChange = (e) => {
    setPasswordForm({
      ...passwordForm,
      [e.target.name]: e.target.value,
    });
    // Clear errors when user starts typing
    if (passwordErrors[e.target.name]) {
      setPasswordErrors({
        ...passwordErrors,
        [e.target.name]: "",
      });
    }
  };

  const validatePasswordForm = () => {
    const errors = {};

    if (!passwordForm.currentPassword) {
      errors.currentPassword = "Current password is required";
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = "New password is required";
    } else if (passwordForm.newPassword.length < 6) {
      errors.newPassword = "Password must be at least 6 characters";
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = "Please confirm your new password";
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      errors.newPassword =
        "New password must be different from current password";
    }

    return errors;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    const errors = validatePasswordForm();
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setPasswordLoading(true);
    setPasswordErrors({});

    try {
      const response = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Success
        alert("Password changed successfully!");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setShowChangePassword(false);
      } else {
        // Handle specific errors
        if (result.field) {
          setPasswordErrors({ [result.field]: result.message });
        } else {
          setPasswordErrors({
            general: result.message || "Failed to change password",
          });
        }
      }
    } catch (error) {
      console.error("Error changing password:", error);
      setPasswordErrors({
        general: "An error occurred while changing password",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const resetPasswordForm = () => {
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordErrors({});
    setShowChangePassword(false);
  };

  useEffect(() => {
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    fetchProfileData();
  }, [session]);

  useEffect(() => {
    fetchUploadSettings();
  }, []);

  const fetchUploadSettings = async () => {
    try {
      const [sizeResponse, typesResponse] = await Promise.all([
        fetch("/api/settings/public?key=max_resume_size_mb"),
        fetch("/api/settings/public?key=allowed_resume_types"),
      ]);

      if (sizeResponse.ok) {
        const sizeSetting = await sizeResponse.json();
        if (
          sizeSetting.parsedValue !== null &&
          sizeSetting.parsedValue !== undefined
        ) {
          setMaxResumeSize(sizeSetting.parsedValue);
        }
      }

      if (typesResponse.ok) {
        const typesSetting = await typesResponse.json();
        if (
          typesSetting.parsedValue &&
          Array.isArray(typesSetting.parsedValue)
        ) {
          setAllowedFileTypes(typesSetting.parsedValue);
        }
      }
    } catch (error) {
      console.error("Error fetching upload settings:", error);
      // Keep default values on error
    }
  };

  const fetchProfileData = async () => {
    try {
      console.log("🔍 Starting to fetch profile data...");

      // Fetch all data with individual error handling
      const [profileRes, savedJobsRes, applicationsRes, resumeRes, notificationPrefsRes, jobAlertsRes, departmentsRes] =
        await Promise.all([
          fetch("/api/profile").catch((err) => {
            console.error("❌ Profile fetch failed:", err);
            return { ok: false, error: "Profile fetch failed" };
          }),
          fetch("/api/saved-jobs").catch((err) => {
            console.error("❌ Saved jobs fetch failed:", err);
            return { ok: false, error: "Saved jobs fetch failed" };
          }),
          fetch("/api/applications").catch((err) => {
            console.error("❌ Applications fetch failed:", err);
            return { ok: false, error: "Applications fetch failed" };
          }),
          fetch("/api/resumes").catch((err) => {
            console.error("❌ Resumes fetch failed:", err);
            return { ok: false, error: "Resumes fetch failed" };
          }),
          // Preload notifications data
          fetch("/api/user/notifications/preferences").catch((err) => {
            console.error("❌ Notification preferences fetch failed:", err);
            return { ok: false, error: "Notification preferences fetch failed" };
          }),
          fetch("/api/user/notifications/job-alerts").catch((err) => {
            console.error("❌ Job alerts fetch failed:", err);
            return { ok: false, error: "Job alerts fetch failed" };
          }),
          fetch("/api/jobs/departments").catch((err) => {
            console.error("❌ Departments fetch failed:", err);
            return { ok: false, error: "Departments fetch failed" };
          }),
        ]);

      console.log("📡 API Response statuses:", {
        profile: profileRes.ok ? profileRes.status : "FAILED",
        savedJobs: savedJobsRes.ok ? savedJobsRes.status : "FAILED",
        applications: applicationsRes.ok ? applicationsRes.status : "FAILED",
        resumes: resumeRes.ok ? resumeRes.status : "FAILED",
        notificationPrefs: notificationPrefsRes.ok ? notificationPrefsRes.status : "FAILED",
        jobAlerts: jobAlertsRes.ok ? jobAlertsRes.status : "FAILED",
        departments: departmentsRes.ok ? departmentsRes.status : "FAILED",
      });

      // Parse responses with individual error handling
      const parseResponse = async (response, name) => {
        if (!response.ok) {
          console.error(`❌ ${name} response not ok:`, response.status);
          return null;
        }

        try {
          const text = await response.text();
          console.log(`📄 ${name} response text length:`, text.length);

          if (!text || text.trim() === "") {
            console.error(`❌ ${name} response is empty`);
            return null;
          }

          const data = JSON.parse(text);
          console.log(`✅ ${name} parsed successfully`);
          return data;
        } catch (parseError) {
          console.error(`❌ Failed to parse ${name} JSON:`, parseError);
          console.error(
            `Raw ${name} response:`,
            await response.text().catch(() => "Could not get text")
          );
          return null;
        }
      };

      const [profileData, savedJobsData, applicationsData, resumeData, notificationPrefsData, jobAlertsData, departmentsData] =
        await Promise.all([
          parseResponse(profileRes, "Profile"),
          parseResponse(savedJobsRes, "Saved Jobs"),
          parseResponse(applicationsRes, "Applications"),
          parseResponse(resumeRes, "Resumes"),
          parseResponse(notificationPrefsRes, "Notification Preferences"),
          parseResponse(jobAlertsRes, "Job Alerts"),
          parseResponse(departmentsRes, "Departments"),
        ]);

      console.log("📊 Parsed data:", {
        profile: !!profileData,
        savedJobs: Array.isArray(savedJobsData)
          ? savedJobsData.length
          : "Not array",
        applications: Array.isArray(applicationsData)
          ? applicationsData.length
          : "Not array",
        resumes: Array.isArray(resumeData) ? resumeData.length : "Not array",
        notificationPrefs: !!notificationPrefsData,
        jobAlerts: !!jobAlertsData,
        departments: Array.isArray(departmentsData) ? departmentsData.length : "Not array",
      });

      // Set data with fallbacks
      if (profileData) {
        setProfile(profileData);
        // Initialize edit form with current data
        setEditForm({
          firstName: profileData.firstName || "",
          lastName: profileData.lastName || "",
          email: profileData.email || "",
          phone: profileData.phone || "",
          linkedinUrl: profileData.linkedin_url || "",
          portfolioUrl: profileData.portfolio_url || "",
          facebookUrl: profileData.facebook_url || "",
          twitterUrl: profileData.twitter_url || "",
          instagramUrl: profileData.instagram_url || "",
          blueskyUrl: profileData.bluesky_url || "",
        });
      } else {
        console.error("❌ Profile data is null, user might not be found");
        // Handle profile not found - maybe redirect to login
      }

      setSavedJobs(Array.isArray(savedJobsData) ? savedJobsData : []);
      setApplications(Array.isArray(applicationsData) ? applicationsData : []);

      // Handle resume data - it might be an array, so take the first one if it exists
      if (Array.isArray(resumeData) && resumeData.length > 0) {
        setResume(resumeData[0]);
      } else if (resumeData && !Array.isArray(resumeData)) {
        setResume(resumeData);
      } else {
        setResume(null);
      }

      // Prefill React Query cache with notifications data
      if (notificationPrefsData) {
        queryClient.setQueryData(['notifications', 'preferences'], notificationPrefsData);
        console.log("🔄 Prefilled notification preferences cache");
      }
      
      if (jobAlertsData) {
        queryClient.setQueryData(['notifications', 'jobAlerts'], jobAlertsData);
        console.log("🔄 Prefilled job alerts cache");
      }
      
      if (departmentsData) {
        queryClient.setQueryData(['jobs', 'departments'], departmentsData);
        console.log("🔄 Prefilled departments cache");
      }

      console.log("✅ Profile data fetch completed successfully");
    } catch (err) {
      console.error("❌ Error fetching profile data:", err);

      // Set empty/default values on error
      setSavedJobs([]);
      setApplications([]);
      setResume(null);
      
      // Set default values for React Query cache on error
      queryClient.setQueryData(['notifications', 'preferences'], {
        emailNotificationsEnabled: true,
        weeklyDigestEnabled: false,
        instantJobAlertsEnabled: false,
        notificationEmail: '',
      });
      queryClient.setQueryData(['notifications', 'jobAlerts'], { alerts: [] });
      queryClient.setQueryData(['jobs', 'departments'], []);

      // You might want to show an error message to the user
      alert("Failed to load profile data. Please try refreshing the page.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file type using settings
    const fileExtension = file.name.split(".").pop().toLowerCase();
    const typesToCheck = allowedFileTypes || ["pdf", "doc", "docx"]; // Fallback to defaults

    if (!typesToCheck.includes(fileExtension)) {
      alert(
        `File type not allowed. Please upload: ${typesToCheck
          .join(", ")
          .toUpperCase()}`
      );
      event.target.value = "";
      return;
    }

    // Check file size using settings
    const maxSizeBytes = maxResumeSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      alert(
        `File size exceeds the maximum allowed size of ${maxResumeSize}MB. Your file is ${(
          file.size /
          (1024 * 1024)
        ).toFixed(2)}MB.`
      );
      event.target.value = "";
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
        setResume(result.resume);
        event.target.value = "";
      } else {
        const error = await response.json();
        alert(error.error || "Failed to upload resume");
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
      ("Downloading resume:", fileName);
      ("Storage path:", resume.storagePath);

      const response = await fetch(
        `/api/resume-download?path=${encodeURIComponent(resume.storagePath)}`
      );

      ("Download response status:", response.status);

      if (response.ok) {
        // The response is now the file itself, not a JSON with URL
        const blob = await response.blob();
        console.log("File blob received, size:", blob.size);

        // Create a temporary link element for download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL object
        window.URL.revokeObjectURL(url);
      } else {
        // For error responses, try to parse JSON
        try {
          const errorData = await response.json();
          console.error("Download failed:", errorData);
          alert(`Failed to download resume: ${errorData.error}`);
        } catch {
          console.error("Download failed with status:", response.status);
          alert(`Failed to download resume: ${response.status}`);
        }
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
        return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300";
      case "reviewing":
        return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300";
      case "interview":
        return "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300";
      case "rejected":
        return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300";
      case "hired":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Skeleton */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6 transition-colors duration-200">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-48 mb-2 animate-pulse"></div>
                  <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-64 animate-pulse"></div>
                </div>
                <div className="h-10 bg-gray-200 dark:bg-gray-600 rounded w-20 animate-pulse"></div>
              </div>
            </div>

            {/* Navigation Tabs Skeleton */}
            <div className="px-6">
              <div className="flex space-x-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="py-4">
                    <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-20 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg transition-colors duration-200">
            <div className="px-6 py-4">
              <div className="flex justify-between items-center mb-6">
                <div className="h-7 bg-gray-200 dark:bg-gray-600 rounded w-40 animate-pulse"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-600 rounded w-24 animate-pulse"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i}>
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-24 mb-2 animate-pulse"></div>
                    <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-full animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Small loading indicator in bottom right */}
          <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
              <span className="text-gray-600 dark:text-gray-400 text-sm font-medium transition-colors duration-200">
                Loading...
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-xl mb-8 overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <div className="px-6 py-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600">
            <div className="flex justify-between items-center gap-3">
              <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <span className="text-lg sm:text-2xl font-bold text-white">
                    {profile?.firstName?.charAt(0)}{profile?.lastName?.charAt(0)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-200 mb-1 truncate">
                    {profile?.firstName} {profile?.lastName}
                  </h1>
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                    <p className="text-gray-600 dark:text-gray-400 transition-colors duration-200 truncate text-sm sm:text-base">
                      {profile?.email}
                    </p>
                  </div>
                </div>
              </div>
              <ThemedButton
                onClick={() => signOut()}
                className="px-3 py-2 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium text-white whitespace-nowrap flex-shrink-0"
                variant="primary"
              >
                Sign Out
              </ThemedButton>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="px-6">
            <nav className="flex space-x-1 sm:space-x-2 md:space-x-4 lg:space-x-6 overflow-x-auto scrollbar-hide">
              {["overview", "resume", "saved-jobs", "applications", "notifications"].map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-shrink-0 py-4 px-2 sm:px-3 md:px-4 border-b-2 font-medium text-xs sm:text-sm capitalize transition-colors duration-200 whitespace-nowrap min-w-0 ${
                      activeTab === tab
                        ? "site-primary-text hover:site-primary-text"
                        : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                    style={activeTab === tab ? {
                      borderBottomColor: 'var(--site-primary)',
                      color: 'var(--site-primary)'
                    } : {}}
                  >
                    {tab === "saved-jobs" ? "Saved" : tab === "applications" ? "Apps" : tab.replace("-", " ")}
                  </button>
                )
              )}
            </nav>
          </div>
        </div>

        {/* Profile Completion Prompt */}
        {profile && (
          (() => {
            const completedFields = [
              profile.firstName,
              profile.lastName, 
              profile.email,
              profile.phone
            ].filter(Boolean).length;
            const totalFields = 4;
            const completionPercentage = Math.round((completedFields / totalFields) * 100);
            const isIncomplete = completionPercentage < 100;
            
            return isIncomplete ? (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mb-6 transition-colors duration-200">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
                      Complete Your Profile
                    </h3>
                    <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
                      {!profile.phone ? (
                        <>Add your phone number to apply to jobs instantly! This information is required for job applications.</>
                      ) : (
                        <>Complete your profile information to improve your job application experience.</>
                      )}
                    </p>
                    
                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                        <span>Profile Completion</span>
                        <span className="font-medium">{completedFields} of {totalFields} fields complete ({completionPercentage}%)</span>
                      </div>
                      <div className="w-full bg-yellow-200 dark:bg-yellow-800 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-yellow-400 to-orange-500 dark:from-yellow-500 dark:to-orange-600 h-3 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${completionPercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Missing Fields */}
                    <div className="mt-3">
                      <div className="text-sm text-yellow-700 dark:text-yellow-300">
                        Missing: {[
                          !profile.firstName && 'First Name',
                          !profile.lastName && 'Last Name', 
                          !profile.email && 'Email',
                          !profile.phone && 'Phone Number'
                        ].filter(Boolean).join(', ')}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-4">
                      {!profile.phone ? (
                        <button
                          onClick={() => {
                            setActiveTab('overview');
                            setEditMode(true);
                          }}
                          className="bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span>Add Phone Number</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveTab('overview');
                            setEditMode(true);
                          }}
                          className="bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                        >
                          Complete Profile
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null;
          })()
        )}

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-xl border border-gray-200 dark:border-gray-700 transition-colors duration-200 overflow-hidden">
          {activeTab === "overview" && (
            <div className="px-6 py-4">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-200">
                    Profile Information
                  </h2>
                </div>
                {!editMode ? (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowChangePassword(!showChangePassword)}
                      className="bg-gray-600 dark:bg-gray-500 hover:bg-gray-700 dark:hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                    >
                      {showChangePassword ? "Cancel" : "Change Password"}
                    </button>
                    <ThemedButton
                      onClick={() => setEditMode(true)}
                      className="px-4 py-2 rounded-md text-sm font-medium text-white"
                      variant="primary"
                    >
                      Edit Profile
                    </ThemedButton>
                  </div>
                ) : (
                  <div className="space-x-2">
                    <button
                      onClick={() => setEditMode(false)}
                      className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Password Change Form */}
              {showChangePassword && !editMode && (
                <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors duration-200">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 transition-colors duration-200">
                    Change Password
                  </h3>

                  {passwordErrors.general && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md">
                      <p className="text-red-600 dark:text-red-400 text-sm">
                        {passwordErrors.general}
                      </p>
                    </div>
                  )}

                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200">
                        Current Password
                      </label>
                      <input
                        type="password"
                        name="currentPassword"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordInputChange}
                        className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-white focus:outline-none focus:ring-2 transition-colors duration-200 ${
                          passwordErrors.currentPassword
                            ? "border-red-300 dark:border-red-600 focus:ring-red-500"
                            : "border-gray-300 dark:border-gray-600 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                        }`}
                        placeholder="Enter your current password"
                      />
                      {passwordErrors.currentPassword && (
                        <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                          {passwordErrors.currentPassword}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200">
                        New Password
                      </label>
                      <input
                        type="password"
                        name="newPassword"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordInputChange}
                        className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-white focus:outline-none focus:ring-2 transition-colors duration-200 ${
                          passwordErrors.newPassword
                            ? "border-red-300 dark:border-red-600 focus:ring-red-500"
                            : "border-gray-300 dark:border-gray-600 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                        }`}
                        placeholder="Enter your new password (min 6 characters)"
                      />
                      {passwordErrors.newPassword && (
                        <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                          {passwordErrors.newPassword}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordInputChange}
                        className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-white focus:outline-none focus:ring-2 transition-colors duration-200 ${
                          passwordErrors.confirmPassword
                            ? "border-red-300 dark:border-red-600 focus:ring-red-500"
                            : "border-gray-300 dark:border-gray-600 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                        }`}
                        placeholder="Confirm your new password"
                      />
                      {passwordErrors.confirmPassword && (
                        <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                          {passwordErrors.confirmPassword}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <button
                        type="button"
                        onClick={resetPasswordForm}
                        className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                      >
                        Cancel
                      </button>
                      <ThemedButton
                        type="submit"
                        disabled={passwordLoading}
                        className="px-6 py-2 rounded-md text-sm font-medium text-white"
                        variant="primary"
                      >
                        {passwordLoading ? "Changing..." : "Change Password"}
                      </ThemedButton>
                    </div>
                  </form>
                </div>
              )}

              {/* Rest of your existing overview content */}
              {!editMode ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Your existing profile display fields remain the same */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 transition-colors duration-200">
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 transition-colors duration-200">
                        First Name
                      </label>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-200">
                        {profile?.firstName || "Not provided"}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 transition-colors duration-200">
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 transition-colors duration-200">
                        Last Name
                      </label>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-200">
                        {profile?.lastName || "Not provided"}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 transition-colors duration-200">
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 transition-colors duration-200">
                        Email Address
                      </label>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-200 break-all">
                        {profile?.email}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 transition-colors duration-200">
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 transition-colors duration-200">
                        Phone Number
                      </label>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-200">
                        {profile?.phone || "Not provided"}
                      </p>
                    </div>
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800 transition-colors duration-200">
                      <label className="block text-sm font-medium text-green-600 dark:text-green-400 mb-2 transition-colors duration-200">
                        Member Since
                      </label>
                      <p className="text-lg font-semibold text-green-700 dark:text-green-300 transition-colors duration-200">
                        {formatDate(profile?.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Social Profiles Section */}
                  <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-600">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    Social Profiles
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profile?.linkedin_url && (
                      <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-200 flex items-center gap-3">
                        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-200">LinkedIn</p>
                          <p className="text-xs text-blue-700 dark:text-blue-400 truncate">{profile.linkedin_url}</p>
                        </div>
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                    {profile?.portfolio_url && (
                      <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 transition-all duration-200 flex items-center gap-3">
                        <svg className="w-6 h-6 text-purple-600 dark:text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-purple-900 dark:text-purple-200">Portfolio</p>
                          <p className="text-xs text-purple-700 dark:text-purple-400 truncate">{profile.portfolio_url}</p>
                        </div>
                        <svg className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                    {profile?.facebook_url && (
                      <a href={profile.facebook_url} target="_blank" rel="noopener noreferrer" className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-200 flex items-center gap-3">
                        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-200">Facebook</p>
                          <p className="text-xs text-blue-700 dark:text-blue-400 truncate">{profile.facebook_url}</p>
                        </div>
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                    {profile?.twitter_url && (
                      <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer" className="bg-sky-50 dark:bg-sky-900/20 rounded-lg p-4 border border-sky-200 dark:border-sky-800 hover:border-sky-400 dark:hover:border-sky-600 transition-all duration-200 flex items-center gap-3">
                        <svg className="w-6 h-6 text-sky-600 dark:text-sky-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-sky-900 dark:text-sky-200">Twitter / X</p>
                          <p className="text-xs text-sky-700 dark:text-sky-400 truncate">{profile.twitter_url}</p>
                        </div>
                        <svg className="w-4 h-4 text-sky-600 dark:text-sky-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                    {profile?.instagram_url && (
                      <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer" className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 transition-all duration-200 flex items-center gap-3">
                        <svg className="w-6 h-6 text-pink-600 dark:text-pink-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-pink-900 dark:text-pink-200">Instagram</p>
                          <p className="text-xs text-pink-700 dark:text-pink-400 truncate">{profile.instagram_url}</p>
                        </div>
                        <svg className="w-4 h-4 text-pink-600 dark:text-pink-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                    {profile?.bluesky_url && (
                      <a href={profile.bluesky_url} target="_blank" rel="noopener noreferrer" className="bg-sky-50 dark:bg-sky-900/20 rounded-lg p-4 border border-sky-200 dark:border-sky-800 hover:border-sky-400 dark:hover:border-sky-600 transition-all duration-200 flex items-center gap-3">
                        <svg className="w-6 h-6 text-sky-600 dark:text-sky-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 01-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z"/>
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-sky-900 dark:text-sky-200">Bluesky</p>
                          <p className="text-xs text-sky-700 dark:text-sky-400 truncate">{profile.bluesky_url}</p>
                        </div>
                        <svg className="w-4 h-4 text-sky-600 dark:text-sky-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                    {!profile?.linkedin_url && !profile?.portfolio_url && !profile?.facebook_url && !profile?.twitter_url && !profile?.instagram_url && !profile?.bluesky_url && (
                      <div className="col-span-full text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                        <svg className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No social profiles added yet</p>
                        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Click "Edit Profile" to add your social profiles</p>
                      </div>
                    )}
                  </div>
                </div>
                </>
              ) : (
                <form onSubmit={handleEditSubmit} className="space-y-6">
                  {/* Your existing edit form remains the same */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200">
                        First Name
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={editForm.firstName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-colors duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={editForm.lastName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-colors duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={editForm.email}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-colors duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200">
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={editForm.phone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-colors duration-200"
                      />
                    </div>
                  </div>

                  {/* Social Profiles Section */}
                  <div className="pt-6 border-t border-gray-200 dark:border-gray-600">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      Social Profiles
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200 flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                          LinkedIn URL
                        </label>
                        <input
                          type="url"
                          name="linkedinUrl"
                          value={editForm.linkedinUrl}
                          onChange={handleInputChange}
                          placeholder="https://linkedin.com/in/yourprofile"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-colors duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200 flex items-center gap-2">
                          <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          </svg>
                          Portfolio URL
                        </label>
                        <input
                          type="url"
                          name="portfolioUrl"
                          value={editForm.portfolioUrl}
                          onChange={handleInputChange}
                          placeholder="https://yourportfolio.com"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-colors duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200 flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          Facebook URL
                        </label>
                        <input
                          type="url"
                          name="facebookUrl"
                          value={editForm.facebookUrl}
                          onChange={handleInputChange}
                          placeholder="https://facebook.com/yourprofile"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-colors duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200 flex items-center gap-2">
                          <svg className="w-4 h-4 text-sky-600 dark:text-sky-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                          Twitter / X URL
                        </label>
                        <input
                          type="url"
                          name="twitterUrl"
                          value={editForm.twitterUrl}
                          onChange={handleInputChange}
                          placeholder="https://twitter.com/yourhandle"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-colors duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200 flex items-center gap-2">
                          <svg className="w-4 h-4 text-pink-600 dark:text-pink-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                          </svg>
                          Instagram URL
                        </label>
                        <input
                          type="url"
                          name="instagramUrl"
                          value={editForm.instagramUrl}
                          onChange={handleInputChange}
                          placeholder="https://instagram.com/yourhandle"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-colors duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200 flex items-center gap-2">
                          <svg className="w-4 h-4 text-sky-600 dark:text-sky-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 01-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z"/>
                          </svg>
                          Bluesky URL
                        </label>
                        <input
                          type="url"
                          name="blueskyUrl"
                          value={editForm.blueskyUrl}
                          onChange={handleInputChange}
                          placeholder="https://bsky.app/profile/yourhandle"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-colors duration-200"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-6">
                    <ThemedButton
                      type="submit"
                      className="px-6 py-2 rounded-md text-sm font-medium text-white"
                      variant="primary"
                    >
                      Save Changes
                    </ThemedButton>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === "resume" && (
            <div className="px-6 py-4">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-200">
                    My Resume
                  </h2>
                </div>
                {(!resume || !resume.fileName || !resume.id) && (
                  <div className="flex items-center space-x-4">
                    <input
                      type="file"
                      accept={allowedFileTypes
                        .map((type) => `.${type}`)
                        .join(",")}
                      onChange={handleFileUpload}
                      className="hidden"
                      id="resume-upload"
                      disabled={uploading}
                    />
                    <ThemedButton
                      as="label"
                      htmlFor="resume-upload"
                      className={`px-4 py-2 rounded-md text-sm font-medium text-white cursor-pointer ${
                        uploading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      variant="primary"
                      disabled={uploading}
                    >
                      {uploading ? "Uploading..." : "Upload Resume"}
                    </ThemedButton>
                    <span className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-200">
                      Max: {maxResumeSize}MB
                    </span>
                  </div>
                )}
              </div>

              {!resume || !resume.fileName || !resume.id ? (
                <div className="text-center py-8">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 transition-colors duration-200"
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
                  <p className="text-gray-500 dark:text-gray-400 mt-2 transition-colors duration-200">
                    No resume uploaded yet.
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm transition-colors duration-200">
                    Upload your resume to get started.
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 transition-colors duration-200">
                    Maximum file size: {maxResumeSize}MB. Accepted formats:{" "}
                    {allowedFileTypes.join(", ").toUpperCase()}
                  </p>
                </div>
              ) : (
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 sm:p-6 bg-gray-50 dark:bg-gray-700 transition-colors duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-4">
                    {/* File Icon */}
                    <div className="flex-shrink-0 flex justify-center sm:block">
                      <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center transition-colors duration-200">
                        <svg
                          className="w-6 h-6 text-red-600 dark:text-red-400 transition-colors duration-200"
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
                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white transition-colors duration-200 break-words">
                        {resume.fileName}
                      </h3>
                      <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start space-y-1 sm:space-y-0 sm:space-x-4 mt-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 transition-colors duration-200">
                          {resume.fileType?.includes("pdf")
                            ? "PDF"
                            : resume.fileType?.includes("word")
                              ? "DOC"
                              : resume.fileType?.toUpperCase() || "UNKNOWN"}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-200">
                          {formatFileSize(resume.fileSize)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 transition-colors duration-200">
                        Uploaded on {formatDate(resume.uploadedAt)}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons - Moved below content */}
                  <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex flex-col sm:flex-row sm:justify-start space-y-2 sm:space-y-0 sm:space-x-3">
                      <button
                        onClick={() => handleDownloadResume(resume.fileName)}
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 text-white w-full sm:w-auto"
                        style={{
                          backgroundColor: 'var(--site-primary)',
                          borderColor: 'var(--site-primary)'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--site-primary-hover)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--site-primary)'}
                      >
                        <svg
                          className="w-4 h-4 mr-2"
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
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-red-400 transition-colors duration-200 w-full sm:w-auto"
                      >
                        <svg
                          className="w-4 h-4 mr-2"
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

                      {/* Replace Button */}
                      <div className="relative w-full sm:w-auto">
                        <input
                          type="file"
                          accept={allowedFileTypes
                            .map((type) => `.${type}`)
                            .join(",")}
                          onChange={handleFileUpload}
                          className="hidden"
                          id="resume-replace"
                          disabled={uploading}
                        />
                        <label
                          htmlFor="resume-replace"
                          className={`inline-flex items-center justify-center w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 cursor-pointer transition-colors duration-200 ${
                            uploading ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          {uploading ? (
                            <>
                              <svg
                                className="animate-spin w-4 h-4 mr-2"
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
                                className="w-4 h-4 mr-2"
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
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center transition-colors duration-200">
                      Max: {maxResumeSize}MB, Types: {allowedFileTypes.join(", ").toUpperCase()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "saved-jobs" && (
            <div className="px-6 py-4">
              <div className="flex items-center space-x-3 mb-8">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/50 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-200">
                  Saved Jobs ({savedJobs.length})
                </h2>
              </div>
              {savedJobs.length === 0 ? (
                <div className="text-center py-8">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 transition-colors duration-200"
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
                  <p className="text-gray-500 dark:text-gray-400 mt-2 transition-colors duration-200">
                    No saved jobs yet.
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm transition-colors duration-200">
                    Browse jobs and save the ones you're interested in.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedJobs.map((savedJob) => (
                    <div
                      key={savedJob.id}
                      className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-500 transition-colors duration-200"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-3 sm:space-y-0 sm:space-x-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white transition-colors duration-200 break-words">
                            {savedJob.jobs?.title || "Job Title Not Available"}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 transition-colors duration-200 mt-1">
                            {savedJob.jobs?.department ||
                              "Department Not Available"}
                          </p>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400 transition-colors duration-200 space-y-1 sm:space-y-0">
                            <span className="truncate">
                              {savedJob.jobs?.location ||
                                "Location Not Available"}
                            </span>
                            <div className="flex items-center space-x-2 sm:space-x-4">
                              <span className="hidden sm:inline">•</span>
                              <span className="truncate">
                                {savedJob.jobs?.employmentType ||
                                  "Type Not Available"}
                              </span>
                              <span>•</span>
                              <span className="truncate">
                                {savedJob.jobs?.remotePolicy ||
                                  "Policy Not Available"}
                              </span>
                            </div>
                          </div>
                          {savedJob.jobs?.salaryMin &&
                            savedJob.jobs?.salaryMax && (
                              <p className="text-green-600 dark:text-green-400 text-sm mt-2 font-medium transition-colors duration-200">
                                ${savedJob.jobs.salaryMin.toLocaleString()} - $
                                {savedJob.jobs.salaryMax.toLocaleString()}{" "}
                                {savedJob.jobs.salaryCurrency}
                              </p>
                            )}
                          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 transition-colors duration-200">
                            Saved on {formatDate(savedJob.savedAt)}
                          </p>
                        </div>
                        <div className="flex-shrink-0 flex justify-center sm:justify-end mt-2 sm:mt-0">
                          <ThemedButton
                            onClick={() =>
                              router.push(`/jobs/${savedJob.jobs?.slug}`)
                            }
                            className="px-4 py-2 rounded-md text-sm font-medium text-white w-full sm:w-24"
                            variant="primary"
                          >
                            View Job
                          </ThemedButton>
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
              <div className="flex items-center space-x-3 mb-8">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-200">
                  Job Applications ({applications.length})
                </h2>
              </div>
              {applications.length === 0 ? (
                <div className="text-center py-8">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 transition-colors duration-200"
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
                  <p className="text-gray-500 dark:text-gray-400 mt-2 transition-colors duration-200">
                    No applications yet.
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm transition-colors duration-200">
                    Apply to jobs to track your application status here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.map((application) => (
                    <div
                      key={application.id}
                      className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-500 transition-colors duration-200"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-3 sm:space-y-0 sm:space-x-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white transition-colors duration-200 break-words">
                              {application.job?.title ||
                                "Job Title Not Available"}
                            </h3>
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 sm:mt-0 sm:ml-3 self-start ${getStatusColor(
                                application.status
                              )}`}
                            >
                              {application.status || "Applied"}
                            </span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 transition-colors duration-200 mt-1">
                            {application.job?.department ||
                              "Department Not Available"}
                          </p>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400 transition-colors duration-200 space-y-1 sm:space-y-0">
                            <span className="truncate">
                              {application.job?.location ||
                                "Location Not Available"}
                            </span>
                            <div className="flex items-center space-x-2 sm:space-x-4">
                              <span className="hidden sm:inline">•</span>
                              <span className="truncate">
                                {application.job?.employmentType ||
                                  "Type Not Available"}
                              </span>
                              <span>•</span>
                              <span className="truncate">
                                {application.job?.remotePolicy ||
                                  "Policy Not Available"}
                              </span>
                            </div>
                          </div>
                          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 transition-colors duration-200">
                            Applied on {formatDate(application.appliedAt)}
                          </p>
                        </div>
                        <div className="flex-shrink-0 flex justify-center sm:justify-end mt-2 sm:mt-0">
                          <ThemedButton
                            onClick={() =>
                              router.push(`/jobs/${application.job?.slug}`)
                            }
                            className="px-4 py-2 rounded-md text-sm font-medium text-white w-full sm:w-24"
                            variant="primary"
                          >
                            View Job
                          </ThemedButton>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {activeTab === "notifications" && (
            <NotificationsTab />
          )}
        </div>
      </div>
    </div>
  );
}
