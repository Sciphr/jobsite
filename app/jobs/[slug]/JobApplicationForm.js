"use client";
import { useState } from "react";
import { Upload, FileText, X } from "lucide-react";

export default function JobApplicationForm({
  job,
  user,
  userResume,
  onSuccess,
  onCancel,
}) {
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    resumeUrl: userResume?.storagePath || "",
    coverLetter: "",
  });
  const [resumeFile, setResumeFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    setResumeFile(e.target.files[0]);
    setForm({ ...form, resumeUrl: "" }); // Clear the default resumeUrl if uploading new
  };

  const removeFile = () => {
    setResumeFile(null);
    setForm({ ...form, resumeUrl: userResume?.storagePath || "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    let resumeUrl = form.resumeUrl;

    // If a new file is uploaded, upload it to your storage and get the URL
    if (resumeFile) {
      // TODO: Implement your upload logic here (e.g., upload to Supabase Storage or S3)
      // For now, just show an error if not implemented
      setError("Resume upload not implemented yet.");
      setSubmitting(false);
      return;
    }

    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, resumeUrl, jobId: job.id }),
    });
    setSubmitting(false);
    if (res.ok) {
      onSuccess && onSuccess();
    } else {
      const data = await res.json();
      setError(data.message || "Failed to apply.");
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
                      PDF, DOC, or DOCX (max 10MB)
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
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={submitting}
          >
            {submitting ? "Submitting Application..." : "Submit Application"}
          </button>
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
