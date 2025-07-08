"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSetting } from "../../../hooks/useSettings";
import {
  Save,
  X,
  Briefcase,
  MapPin,
  DollarSign,
  Calendar,
  FileText,
  Users,
  Building2,
  Clock,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export default function JobForm({ jobId = null, initialData = null }) {
  const router = useRouter();
  const isEdit = !!jobId;

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
    salaryCurrency: "CAD",
    salaryType: "Annual",
    benefits: "",
    requirements: "",
    preferredQualifications: "",
    educationRequired: "",
    yearsExperienceRequired: "",
    applicationDeadline: "",
    startDate: "",
    applicationInstructions: "",
    status: "Draft",
    featured: false,
    priority: 0,
    categoryId: "",
  });

  const { value: defaultCurrency, loading: currencyLoading } = useSetting(
    "default_currency",
    "CAD"
  );

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchCategories();
    if (initialData) {
      setFormData({
        ...initialData,
        applicationDeadline: initialData.applicationDeadline
          ? new Date(initialData.applicationDeadline)
              .toISOString()
              .split("T")[0]
          : "",
        startDate: initialData.startDate
          ? new Date(initialData.startDate).toISOString().split("T")[0]
          : "",
      });
    }
  }, [initialData]);

  // Update currency when default currency setting changes (for new jobs only)
  useEffect(() => {
    if (!isEdit && defaultCurrency) {
      setFormData((prev) => ({
        ...prev,
        salaryCurrency: defaultCurrency,
      }));
    }
  }, [defaultCurrency, isEdit]);

  // Add this useEffect after your existing useEffects (around line 70)
  useEffect(() => {
    // Only update currency for new jobs and when currency setting is loaded
    if (
      !isEdit &&
      !currencyLoading &&
      defaultCurrency &&
      defaultCurrency !== formData.salaryCurrency
    ) {
      setFormData((prev) => ({
        ...prev,
        salaryCurrency: defaultCurrency,
      }));
    }
  }, [defaultCurrency, currencyLoading, isEdit, formData.salaryCurrency]);

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

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim("-");
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Auto-generate slug when title changes (only for new jobs)
    if (field === "title" && !isEdit) {
      setFormData((prev) => ({
        ...prev,
        slug: generateSlug(value),
      }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) newErrors.title = "Job title is required";
    if (!formData.slug.trim()) newErrors.slug = "Job slug is required";
    if (!formData.description.trim())
      newErrors.description = "Job description is required";
    if (!formData.department.trim())
      newErrors.department = "Department is required";
    if (!formData.location.trim()) newErrors.location = "Location is required";
    if (!formData.requirements.trim())
      newErrors.requirements = "Requirements are required";
    if (!formData.categoryId) newErrors.categoryId = "Category is required";

    // Salary validation
    if (formData.salaryMin && formData.salaryMax) {
      if (parseInt(formData.salaryMin) >= parseInt(formData.salaryMax)) {
        newErrors.salaryMax =
          "Maximum salary must be greater than minimum salary";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const url = isEdit ? `/api/admin/jobs/${jobId}` : "/api/admin/jobs";
      const method = isEdit ? "PATCH" : "POST";

      const submitData = {
        ...formData,
        salaryMin: formData.salaryMin ? parseInt(formData.salaryMin) : null,
        salaryMax: formData.salaryMax ? parseInt(formData.salaryMax) : null,
        yearsExperienceRequired: formData.yearsExperienceRequired
          ? parseInt(formData.yearsExperienceRequired)
          : null,
        applicationDeadline: formData.applicationDeadline || null,
        startDate: formData.startDate || null,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        router.push("/admin/jobs");
      } else {
        const errorData = await response.json();
        setErrors({ submit: errorData.message || "An error occurred" });
      }
    } catch (error) {
      console.error("Error saving job:", error);
      setErrors({ submit: "An error occurred while saving the job" });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push("/admin/jobs");
  };

  const employmentTypes = ["Full-time", "Part-time", "Contract", "Internship"];
  const experienceLevels = ["Entry", "Mid", "Senior", "Executive"];
  const remotePolicies = ["Remote", "Hybrid", "On-site"];

  const currencies = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"];
  const salaryTypes = ["Annual", "Monthly", "Hourly"];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEdit ? "Edit Job" : "Create New Job"}
          </h1>
          <p className="text-gray-600 mt-2">
            {isEdit
              ? "Update job posting details"
              : "Fill in the details to create a new job posting"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Briefcase className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Basic Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600 ${
                  errors.title ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="e.g., Senior React Developer"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.title}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department *
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) =>
                  handleInputChange("department", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600 ${
                  errors.department ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="e.g., Engineering"
              />
              {errors.department && (
                <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.department}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) =>
                  handleInputChange("categoryId", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600 ${
                  errors.categoryId ? "border-red-500" : "border-gray-300"
                }`}
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.categoryId}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employment Type
              </label>
              <select
                value={formData.employmentType}
                onChange={(e) =>
                  handleInputChange("employmentType", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
              >
                {employmentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Experience Level
              </label>
              <select
                value={formData.experienceLevel}
                onChange={(e) =>
                  handleInputChange("experienceLevel", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
              >
                {experienceLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600 ${
                  errors.location ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="e.g., San Francisco, CA"
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.location}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remote Policy
              </label>
              <select
                value={formData.remotePolicy}
                onChange={(e) =>
                  handleInputChange("remotePolicy", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
              >
                {remotePolicies.map((policy) => (
                  <option key={policy} value={policy}>
                    {policy}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Summary
            </label>
            <textarea
              value={formData.summary}
              onChange={(e) => handleInputChange("summary", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
              placeholder="Brief overview of the position..."
            />
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={6}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600 ${
                errors.description ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Detailed job description, responsibilities, and what the role entails..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.description}</span>
              </p>
            )}
          </div>
        </div>

        {/* Compensation */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Compensation & Benefits
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Salary
              </label>
              <input
                type="number"
                value={formData.salaryMin}
                onChange={(e) => handleInputChange("salaryMin", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                placeholder="50000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Salary
              </label>
              <input
                type="number"
                value={formData.salaryMax}
                onChange={(e) => handleInputChange("salaryMax", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600 ${
                  errors.salaryMax ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="80000"
              />
              {errors.salaryMax && (
                <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.salaryMax}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                value={formData.salaryCurrency}
                onChange={(e) =>
                  handleInputChange("salaryCurrency", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
              >
                {currencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Salary Type
              </label>
              <select
                value={formData.salaryType}
                onChange={(e) =>
                  handleInputChange("salaryType", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
              >
                {salaryTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Benefits
            </label>
            <textarea
              value={formData.benefits}
              onChange={(e) => handleInputChange("benefits", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
              placeholder="Health insurance, dental, vision, 401k, PTO, etc..."
            />
          </div>
        </div>

        {/* Requirements */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Requirements & Qualifications
            </h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Qualifications *
              </label>
              <textarea
                value={formData.requirements}
                onChange={(e) =>
                  handleInputChange("requirements", e.target.value)
                }
                rows={5}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600 ${
                  errors.requirements ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="• Bachelor's degree in Computer Science or related field&#10;• 3+ years of React development experience&#10;• Strong knowledge of JavaScript, HTML, CSS..."
              />
              {errors.requirements && (
                <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.requirements}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Qualifications
              </label>
              <textarea
                value={formData.preferredQualifications}
                onChange={(e) =>
                  handleInputChange("preferredQualifications", e.target.value)
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                placeholder="• Experience with TypeScript&#10;• Knowledge of modern testing frameworks&#10;• Previous startup experience..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Education Required
                </label>
                <input
                  type="text"
                  value={formData.educationRequired}
                  onChange={(e) =>
                    handleInputChange("educationRequired", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                  placeholder="e.g., Bachelor's degree"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Years of Experience
                </label>
                <input
                  type="number"
                  value={formData.yearsExperienceRequired}
                  onChange={(e) =>
                    handleInputChange("yearsExperienceRequired", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                  placeholder="3"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dates & Application */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="h-5 w-5 text-orange-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Timeline & Application
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Application Deadline
              </label>
              <input
                type="date"
                value={formData.applicationDeadline}
                onChange={(e) =>
                  handleInputChange("applicationDeadline", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange("startDate", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Application Instructions
            </label>
            <textarea
              value={formData.applicationInstructions}
              onChange={(e) =>
                handleInputChange("applicationInstructions", e.target.value)
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
              placeholder="Please submit your resume, cover letter, and portfolio. Include 'React Developer' in the subject line..."
            />
          </div>
        </div>

        {/* Status & Settings */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Building2 className="h-5 w-5 text-indigo-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Publishing Settings
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange("status", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
              >
                <option value="Draft">Draft</option>
                <option value="Active">Active</option>
                <option value="Paused">Paused</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => handleInputChange("priority", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                placeholder="0"
                min="0"
              />
            </div>

            <div className="flex items-center space-x-3 pt-6">
              <input
                type="checkbox"
                checked={formData.featured}
                onChange={(e) =>
                  handleInputChange("featured", e.target.checked)
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label className="text-sm font-medium text-gray-700">
                Featured Job
              </label>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4 py-6">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors duration-200"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>{isEdit ? "Updating..." : "Creating..."}</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>{isEdit ? "Update Job" : "Create Job"}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
