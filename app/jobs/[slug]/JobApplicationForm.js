"use client";
import { useState, useEffect } from "react";
import { Upload, FileText, X, Loader2, Phone } from "lucide-react";

export default function JobApplicationForm({
  job,
  user,
  userResumes,
  onSuccess,
  onCancel,
}) {
  // Get the default/first resume from userResumes array
  const userResume =
    userResumes && userResumes.length > 0
      ? userResumes.find((resume) => resume.isDefault) || userResumes[0]
      : null;

  const [allowedFileTypes, setAllowedFileTypes] = useState([
    "pdf",
    "doc",
    "docx",
  ]);
  const [maxResumeSize, setMaxResumeSize] = useState(5);

  // Function to get the full name from user object
  const getUserFullName = (user) => {
    if (!user) return "";

    // If user has firstName and lastName (from profile API)
    if (user.firstName || user.lastName) {
      const firstName = user.firstName || "";
      const lastName = user.lastName || "";
      return `${firstName} ${lastName}`.trim();
    }

    // If user has name property (from session)
    if (user.name) {
      return user.name;
    }

    return "";
  };

  useEffect(() => {
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
      }
    };

    fetchUploadSettings();
  }, []);

  const [form, setForm] = useState({
    name: getUserFullName(user),
    email: user?.email || "",
    phone: user?.phone || "",
    resumeUrl: userResume?.storagePath || "",
    coverLetter: "",
  });

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        name: getUserFullName(user),
        email: user?.email || "",
        phone: user?.phone || "",
      }));
    }
  }, [user]);

  const [resumeFile, setResumeFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  
  // Phone number modal states
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneModalValue, setPhoneModalValue] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setResumeFile(file);
      setForm({ ...form, resumeUrl: "" }); // Clear the default resumeUrl if uploading new
    }
  };

  const removeFile = () => {
    setResumeFile(null);
    setForm({ ...form, resumeUrl: userResume?.storagePath || "" });
  };

  const uploadResumeFile = async () => {
    if (!resumeFile) return null;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", resumeFile);
      formData.append("jobId", job.id);

      const response = await fetch("/api/application-upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      return data.storagePath;
    } catch (error) {
      console.error("Resume upload error:", error);
      setError(error.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Check if phone number is needed and show modal
  const checkPhoneAndContinue = async (e) => {
    e.preventDefault();
    
    console.log('Phone check:', {
      hasUser: !!user,
      userPhone: user?.phone,
      userPhoneEmpty: !user?.phone || !user?.phone.trim(),
      formPhone: form.phone,
      formPhoneEmpty: !form.phone || !form.phone.trim(),
      shouldShowModal: user && (!user.phone || !user.phone.trim()) && (!form.phone || !form.phone.trim())
    });
    
    // For logged-in users, check if phone is missing
    if (user && (!user.phone || !user.phone.trim()) && (!form.phone || !form.phone.trim())) {
      console.log('Showing phone modal');
      setPhoneModalValue("");
      setShowPhoneModal(true);
      return;
    }
    
    // Continue with normal submission
    await handleSubmit();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    try {
      let resumeUrl = form.resumeUrl;

      // If a new file is uploaded, upload it first
      if (resumeFile) {
        resumeUrl = await uploadResumeFile();
        if (!resumeUrl) {
          setSubmitting(false);
          return; // Upload failed, error is already set
        }
      }

      if (!resumeUrl) {
        setError("Please upload a resume or use your profile resume");
        setSubmitting(false);
        return;
      }

      // Prepare application data
      let applicationData = {
        jobId: job.id,
        coverLetter: form.coverLetter,
        resumeUrl,
      };

      // For guest users, validate and include form data
      if (!user) {
        if (!form.name || !form.email || !form.phone) {
          setError("Please fill in all required fields");
          setSubmitting(false);
          return;
        }

        applicationData.name = form.name;
        applicationData.email = form.email;
        applicationData.phone = form.phone;
      }
      // For logged-in users, the API will pull data from their profile

      // Submit application
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(applicationData),
      });

      if (response.ok) {
        onSuccess && onSuccess();
      } else {
        const data = await response.json();
        setError(data.message || "Failed to submit application.");
      }
    } catch (error) {
      console.error("Application submission error:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Apply for {job.title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {user
            ? "Fill out the form below to submit your application"
            : "Create an account or apply as a guest by filling out the form below"}
        </p>
        {!user && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            💡 Want to save time?{" "}
            <button
              onClick={() => (window.location.href = "/auth/signin")}
              className="underline hover:no-underline"
            >
              Sign in
            </button>{" "}
            to auto-fill your information and track your applications.
          </p>
        )}
      </div>

      <form onSubmit={checkPhoneAndContinue} className="space-y-5">
        {/* Name Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Full Name *
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            readOnly={!!user} // Only read-only for logged-in users
            placeholder={
              user ? "Using your profile name" : "Enter your full name"
            }
            className={`w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              user ? "bg-gray-50 dark:bg-gray-600" : ""
            }`}
          />
          {user && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This will be pulled from your profile
            </p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email Address *
          </label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            readOnly={!!user}
            placeholder={
              user ? "Using your profile email" : "Enter your email address"
            }
            className={`w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              user ? "bg-gray-50 dark:bg-gray-600" : ""
            }`}
          />
          {user && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This will be pulled from your profile
            </p>
          )}
        </div>

        {/* Phone Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Phone Number *
          </label>
          <input
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            required={!user} // Only required for guest users
            readOnly={!!user}
            placeholder={
              user ? "Using your profile phone" : "Enter your phone number"
            }
            className={`w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              user ? "bg-gray-50 dark:bg-gray-600" : ""
            }`}
          />
          {user && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This will be pulled from your profile
            </p>
          )}
        </div>

        {/* Resume Upload Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Resume {!userResume && "*"}
          </label>

          {userResume && !resumeFile ? (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
              <div className="flex flex-col items-center space-y-3">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Using profile resume
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 break-words">
                      {userResume.fileName}
                    </p>
                  </div>
                </div>
                <label className="cursor-pointer bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors inline-flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload New Resume
                  <input
                    type="file"
                    accept={allowedFileTypes
                      .map((type) => `.${type}`)
                      .join(",")}
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* File Upload Area */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                <label className="cursor-pointer">
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto" />
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        Click to upload
                      </span>{" "}
                      or drag and drop
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {allowedFileTypes.join(", ").toUpperCase()} (max{" "}
                      {maxResumeSize}MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    accept={allowedFileTypes
                      .map((type) => `.${type}`)
                      .join(",")}
                    className="hidden"
                    onChange={handleFileChange}
                    required={!userResume}
                  />
                </label>
              </div>

              {/* Selected File Display */}
              {resumeFile && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="text-sm font-medium text-green-900 dark:text-green-100">
                          {resumeFile.name}
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300">
                          {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors"
                      disabled={uploading || submitting}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cover Letter Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Cover Letter (Optional)
          </label>
          <textarea
            name="coverLetter"
            value={form.coverLetter}
            onChange={handleChange}
            placeholder="Tell us why you're interested in this position and what makes you a great fit..."
            rows={4}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Optional but recommended to help your application stand out
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
            <div className="flex">
              <div className="text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="submit"
            className="flex-1 bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            disabled={submitting || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading Resume...
              </>
            ) : submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting Application...
              </>
            ) : (
              "Submit Application"
            )}
          </button>
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium"
            onClick={onCancel}
            disabled={submitting || uploading}
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Phone Number Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center space-x-3 mb-4">
              <Phone className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Phone Number Required
              </h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Please provide your phone number to complete your application. This will be saved to your profile for future use.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                value={phoneModalValue}
                onChange={(e) => setPhoneModalValue(e.target.value)}
                placeholder="Enter your phone number"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={savingPhone}
                required
              />
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={async () => {
                  if (!phoneModalValue.trim()) {
                    return;
                  }
                  
                  setSavingPhone(true);
                  
                  try {
                    // Update user's profile with phone number
                    const response = await fetch('/api/profile', {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email,
                        phone: phoneModalValue.trim(),
                      }),
                    });
                    
                    if (response.ok) {
                      // Update form with phone number
                      setForm(prev => ({ ...prev, phone: phoneModalValue.trim() }));
                      setShowPhoneModal(false);
                      
                      // Continue with submission
                      await handleSubmit();
                    } else {
                      setError('Failed to save phone number. Please try again.');
                    }
                  } catch (error) {
                    console.error('Error saving phone number:', error);
                    setError('An error occurred while saving your phone number.');
                  } finally {
                    setSavingPhone(false);
                  }
                }}
                className="flex-1 bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={!phoneModalValue.trim() || savingPhone}
              >
                {savingPhone ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save & Continue'
                )}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShowPhoneModal(false);
                  setPhoneModalValue('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium"
                disabled={savingPhone}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
