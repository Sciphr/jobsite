// app/lib/jobSettings.js - Helper functions for job settings
import { getSystemSetting } from "./settings";

export async function getJobValidationRules() {
  const [
    requireSalaryRange,
    applicationDeadlineRequired,
    autoPublishJobs,
    maxFeaturedJobs,
    autoExpireDays,
    defaultCurrency,
    showSalaryDefault,
  ] = await Promise.all([
    getSystemSetting("require_salary_range", false),
    getSystemSetting("application_deadline_required", false),
    getSystemSetting("auto_publish_jobs", false),
    getSystemSetting("max_featured_jobs", 5),
    getSystemSetting("auto_expire_jobs_days", 0),
    getSystemSetting("default_currency", "CAD"),
    getSystemSetting("show_salary_default", true),
  ]);

  return {
    requireSalaryRange,
    applicationDeadlineRequired,
    autoPublishJobs,
    maxFeaturedJobs,
    autoExpireDays,
    defaultCurrency,
    showSalaryDefault,
  };
}

export async function validateJobData(jobData, isUpdate = false) {
  const rules = await getJobValidationRules();
  const errors = [];

  // Basic required fields
  if (!jobData.title) errors.push("Title is required");
  if (!jobData.slug && !isUpdate) errors.push("Slug is required");
  if (!jobData.description) errors.push("Description is required");
  if (!jobData.department) errors.push("Department is required");
  if (!jobData.location) errors.push("Location is required");
  if (!jobData.requirements) errors.push("Requirements are required");
  if (!jobData.categoryId) errors.push("Category is required");

  // Settings-based validation
  if (rules.requireSalaryRange) {
    if (!jobData.salaryMin) {
      errors.push("Minimum salary is required by system settings");
    }
    if (!jobData.salaryMax) {
      errors.push("Maximum salary is required by system settings");
    }
    if (
      jobData.salaryMin &&
      jobData.salaryMax &&
      parseFloat(jobData.salaryMin) >= parseFloat(jobData.salaryMax)
    ) {
      errors.push("Maximum salary must be greater than minimum salary");
    }
  }

  if (rules.applicationDeadlineRequired && !jobData.applicationDeadline) {
    errors.push("Application deadline is required by system settings");
  }

  // Validate application deadline is in the future
  if (jobData.applicationDeadline) {
    const deadline = new Date(jobData.applicationDeadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (deadline < today) {
      errors.push("Application deadline must be in the future");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    rules,
  };
}

export function calculateAutoExpirationDate(settings) {
  if (!settings || settings.autoExpireDays <= 0) {
    return null;
  }

  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + settings.autoExpireDays);
  return expirationDate;
}

export async function checkFeaturedJobsLimit(currentFeaturedCount = null) {
  const maxFeaturedJobs = await getSystemSetting("max_featured_jobs", 5);

  if (currentFeaturedCount === null) {
    // Count current featured jobs if not provided
    const { appPrisma } = await import("./prisma");
    currentFeaturedCount = await appPrisma.job.count({
      where: {
        featured: true,
        status: "Active",
      },
    });
  }

  return {
    maxFeaturedJobs,
    currentFeaturedCount,
    canAddMore: currentFeaturedCount < maxFeaturedJobs,
    availableSlots: maxFeaturedJobs - currentFeaturedCount,
  };
}

// Helper to apply default values based on settings
export async function applyJobDefaults(jobData) {
  const rules = await getJobValidationRules();

  return {
    ...jobData,
    salaryCurrency: jobData.salaryCurrency || rules.defaultCurrency,
    status: jobData.status || (rules.autoPublishJobs ? "Active" : "Draft"),
    employmentType: jobData.employmentType || "Full-time",
    experienceLevel: jobData.experienceLevel || "Mid",
    remotePolicy: jobData.remotePolicy || "On-site",
    salaryType: jobData.salaryType || "Annual",
    featured: jobData.featured || false,
    priority: jobData.priority || 0,
  };
}
