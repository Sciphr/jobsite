"use client";
import { useState } from "react";

export default function FileUploadQuestion({ question, value, onChange, error }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "screening-answer");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      onChange({
        file_url: data.url,
        file_name: file.name,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadError("Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium mb-2">
        {question.question_text}
        {question.is_required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {question.help_text && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          {question.help_text}
        </p>
      )}
      <input
        type="file"
        onChange={handleFileChange}
        disabled={uploading}
        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          error ? "border-red-500" : "border-gray-300 dark:border-gray-600"
        } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100`}
        required={question.is_required}
      />
      {uploading && (
        <p className="text-sm text-blue-600 mt-1">Uploading...</p>
      )}
      {value?.file_name && !uploading && (
        <p className="text-sm text-green-600 mt-1">
          ✓ {value.file_name} uploaded
        </p>
      )}
      {uploadError && (
        <p className="text-red-500 text-sm mt-1">{uploadError}</p>
      )}
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
