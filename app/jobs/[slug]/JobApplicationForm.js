"use client";
import { useState } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";

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

  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    resumeUrl: userResume?.storagePath || "",
    coverLetter: "",
  });
  const [resumeFile, setResumeFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

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

  const handleSubmit = async (e) => {
    e.preventDefault();
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

      // Validate required fields
      if (!form.name || !form.email || !form.phone) {
        setError("Please fill in all required fields");
        setSubmitting(false);
        return;
      }

      if (!resumeUrl) {
        setError("Please upload a resume or use your profile resume");
        setSubmitting(false);
        return;
      }

      // Submit application
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          resumeUrl,
          jobId: job.id,
        }),
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
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Apply for {job.title}
        </h3>
        <p className="text-sm text-gray-600">
          Fill out the form below to submit your application
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name *
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="Enter your full name"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Email Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address *
          </label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            placeholder="Enter your email address"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Phone Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number *
          </label>
          <input
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            required
            placeholder="Enter your phone number"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Resume Upload Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Resume {!userResume && "*"}
          </label>

          {userResume && !resumeFile ? (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Using profile resume
                    </p>
                    <p className="text-sm text-blue-700">
                      {userResume.fileName}
                    </p>
                  </div>
                </div>
                <label className="cursor-pointer bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 transition-colors">
                  Upload New
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* File Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center hover:border-blue-400 transition-colors">
                <label className="cursor-pointer">
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                    <div className="text-sm text-gray-600">
                      <span className="text-blue-600 font-medium">
                        Click to upload
                      </span>{" "}
                      or drag and drop
                    </div>
                    <p className="text-xs text-gray-500">
                      PDF, DOC, or DOCX (max 5MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleFileChange}
                    required={!userResume}
                  />
                </label>
              </div>

              {/* Selected File Display */}
              {resumeFile && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-900">
                          {resumeFile.name}
                        </p>
                        <p className="text-xs text-green-700">
                          {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="text-green-600 hover:text-green-800 transition-colors"
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cover Letter (Optional)
          </label>
          <textarea
            name="coverLetter"
            value={form.coverLetter}
            onChange={handleChange}
            placeholder="Tell us why you're interested in this position and what makes you a great fit..."
            rows={4}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            Optional but recommended to help your application stand out
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
            onClick={onCancel}
            disabled={submitting || uploading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
