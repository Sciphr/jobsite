// app/lib/settings.js
import { appPrisma } from "./prisma";

/**
 * Static defaults for build-time (professional approach)
 * These are used during builds when database isn't available
 */
const BUILD_TIME_DEFAULTS = {
  site_name: "JobSite",
  site_description: "Find your next career opportunity",
  site_color_theme: "ocean-blue",
  allow_guest_applications: "true",
  weekly_digest_enabled: "true",
  email_new_applications: "true",
  max_resume_size_mb: "10",
  default_currency: "USD"
};

/**
 * Detect if we're in build/static generation mode
 * Professional approach: reliable indicators
 */
function isBuildTime() {
  return (
    // During npm run build
    process.env.npm_lifecycle_event === 'build' ||
    // Next.js build phase
    process.env.NEXT_PHASE === 'phase-production-build' ||
    // Database URL contains temp (build environments)
    process.env.DATABASE_URL?.includes('temp') ||
    // CI/CD environments
    process.env.CI === 'true'
  );
}

/**
 * Get a system setting value
 * Uses static defaults during build, database at runtime
 */
export async function getSystemSetting(key, defaultValue = null) {
  // During build: use static defaults (no database calls)
  if (isBuildTime()) {
    const buildDefault = BUILD_TIME_DEFAULTS[key] || defaultValue;
    console.log(`🏗️  Build time: Using static default for ${key}: ${buildDefault}`);
    return buildDefault;
  }

  // Runtime: use database with graceful fallback
  try {
    const setting = await appPrisma.settings.findFirst({
      where: {
        key,
        userId: null, // System settings only
      },
    });

    if (!setting) {
      return BUILD_TIME_DEFAULTS[key] || defaultValue;
    }

    return parseSettingValue(setting.value, setting.dataType);
  } catch (error) {
    console.error(`Error getting system setting ${key}:`, error);
    // Graceful degradation: use static defaults if database fails
    return BUILD_TIME_DEFAULTS[key] || defaultValue;
  }
}

/**
 * Get a user's personal setting value
 */
export async function getUserSetting(userId, key, defaultValue = null) {
  try {
    const setting = await appPrisma.settings.findFirst({
      where: {
        key,
        userId,
      },
    });

    if (!setting) {
      return defaultValue;
    }

    return parseSettingValue(setting.value, setting.dataType);
  } catch (error) {
    console.error(
      `Error getting user setting ${key} for user ${userId}:`,
      error
    );
    return defaultValue;
  }
}

/**
 * Get multiple system settings at once
 */
export async function getSystemSettings(keys) {
  try {
    const settings = await appPrisma.settings.findMany({
      where: {
        key: { in: keys },
        userId: null,
      },
    });

    const result = {};
    for (const setting of settings) {
      result[setting.key] = parseSettingValue(setting.value, setting.dataType);
    }

    return result;
  } catch (error) {
    console.error("Error getting system settings:", error);
    return {};
  }
}

/**
 * Check if guest applications are allowed
 */
export async function areGuestApplicationsAllowed() {
  return await getSystemSetting("allow_guest_applications", true);
}

/**
 * Get job-related settings
 */
export async function getJobSettings() {
  const keys = [
    "auto_expire_jobs_days",
    "require_salary_range",
    "show_salary_by_default",
    "max_featured_jobs",
    "auto_publish_jobs",
    "application_deadline_required",
  ];

  return await getSystemSettings(keys);
}

/**
 * Get notification settings
 */
export async function getNotificationSettings() {
  const keys = [
    "email_new_applications",
    "notification_email",
    "application_confirmation_email",
    "weekly_digest_enabled",
  ];

  return await getSystemSettings(keys);
}

/**
 * Get site configuration
 */
export async function getSiteConfig() {
  const keys = [
    "site_name",
    "site_description",
    "default_currency",
    "max_resume_size_mb",
    "allowed_resume_types",
  ];

  return await getSystemSettings(keys);
}

/**
 * Parse setting value based on data type
 */
function parseSettingValue(value, dataType) {
  try {
    switch (dataType) {
      case "boolean":
        return value === "true" || value === true;
      case "number":
        return parseFloat(value);
      case "json":
        return JSON.parse(value);
      default:
        return value;
    }
  } catch (error) {
    console.error("Error parsing setting value:", error);
    return value;
  }
}

/**
 * Cache for frequently accessed settings
 */
const settingsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached system setting (for high-frequency reads)
 */
export async function getCachedSystemSetting(key, defaultValue = null) {
  const cacheKey = `system:${key}`;
  const cached = settingsCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }

  const value = await getSystemSetting(key, defaultValue);
  settingsCache.set(cacheKey, {
    value,
    timestamp: Date.now(),
  });

  return value;
}

/**
 * Validate setting value based on key-specific rules
 */
function validateSettingValue(key, value) {
  switch (key) {
    case 'candidate_data_retention_years':
      const years = parseInt(value);
      if (isNaN(years) || years < 3) {
        throw new Error('Data retention period must be at least 3 years for legal compliance');
      }
      return years.toString();
    default:
      return String(value);
  }
}

/**
 * Update a system setting value
 */
export async function updateSystemSetting(key, value, dataType = 'boolean') {
  try {
    // Validate the value based on key-specific rules
    const validatedValue = validateSettingValue(key, value);
    
    // First try to find existing system setting
    const existingSetting = await appPrisma.settings.findFirst({
      where: {
        key,
        userId: null
      }
    });

    if (existingSetting) {
      // Update existing setting
      await appPrisma.settings.update({
        where: {
          id: existingSetting.id
        },
        data: {
          value: validatedValue,
          dataType,
          updatedAt: new Date()
        }
      });
    } else {
      // Create new setting
      await appPrisma.settings.create({
        data: {
          key,
          value: validatedValue,
          dataType,
          userId: null,
          category: 'system'
        }
      });
    }

    // Clear cache for this setting
    const cacheKey = `system:${key}`;
    settingsCache.delete(cacheKey);
    
    return true;
  } catch (error) {
    console.error(`Error updating system setting ${key}:`, error);
    throw error;
  }
}

/**
 * Clear settings cache (call when settings are updated)
 */
export function clearSettingsCache() {
  settingsCache.clear();
}
