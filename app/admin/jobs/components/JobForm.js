// Add this to your job creation/editing form component
"use client";

import { useState, useEffect } from "react";
import { useSetting } from "../hooks/useSettings";

export default function JobForm({ initialData = null, onSubmit, onCancel }) {
  // Get settings that affect form validation and defaults
  const { value: requireSalaryRange } = useSetting(
    "require_salary_range",
    false
  );
  const { value: applicationDeadlineRequired } = useSetting(
    "application_deadline_required",
    false
  );
  const { value: autoPublishJobs } = useSetting("auto_publish_jobs", false);
  const { value: defaultExpirationDays } = useSetting(
    "job_expiration_days",
    60
  );
  const { value: defaultCurrency } = useSetting("default_currency", "CAD");

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    summary: "",
    department: "",
    employmentType: "Full-time",
    experienceLevel: "Mid",
    location: "",
    remotePolicy: "On-site",
    salaryMin: "",
    salaryMax: "",
    salaryCurrency: defaultCurrency,
    salaryType: "Annual",
    benefits: "",
    requirements: "",
    preferredQualifications: "",
    educationRequired: "",
    yearsExperienceRequired: "",
    applicationDeadline: "",
    startDate: "",
    applicationInstructions: "",
    status: autoPublishJobs ? "Active" : "Draft",
    featured: false,
    priority: 0,
    categoryId: "",
    ...initialData,
  });

  const [errors, setErrors] = useState({});

  // Update currency when default changes
  useEffect(() => {
    if (!initialData && defaultCurrency) {
      setFormData((prev) => ({ ...prev, salaryCurrency: defaultCurrency }));
    }
  }, [defaultCurrency, initialData]);

  // Update status when auto-publish setting changes
  useEffect(() => {
    if (!initialData) {
      setFormData((prev) => ({
        ...prev,
        status: autoPublishJobs ? "Active" : "Draft",
      }));
    }
  }, [autoPublishJobs, initialData]);

  const validateForm = () => {
    const newErrors = {};

    // Basic required fields
    if (!formData.title) newErrors.title = "Title is required";
    if (!formData.slug) newErrors.slug = "Slug is required";
    if (!formData.description)
      newErrors.description = "Description is required";
    if (!formData.department) newErrors.department = "Department is required";
    if (!formData.location) newErrors.location = "Location is required";
    if (!formData.requirements)
      newErrors.requirements = "Requirements are required";
    if (!formData.categoryId) newErrors.categoryId = "Category is required";

    // Settings-based validation
    if (requireSalaryRange) {
      if (!formData.salaryMin) {
        newErrors.salaryMin = "Minimum salary is required by system settings";
      }
      if (!formData.salaryMax) {
        newErrors.salaryMax = "Maximum salary is required by system settings";
      }
      if (
        formData.salaryMin &&
        formData.salaryMax &&
        parseFloat(formData.salaryMin) >= parseFloat(formData.salaryMax)
      ) {
        newErrors.salaryMax =
          "Maximum salary must be greater than minimum salary";
      }
    }

    if (applicationDeadlineRequired && !formData.applicationDeadline) {
      newErrors.applicationDeadline =
        "Application deadline is required by system settings";
    }

    // Validate application deadline is in the future
    if (formData.applicationDeadline) {
      const deadline = new Date(formData.applicationDeadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (deadline < today) {
        newErrors.applicationDeadline =
          "Application deadline must be in the future";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }

    // Auto-generate slug from title
    if (name === "title" && !initialData) {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim("-");
      setFormData((prev) => ({ ...prev, slug }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Job Title *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.title ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.title && (
            <p className="text-red-500 text-sm mt-1">{errors.title}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Slug *
          </label>
          <input
            type="text"
            name="slug"
            value={formData.slug}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.slug ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.slug && (
            <p className="text-red-500 text-sm mt-1">{errors.slug}</p>
          )}
        </div>
      </div>

      {/* Salary Section - with conditional required indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Salary {requireSalaryRange && "*"}
          </label>
          <input
            type="number"
            name="salaryMin"
            value={formData.salaryMin}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.salaryMin ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.salaryMin && (
            <p className="text-red-500 text-sm mt-1">{errors.salaryMin}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maximum Salary {requireSalaryRange && "*"}
          </label>
          <input
            type="number"
            name="salaryMax"
            value={formData.salaryMax}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.salaryMax ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.salaryMax && (
            <p className="text-red-500 text-sm mt-1">{errors.salaryMax}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Currency
          </label>
          <select
            name="salaryCurrency"
            value={formData.salaryCurrency}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="USD">USD - US Dollar</option>
            <option value="EUR">EUR - Euro</option>
            <option value="GBP">GBP - British Pound</option>
            <option value="CAD">CAD - Canadian Dollar</option>
            <option value="AUD">AUD - Australian Dollar</option>
            <option value="JPY">JPY - Japanese Yen</option>
          </select>
        </div>
      </div>

      {/* Application Deadline - with conditional required indicator */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Application Deadline {applicationDeadlineRequired && "*"}
        </label>
        <input
          type="date"
          name="applicationDeadline"
          value={formData.applicationDeadline}
          onChange={handleChange}
          min={new Date().toISOString().split("T")[0]}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.applicationDeadline ? "border-red-500" : "border-gray-300"
          }`}
        />
        {errors.applicationDeadline && (
          <p className="text-red-500 text-sm mt-1">
            {errors.applicationDeadline}
          </p>
        )}
        {applicationDeadlineRequired && (
          <p className="text-sm text-blue-600 mt-1">
            ⚠️ Application deadline is required by system settings
          </p>
        )}
      </div>

      {/* Status field with auto-publish indicator */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Status
        </label>
        <select
          name="status"
          value={formData.status}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="Draft">Draft</option>
          <option value="Active">Active</option>
          <option value="Paused">Paused</option>
          <option value="Closed">Closed</option>
        </select>
        {autoPublishJobs && (
          <p className="text-sm text-blue-600 mt-1">
            ✨ Auto-publish is enabled - new jobs will be published
            automatically
          </p>
        )}
      </div>

      {/* Settings Information Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">
          System Settings Applied:
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          {requireSalaryRange && <li>• Salary range is required</li>}
          {applicationDeadlineRequired && (
            <li>• Application deadline is required</li>
          )}
          {autoPublishJobs && (
            <li>• Jobs will be auto-published when created</li>
          )}
          <li>• Default currency: {defaultCurrency}</li>
          {defaultExpirationDays > 0 && (
            <li>• Jobs will auto-expire after {defaultExpirationDays} days</li>
          )}
        </ul>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {initialData ? "Update Job" : "Create Job"}
        </button>
      </div>
    </form>
  );
}
