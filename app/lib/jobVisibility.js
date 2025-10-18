// Job visibility helper functions for internal/external job filtering
import { appPrisma } from "@/app/lib/prisma";

/**
 * Check if a user is considered an internal candidate
 * Internal users are identified by:
 * 1. LDAP/SAML account type, OR
 * 2. Email domain matching company domains setting
 */
export async function isInternalUser(user) {
  if (!user) return false;

  // Check if user has LDAP account
  if (user.account_type === "ldap") {
    return true;
  }

  // Check if user email matches company domains
  if (user.email) {
    const domainsSetting = await appPrisma.settings.findFirst({
      where: { key: "company_domains", userId: null },
    });

    if (domainsSetting?.value) {
      const companyDomains = domainsSetting.value
        .split(",")
        .map((d) => d.trim().toLowerCase());
      const userDomain = user.email.split("@")[1]?.toLowerCase();

      if (userDomain && companyDomains.includes(userDomain)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if a user can view a specific job based on visibility settings
 * @param {Object} job - Job object with visibility field
 * @param {Object|null} user - User object or null for anonymous users
 * @returns {boolean}
 */
export async function canViewJob(job, user = null) {
  if (!job) return false;

  // External jobs are visible to everyone
  if (job.visibility === "external") {
    return true;
  }

  // Internal jobs require authenticated internal user
  if (job.visibility === "internal") {
    if (!user) return false;
    return await isInternalUser(user);
  }

  // "both" visibility - visible to everyone
  if (job.visibility === "both") {
    return true;
  }

  // Default to external behavior for backward compatibility
  return true;
}

/**
 * Get visibility filter for job queries based on user
 * Returns Prisma where clause for job visibility
 * @param {Object|null} user - User object or null for anonymous users
 */
export async function getJobVisibilityFilter(user = null) {
  // Anonymous users can only see external and "both" jobs
  if (!user) {
    return {
      visibility: {
        in: ["external", "both"],
      },
    };
  }

  // Internal users can see all job types
  const isInternal = await isInternalUser(user);
  if (isInternal) {
    return {}; // No filter - can see all jobs
  }

  // External authenticated users can only see external and "both" jobs
  return {
    visibility: {
      in: ["external", "both"],
    },
  };
}

/**
 * Filter a list of jobs based on user visibility permissions
 * @param {Array} jobs - Array of job objects
 * @param {Object|null} user - User object or null for anonymous users
 */
export async function filterJobsByVisibility(jobs, user = null) {
  if (!jobs || jobs.length === 0) return [];

  const visibilityChecks = await Promise.all(
    jobs.map((job) => canViewJob(job, user))
  );

  return jobs.filter((_, index) => visibilityChecks[index]);
}
