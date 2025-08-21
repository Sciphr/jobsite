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
        const data = await response.json();
        ("Download URL received:", data.downloadUrl);

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
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl font-bold text-white">
                    {profile?.firstName?.charAt(0)}{profile?.lastName?.charAt(0)}
                  </span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-200 mb-1">
                    {profile?.firstName} {profile?.lastName}
                  </h1>
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                    <p className="text-gray-600 dark:text-gray-400 transition-colors duration-200">
                      {profile?.email}
                    </p>
                  </div>
                </div>
              </div>
              <ThemedButton
                onClick={() => signOut()}
                className="px-4 py-2 rounded-md text-sm font-medium text-white"
                variant="primary"
              >
                Sign Out
              </ThemedButton>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="px-6">
            <nav className="flex space-x-2 sm:space-x-4 lg:space-x-8 overflow-x-auto scrollbar-hide">
              {["overview", "resume", "saved-jobs", "applications", "notifications"].map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-shrink-0 py-4 px-2 sm:px-3 lg:px-1 border-b-2 font-medium text-xs sm:text-sm capitalize transition-colors duration-200 whitespace-nowrap ${
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
                  <div className="flex justify-end">
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
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-700 transition-colors duration-200">
                  <div className="flex items-start space-x-4">
                    {/* File Icon */}
                    <div className="flex-shrink-0">
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
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate transition-colors duration-200">
                        {resume.fileName}
                      </h3>
                      <div className="flex items-center space-x-4 mt-1">
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
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 transition-colors duration-200">
                        Uploaded on {formatDate(resume.uploadedAt)}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex-shrink-0 flex flex-col space-y-2 sm:space-y-2">
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                        <button
                          onClick={() => handleDownloadResume(resume.fileName)}
                          className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 text-white w-full sm:w-auto"
                          style={{
                            backgroundColor: 'var(--site-primary)',
                            borderColor: 'var(--site-primary)'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--site-primary-hover)'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--site-primary)'}
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
                          className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-red-400 transition-colors duration-200 w-full sm:w-auto"
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
                          className={`inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 cursor-pointer transition-colors duration-200 w-full ${
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
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center transition-colors duration-200">
                          Max: {maxResumeSize}MB, Types:{" "}
                          {allowedFileTypes.join(", ").toUpperCase()}
                        </p>
                      </div>
                    </div>
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
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white transition-colors duration-200">
                            {savedJob.jobs?.title || "Job Title Not Available"}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 transition-colors duration-200">
                            {savedJob.jobs?.department ||
                              "Department Not Available"}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400 transition-colors duration-200">
                            <span>
                              {savedJob.jobs?.location ||
                                "Location Not Available"}
                            </span>
                            <span>•</span>
                            <span>
                              {savedJob.jobs?.employmentType ||
                                "Type Not Available"}
                            </span>
                            <span>•</span>
                            <span>
                              {savedJob.jobs?.remotePolicy ||
                                "Policy Not Available"}
                            </span>
                          </div>
                          {savedJob.jobs?.salaryMin &&
                            savedJob.jobs?.salaryMax && (
                              <p className="text-green-600 dark:text-green-400 text-sm mt-1 transition-colors duration-200">
                                ${savedJob.jobs.salaryMin.toLocaleString()} - $
                                {savedJob.jobs.salaryMax.toLocaleString()}{" "}
                                {savedJob.jobs.salaryCurrency}
                              </p>
                            )}
                          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 transition-colors duration-200">
                            Saved on {formatDate(savedJob.savedAt)}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <ThemedButton
                            onClick={() =>
                              router.push(`/jobs/${savedJob.jobs?.slug}`)
                            }
                            className="px-3 py-1 rounded text-sm font-medium text-white"
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
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white transition-colors duration-200">
                            {application.job?.title ||
                              "Job Title Not Available"}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 transition-colors duration-200">
                            {application.job?.department ||
                              "Department Not Available"}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400 transition-colors duration-200">
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
                          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 transition-colors duration-200">
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
                          <ThemedButton
                            onClick={() =>
                              router.push(`/jobs/${application.job?.slug}`)
                            }
                            className="px-3 py-1 rounded text-sm font-medium text-white"
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
