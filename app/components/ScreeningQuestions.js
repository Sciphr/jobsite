// app/components/ScreeningQuestions.js
"use client";

import { useState } from "react";
import { Upload, X } from "lucide-react";

// Base question wrapper component
function QuestionWrapper({ question, children, error }) {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
        {question.question_text}
        {question.is_required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {question.help_text && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {question.help_text}
        </p>
      )}
      {children}
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}

// Short text input
export function TextQuestion({ question, value, onChange, error }) {
  return (
    <QuestionWrapper question={question} error={error}>
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder_text || ""}
        required={question.is_required}
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
      />
    </QuestionWrapper>
  );
}

// Long text / textarea
export function TextareaQuestion({ question, value, onChange, error }) {
  return (
    <QuestionWrapper question={question} error={error}>
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder_text || ""}
        required={question.is_required}
        rows={5}
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
      />
    </QuestionWrapper>
  );
}

// Multiple choice (radio buttons)
export function MultipleChoiceQuestion({ question, value, onChange, error }) {
  const options = question.options
    ? typeof question.options === "string"
      ? JSON.parse(question.options)
      : question.options
    : [];

  return (
    <QuestionWrapper question={question} error={error}>
      <div className="space-y-2">
        {options.map((option, index) => (
          <label
            key={index}
            className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
          >
            <input
              type="radio"
              name={question.id}
              value={option}
              checked={value === option}
              onChange={(e) => onChange(e.target.value)}
              required={question.is_required}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-3 text-gray-900 dark:text-gray-100">{option}</span>
          </label>
        ))}
      </div>
    </QuestionWrapper>
  );
}

// Checkboxes (multiple selection)
export function CheckboxQuestion({ question, value, onChange, error }) {
  const options = question.options
    ? typeof question.options === "string"
      ? JSON.parse(question.options)
      : question.options
    : [];

  const selectedValues = value || [];

  const handleCheckboxChange = (option) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter((v) => v !== option));
    } else {
      onChange([...selectedValues, option]);
    }
  };

  return (
    <QuestionWrapper question={question} error={error}>
      <div className="space-y-2">
        {options.map((option, index) => (
          <label
            key={index}
            className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              value={option}
              checked={selectedValues.includes(option)}
              onChange={() => handleCheckboxChange(option)}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
            />
            <span className="ml-3 text-gray-900 dark:text-gray-100">{option}</span>
          </label>
        ))}
      </div>
    </QuestionWrapper>
  );
}

// Yes/No question
export function YesNoQuestion({ question, value, onChange, error }) {
  return (
    <QuestionWrapper question={question} error={error}>
      <div className="flex gap-4">
        <label className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors flex-1">
          <input
            type="radio"
            name={question.id}
            value="yes"
            checked={value === "yes"}
            onChange={(e) => onChange(e.target.value)}
            required={question.is_required}
            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-3 text-gray-900 dark:text-gray-100">Yes</span>
        </label>
        <label className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors flex-1">
          <input
            type="radio"
            name={question.id}
            value="no"
            checked={value === "no"}
            onChange={(e) => onChange(e.target.value)}
            required={question.is_required}
            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-3 text-gray-900 dark:text-gray-100">No</span>
        </label>
      </div>
    </QuestionWrapper>
  );
}

// Date picker
export function DateQuestion({ question, value, onChange, error }) {
  return (
    <QuestionWrapper question={question} error={error}>
      <input
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        required={question.is_required}
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
      />
    </QuestionWrapper>
  );
}

// File upload
export function FileUploadQuestion({ question, value, onChange, error }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "screening_answer");

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      onChange({
        file_url: data.url,
        file_name: file.name,
      });
    } catch (err) {
      console.error("Error uploading file:", err);
      setUploadError("Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    onChange(null);
  };

  return (
    <QuestionWrapper question={question} error={error}>
      {value?.file_url ? (
        <div className="flex items-center justify-between p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded">
              <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {value.file_name}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">File uploaded</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemoveFile}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <div>
          <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer transition-colors bg-white dark:bg-gray-800">
            <div className="text-center">
              <Upload className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {uploading ? "Uploading..." : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                PDF, DOC, DOCX (max 10MB)
              </p>
            </div>
            <input
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.doc,.docx"
              required={question.is_required && !value}
              disabled={uploading}
            />
          </label>
          {uploadError && (
            <p className="text-red-500 text-sm mt-2">{uploadError}</p>
          )}
        </div>
      )}
    </QuestionWrapper>
  );
}
