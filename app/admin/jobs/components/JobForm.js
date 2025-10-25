// Update your JobForm component to include missing required fields
"use client";

import { useState, useEffect } from "react";
import { useSetting } from "../../../hooks/useSettings";
import { useThemeClasses } from "../../../contexts/AdminThemeContext";
import dynamic from "next/dynamic";

// Dynamically import react-simple-wysiwyg
const Editor = dynamic(() => import("react-simple-wysiwyg"), {
  ssr: false,
  loading: () => <div className="w-full h-32 border admin-border rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center admin-text">Loading editor...</div>
});

export default function JobForm({
  initialData = null,
  onSubmit,
  onCancel,
  submitting = false,
}) {
  // Get theme classes
  const { getButtonClasses } = useThemeClasses();
  
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
  const { value: showSalaryByDefault } = useSetting(
    "show_salary_by_default",
    true
  );

  // Add categories and job attributes state
  const [categories, setCategories] = useState([]);
  const [jobAttributes, setJobAttributes] = useState({
    employmentTypes: [],
    experienceLevels: [],
    remotePolicies: []
  });

  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    slug: initialData?.slug || "",
    description: initialData?.description || "",
    summary: initialData?.summary || "",
    department: initialData?.department || "",
    employment_type_id: initialData?.employment_type_id || initialData?.employment_types?.id || "",
    experience_level_id: initialData?.experience_level_id || initialData?.experience_levels?.id || "",
    location: initialData?.location || "",
    remote_policy_id: initialData?.remote_policy_id || initialData?.remote_policies?.id || "",
    salaryMin: initialData?.salaryMin || "",
    salaryMax: initialData?.salaryMax || "",
    salaryCurrency: initialData?.salaryCurrency || defaultCurrency,
    salaryType: initialData?.salaryType || "Annual",
    benefits: initialData?.benefits || "",
    requirements: initialData?.requirements || "",
    preferredQualifications: initialData?.preferredQualifications || "",
    educationRequired: initialData?.educationRequired || "",
    yearsExperienceRequired: initialData?.yearsExperienceRequired || "",
    applicationDeadline: initialData?.applicationDeadline || "",
    startDate: initialData?.startDate || "",
    applicationInstructions: initialData?.applicationInstructions || "",
    status: initialData?.status || (autoPublishJobs ? "Active" : "Draft"),
    featured: initialData?.featured || false,
    showSalary: initialData?.showSalary ?? showSalaryByDefault, // Use ?? to handle false values
    priority: initialData?.priority || 0,
    categoryId: initialData?.categoryId || "",
    application_type: initialData?.application_type || "quick", // New field for screening questions
    visibility: initialData?.visibility || "external", // New field for job visibility (internal/external/both)
  });

  const [errors, setErrors] = useState({});

  // Fetch categories and job attributes
  useEffect(() => {
    fetchCategories();
    fetchJobAttributes();
  }, []);

  useEffect(() => {
    if (!initialData && showSalaryByDefault !== undefined) {
      setFormData((prev) => ({ ...prev, showSalary: showSalaryByDefault }));
    }
  }, [showSalaryByDefault, initialData]);

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

  const fetchJobAttributes = async () => {
    try {
      const response = await fetch("/api/job-attributes");
      if (response.ok) {
        const data = await response.json();
        setJobAttributes(data);
        
        // Set default values if not provided by initial data
        if (!initialData) {
          setFormData(prev => ({
            ...prev,
            employment_type_id: data.employmentTypes[0]?.id || "",
            experience_level_id: data.experienceLevels[0]?.id || "",
            remote_policy_id: data.remotePolicies[0]?.id || ""
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching job attributes:", error);
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

  // Helper function to check if HTML content is empty
  const isContentEmpty = (content) => {
    if (!content) return true;
    const textContent = content.replace(/<[^>]*>/g, '').trim();
    return textContent === '' || textContent === '&nbsp;';
  };

  const validateForm = () => {
    const newErrors = {};

    // Basic required fields
    if (!formData.title) newErrors.title = "Title is required";
    if (!formData.slug) newErrors.slug = "Slug is required";
    if (isContentEmpty(formData.summary))
      newErrors.summary = "Job overview is required";
    if (isContentEmpty(formData.description))
      newErrors.description = "Description is required";
    if (!formData.department) newErrors.department = "Department is required";
    if (!formData.location) newErrors.location = "Location is required";
    if (isContentEmpty(formData.requirements))
      newErrors.requirements = "Requirements are required";
    if (!formData.categoryId) newErrors.categoryId = "Category is required";
    if (!formData.employment_type_id) newErrors.employment_type_id = "Employment type is required";
    if (!formData.experience_level_id) newErrors.experience_level_id = "Experience level is required";
    if (!formData.remote_policy_id) newErrors.remote_policy_id = "Remote policy is required";

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

  // Handle markdown editor content changes
  const handleEditorChange = (content, fieldName) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: content || '',
    }));

    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors((prev) => ({ ...prev, [fieldName]: null }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium admin-text mb-2">
            Job Title *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            disabled={submitting}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 theme-primary theme-primary-border admin-text ${
              errors.title ? "border-red-500" : "admin-border"
            } ${submitting ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed" : "admin-card"}`}
          />
          {errors.title && (
            <p className="theme-danger text-sm mt-1">{errors.title}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium admin-text mb-2">
            Slug *
          </label>
          <input
            type="text"
            name="slug"
            value={formData.slug}
            onChange={handleChange}
            disabled={submitting}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 theme-primary theme-primary-border admin-text ${
              errors.slug ? "border-red-500" : "admin-border"
            } ${submitting ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed" : "admin-card"}`}
          />
          {errors.slug && (
            <p className="theme-danger text-sm mt-1">{errors.slug}</p>
          )}
        </div>
      </div>

      {/* Department and Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium admin-text mb-2">
            Department *
          </label>
          <input
            type="text"
            name="department"
            value={formData.department}
            onChange={handleChange}
            disabled={submitting}
            placeholder="e.g., Engineering, Marketing, Sales"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 theme-primary theme-primary-border admin-text ${
              errors.department ? "border-red-500" : "admin-border"
            } ${submitting ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed" : "admin-card"}`}
          />
          {errors.department && (
            <p className="theme-danger text-sm mt-1">{errors.department}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium admin-text mb-2">
            Location *
          </label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            disabled={submitting}
            placeholder="e.g., San Francisco, CA or Remote"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 theme-primary theme-primary-border admin-text ${
              errors.location ? "border-red-500" : "admin-border"
            } ${submitting ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed" : "admin-card"}`}
          />
          {errors.location && (
            <p className="theme-danger text-sm mt-1">{errors.location}</p>
          )}
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium admin-text mb-2">
          Category *
        </label>
        <select
          name="categoryId"
          value={formData.categoryId}
          onChange={handleChange}
          disabled={submitting}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 theme-primary theme-primary-border admin-text ${
            errors.categoryId ? "border-red-500" : "admin-border"
          } ${submitting ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed" : "admin-card"}`}
        >
          <option value="">Select a category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {errors.categoryId && (
          <p className="theme-danger text-sm mt-1">{errors.categoryId}</p>
        )}
      </div>

      {/* Job Type and Experience */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium admin-text mb-2">
            Employment Type
          </label>
          <select
            name="employment_type_id"
            value={formData.employment_type_id}
            onChange={handleChange}
            disabled={submitting}
            className="w-full px-3 py-2 border admin-border rounded-lg focus:ring-2 theme-primary theme-primary-border admin-text admin-card"
          >
            <option value="">Select Employment Type</option>
            {jobAttributes.employmentTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium admin-text mb-2">
            Experience Level
          </label>
          <select
            name="experience_level_id"
            value={formData.experience_level_id}
            onChange={handleChange}
            disabled={submitting}
            className="w-full px-3 py-2 border admin-border rounded-lg focus:ring-2 theme-primary theme-primary-border admin-text admin-card"
          >
            <option value="">Select Experience Level</option>
            {jobAttributes.experienceLevels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium admin-text mb-2">
            Remote Policy
          </label>
          <select
            name="remote_policy_id"
            value={formData.remote_policy_id}
            onChange={handleChange}
            disabled={submitting}
            className="w-full px-3 py-2 border admin-border rounded-lg focus:ring-2 theme-primary theme-primary-border admin-text admin-card"
          >
            <option value="">Select Remote Policy</option>
            {jobAttributes.remotePolicies.map((policy) => (
              <option key={policy.id} value={policy.id}>
                {policy.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Job Overview/Summary */}
      <div>
        <label className="block text-sm font-medium admin-text mb-2">
          Job Overview *
        </label>
        <div className={`${errors.summary ? "border border-red-500 rounded-lg" : "border admin-border rounded-lg"}`}>
          <Editor
            value={formData.summary}
            onChange={(e) => handleEditorChange(e.target.value, 'summary')}
            placeholder="Brief overview of the role and key responsibilities (2-3 sentences)"
            containerProps={{
              style: {
                height: '120px',
                fontSize: '14px'
              }
            }}
          />
        </div>
        {errors.summary && (
          <p className="theme-danger text-sm mt-1">{errors.summary}</p>
        )}
        <p className="text-xs admin-text-light mt-1">
          This appears as a highlighted summary at the top of the job posting
        </p>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium admin-text mb-2">
          Job Description *
        </label>
        <div className={`${errors.description ? "border border-red-500 rounded-lg" : "border admin-border rounded-lg"}`}>
          <Editor
            value={formData.description}
            onChange={(e) => handleEditorChange(e.target.value, 'description')}
            placeholder="Provide a detailed description of the role..."
            containerProps={{
              style: {
                height: '200px',
                fontSize: '14px'
              }
            }}
          />
        </div>
        {errors.description && (
          <p className="theme-danger text-sm mt-1">{errors.description}</p>
        )}
      </div>

      {/* Requirements */}
      <div>
        <label className="block text-sm font-medium admin-text mb-2">
          Requirements *
        </label>
        <div className={`${errors.requirements ? "border border-red-500 rounded-lg" : "border admin-border rounded-lg"}`}>
          <Editor
            value={formData.requirements}
            onChange={(e) => handleEditorChange(e.target.value, 'requirements')}
            placeholder="List the key requirements for this position..."
            containerProps={{
              style: {
                height: '150px',
                fontSize: '14px'
              }
            }}
          />
        </div>
        {errors.requirements && (
          <p className="theme-danger text-sm mt-1">{errors.requirements}</p>
        )}
      </div>

      {/* Salary Section - with conditional required indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium admin-text mb-2">
            Minimum Salary {requireSalaryRange && "*"}
          </label>
          <input
            type="number"
            name="salaryMin"
            value={formData.salaryMin}
            onChange={handleChange}
            disabled={submitting}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 theme-primary theme-primary-border admin-text ${
              errors.salaryMin ? "border-red-500" : "admin-border"
            } ${submitting ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed" : "admin-card"}`}
          />
          {errors.salaryMin && (
            <p className="theme-danger text-sm mt-1">{errors.salaryMin}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium admin-text mb-2">
            Maximum Salary {requireSalaryRange && "*"}
          </label>
          <input
            type="number"
            name="salaryMax"
            value={formData.salaryMax}
            onChange={handleChange}
            disabled={submitting}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 theme-primary theme-primary-border admin-text ${
              errors.salaryMax ? "border-red-500" : "admin-border"
            } ${submitting ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed" : "admin-card"}`}
          />
          {errors.salaryMax && (
            <p className="theme-danger text-sm mt-1">{errors.salaryMax}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium admin-text mb-2">
            Currency
          </label>
          <select
            name="salaryCurrency"
            value={formData.salaryCurrency}
            onChange={handleChange}
            disabled={submitting}
            className="w-full px-3 py-2 border admin-border rounded-lg focus:ring-2 theme-primary theme-primary-border admin-text admin-card"
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

      {/* Show Salary Option */}
      <div className="admin-card border admin-border rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            name="showSalary"
            id="showSalary"
            checked={formData.showSalary}
            onChange={handleChange}
            disabled={submitting}
            className="mt-1 rounded admin-border theme-primary-text focus:ring-2 theme-primary"
          />
          <div className="flex-1">
            <label
              htmlFor="showSalary"
              className="block text-sm font-medium admin-text mb-1"
            >
              Display Salary Information
            </label>
            <p className="text-sm admin-text-light">
              Show salary information on job listings and job detail pages.
              Uncheck this if you prefer to discuss compensation during the
              application process.
            </p>
            <p className="text-xs admin-text-light mt-1">
              Default setting for new jobs:{" "}
              {showSalaryByDefault ? "Show salary" : "Hide salary"}
            </p>
          </div>
        </div>
      </div>

      {/* Application Deadline - with conditional required indicator */}
      <div>
        <label className="block text-sm font-medium admin-text mb-2">
          Application Deadline{" "}
          {applicationDeadlineRequired && (
            <span className="theme-danger">*</span>
          )}
        </label>
        <input
          type="date"
          name="applicationDeadline"
          value={formData.applicationDeadline}
          onChange={handleChange}
          disabled={submitting}
          min={new Date().toISOString().split("T")[0]}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 theme-primary theme-primary-border admin-text ${
            errors.applicationDeadline
              ? "border-red-500 bg-red-50 dark:bg-red-900/20"
              : "admin-border"
          } ${submitting ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed" : "admin-card"}`}
        />
        {errors.applicationDeadline && (
          <div className="mt-1 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm theme-danger">
            <strong>⚠️ {errors.applicationDeadline}</strong>
          </div>
        )}
        {applicationDeadlineRequired && !errors.applicationDeadline && (
          <p className="text-sm theme-primary-text mt-1 flex items-center">
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
        <label className="block text-sm font-medium admin-text mb-2">
          Status
        </label>
        <select
          name="status"
          value={formData.status}
          onChange={handleChange}
          disabled={submitting}
          className="w-full px-3 py-2 border admin-border rounded-lg focus:ring-2 theme-primary theme-primary-border admin-text admin-card"
        >
          <option value="Draft">Draft</option>
          <option value="Active">Active</option>
          <option value="Paused">Paused</option>
          <option value="Closed">Closed</option>
        </select>
        {autoPublishJobs && (
          <p className="text-sm theme-primary-text mt-1">
            ✨ Auto-publish is enabled - new jobs will be published
            automatically
          </p>
        )}
      </div>

      {/* Application Type */}
      <div>
        <label className="block text-sm font-medium admin-text mb-2">
          Application Type
        </label>
        <select
          name="application_type"
          value={formData.application_type}
          onChange={handleChange}
          disabled={submitting}
          className="w-full px-3 py-2 border admin-border rounded-lg focus:ring-2 theme-primary theme-primary-border admin-text admin-card"
        >
          <option value="quick">Quick Apply (Basic info only)</option>
          <option value="full">Full Application (With screening questions)</option>
        </select>
        <p className="text-sm admin-text-light mt-1">
          {formData.application_type === "quick"
            ? "Applicants fill out a simple form with basic information"
            : !initialData
            ? "You'll be taken to set up screening questions after creating this job"
            : "Applicants will be redirected to a dedicated page with screening questions"}
        </p>
      </div>

      {/* Job Visibility */}
      <div>
        <label className="block text-sm font-medium admin-text mb-2">
          Job Visibility
        </label>
        <select
          name="visibility"
          value={formData.visibility}
          onChange={handleChange}
          disabled={submitting}
          className="w-full px-3 py-2 border admin-border rounded-lg focus:ring-2 theme-primary theme-primary-border admin-text admin-card"
        >
          <option value="external">External Only (Public job board)</option>
          <option value="internal">Internal Only (Authenticated company users only)</option>
          <option value="both">Both (Internal and external candidates)</option>
        </select>
        <p className="text-sm admin-text-light mt-1">
          {formData.visibility === "external" && "This job will be visible to everyone on the public job board"}
          {formData.visibility === "internal" && "This job will only be visible to authenticated internal users (LDAP accounts or company email domains)"}
          {formData.visibility === "both" && "This job will be visible to both internal users and external candidates"}
        </p>
      </div>

      {/* Settings Information Panel */}
      <div className="admin-card border admin-border rounded-lg p-4">
        <h4 className="text-sm font-semibold admin-text mb-2">
          System Settings Applied:
        </h4>
        <ul className="text-sm admin-text-light space-y-1">
          {requireSalaryRange && <li>• Salary range is required</li>}
          {applicationDeadlineRequired && (
            <li>• Application deadline is required</li>
          )}
          {autoPublishJobs && (
            <li>• Jobs will be auto-published when created</li>
          )}
          <li>• Default currency: {defaultCurrency}</li>
          <li>
            • Default salary display: {showSalaryByDefault ? "Show" : "Hide"}
          </li>
        </ul>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-4 pt-6 border-t admin-border">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className={`px-6 py-2 border admin-border rounded-lg admin-text hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className={`px-6 py-2 ${getButtonClasses("primary")} rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2`}
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
              ? (initialData ? "Updating..." : formData.application_type === "full" ? "Saving..." : "Creating Job...")
              : initialData
              ? "Update Job"
              : formData.application_type === "full"
              ? "Next: Screening Questions →"
              : "Create Job"}
          </span>
        </button>
      </div>
    </form>
  );
}
