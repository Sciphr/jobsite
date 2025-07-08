// Update your JobForm component to include missing required fields
"use client";

import { useState, useEffect } from "react";
import { useSetting } from "../../../hooks/useSettings";

export default function JobForm({
  initialData = null,
  onSubmit,
  onCancel,
  submitting = false,
}) {
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
  const { value: defaultCurrency } = useSetting("default_currency", "CAD");

  // Add categories state
  const [categories, setCategories] = useState([]);

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

  // Fetch categories
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/admin/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

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
            disabled={submitting}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 ${
              errors.title ? "border-red-500" : "border-gray-300"
            } ${submitting ? "bg-gray-100 cursor-not-allowed" : ""}`}
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
            disabled={submitting}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 ${
              errors.slug ? "border-red-500" : "border-gray-300"
            } ${submitting ? "bg-gray-100 cursor-not-allowed" : ""}`}
          />
          {errors.slug && (
            <p className="text-red-500 text-sm mt-1">{errors.slug}</p>
          )}
        </div>
      </div>

      {/* Department and Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Department *
          </label>
          <input
            type="text"
            name="department"
            value={formData.department}
            onChange={handleChange}
            disabled={submitting}
            placeholder="e.g., Engineering, Marketing, Sales"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 ${
              errors.department ? "border-red-500" : "border-gray-300"
            } ${submitting ? "bg-gray-100 cursor-not-allowed" : ""}`}
          />
          {errors.department && (
            <p className="text-red-500 text-sm mt-1">{errors.department}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location *
          </label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            disabled={submitting}
            placeholder="e.g., San Francisco, CA or Remote"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 ${
              errors.location ? "border-red-500" : "border-gray-300"
            } ${submitting ? "bg-gray-100 cursor-not-allowed" : ""}`}
          />
          {errors.location && (
            <p className="text-red-500 text-sm mt-1">{errors.location}</p>
          )}
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category *
        </label>
        <select
          name="categoryId"
          value={formData.categoryId}
          onChange={handleChange}
          disabled={submitting}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 ${
            errors.categoryId ? "border-red-500" : "border-gray-300"
          } ${submitting ? "bg-gray-100 cursor-not-allowed" : ""}`}
        >
          <option value="">Select a category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {errors.categoryId && (
          <p className="text-red-500 text-sm mt-1">{errors.categoryId}</p>
        )}
      </div>

      {/* Job Type and Experience */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Employment Type
          </label>
          <select
            name="employmentType"
            value={formData.employmentType}
            onChange={handleChange}
            disabled={submitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
          >
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Contract">Contract</option>
            <option value="Internship">Internship</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Experience Level
          </label>
          <select
            name="experienceLevel"
            value={formData.experienceLevel}
            onChange={handleChange}
            disabled={submitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
          >
            <option value="Entry">Entry</option>
            <option value="Mid">Mid</option>
            <option value="Senior">Senior</option>
            <option value="Executive">Executive</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Remote Policy
          </label>
          <select
            name="remotePolicy"
            value={formData.remotePolicy}
            onChange={handleChange}
            disabled={submitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
          >
            <option value="On-site">On-site</option>
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Job Description *
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          disabled={submitting}
          rows={6}
          placeholder="Provide a detailed description of the role..."
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 ${
            errors.description ? "border-red-500" : "border-gray-300"
          } ${submitting ? "bg-gray-100 cursor-not-allowed" : ""}`}
        />
        {errors.description && (
          <p className="text-red-500 text-sm mt-1">{errors.description}</p>
        )}
      </div>

      {/* Requirements */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Requirements *
        </label>
        <textarea
          name="requirements"
          value={formData.requirements}
          onChange={handleChange}
          disabled={submitting}
          rows={4}
          placeholder="List the key requirements for this position..."
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 ${
            errors.requirements ? "border-red-500" : "border-gray-300"
          } ${submitting ? "bg-gray-100 cursor-not-allowed" : ""}`}
        />
        {errors.requirements && (
          <p className="text-red-500 text-sm mt-1">{errors.requirements}</p>
        )}
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
            disabled={submitting}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 ${
              errors.salaryMin ? "border-red-500" : "border-gray-300"
            } ${submitting ? "bg-gray-100 cursor-not-allowed" : ""}`}
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
            disabled={submitting}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 ${
              errors.salaryMax ? "border-red-500" : "border-gray-300"
            } ${submitting ? "bg-gray-100 cursor-not-allowed" : ""}`}
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
            disabled={submitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
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
          Application Deadline{" "}
          {applicationDeadlineRequired && (
            <span className="text-red-500">*</span>
          )}
        </label>
        <input
          type="date"
          name="applicationDeadline"
          value={formData.applicationDeadline}
          onChange={handleChange}
          disabled={submitting}
          min={new Date().toISOString().split("T")[0]}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 ${
            errors.applicationDeadline
              ? "border-red-500 bg-red-50"
              : "border-gray-300"
          } ${submitting ? "bg-gray-100 cursor-not-allowed" : ""}`}
        />
        {errors.applicationDeadline && (
          <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            <strong>⚠️ {errors.applicationDeadline}</strong>
          </div>
        )}
        {applicationDeadlineRequired && !errors.applicationDeadline && (
          <p className="text-sm text-blue-600 mt-1 flex items-center">
            <svg
              className="h-4 w-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Application deadline is required by system settings
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
          disabled={submitting}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
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
        </ul>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {submitting && (
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
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
          )}
          <span>
            {submitting
              ? "Creating Job..."
              : initialData
              ? "Update Job"
              : "Create Job"}
          </span>
        </button>
      </div>
    </form>
  );
}
