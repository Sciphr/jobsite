// app/lib/staleApplicationUtils.js
import { appPrisma } from "./prisma";
import { staleApplicationScheduler } from "./staleApplicationScheduler";

/**
 * Get the current stale application threshold from settings
 */
export async function getStaleApplicationThreshold() {
  try {
    const setting = await appPrisma.settings.findFirst({
      where: {
        key: "alert_stale_applications_days",
        userId: null,
      },
    });

    if (!setting || !setting.value) {
      return null;
    }

    const days = parseInt(setting.value);
    return !isNaN(days) && days > 0 ? days : null;
  } catch (error) {
    console.error("Error getting stale application threshold:", error);
    return null;
  }
}

/**
 * Check if an application is stale based on current stage entered date
 */
export async function isApplicationStale(applicationId) {
  try {
    const threshold = await getStaleApplicationThreshold();
    if (!threshold) return false;

    // First check the scheduler cache for better performance
    if (staleApplicationScheduler.isApplicationStale(applicationId)) {
      return true;
    }

    // Fallback to database query
    const application = await appPrisma.applications.findUnique({
      where: { id: applicationId },
      select: {
        current_stage_entered_at: true,
        is_archived: true,
      },
    });

    if (!application || application.is_archived || !application.current_stage_entered_at) {
      return false;
    }

    const daysSinceStageChange = Math.floor(
      (new Date() - new Date(application.current_stage_entered_at)) / (1000 * 60 * 60 * 24)
    );

    return daysSinceStageChange >= threshold;
  } catch (error) {
    console.error("Error checking if application is stale:", error);
    return false;
  }
}

/**
 * Get stale information for an application
 */
export async function getApplicationStaleInfo(applicationId) {
  try {
    const threshold = await getStaleApplicationThreshold();
    if (!threshold) return null;

    // First check the scheduler cache
    const cachedInfo = staleApplicationScheduler.getApplicationStaleInfo(applicationId);
    if (cachedInfo) {
      return cachedInfo;
    }

    // Fallback to database query
    const application = await appPrisma.applications.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        current_stage_entered_at: true,
        is_archived: true,
        status: true,
        name: true,
        email: true,
        jobs: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!application || application.is_archived || !application.current_stage_entered_at) {
      return null;
    }

    const daysSinceStageChange = Math.floor(
      (new Date() - new Date(application.current_stage_entered_at)) / (1000 * 60 * 60 * 24)
    );

    const isStale = daysSinceStageChange >= threshold;

    if (!isStale) return null;

    return {
      ...application,
      daysSinceStageChange,
      isStale,
      threshold,
    };
  } catch (error) {
    console.error("Error getting application stale info:", error);
    return null;
  }
}

/**
 * Get all stale applications
 */
export async function getAllStaleApplications() {
  try {
    // First try to get from scheduler cache
    const cachedStale = staleApplicationScheduler.getStaleApplications();
    if (cachedStale.length > 0) {
      return cachedStale;
    }

    // Fallback to fresh database query
    const threshold = await getStaleApplicationThreshold();
    if (!threshold) return [];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - threshold);

    const staleApplications = await appPrisma.applications.findMany({
      where: {
        is_archived: false,
        current_stage_entered_at: {
          lt: cutoffDate,
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        current_stage_entered_at: true,
        jobs: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return staleApplications.map(app => {
      const daysSinceStageChange = Math.floor(
        (new Date() - new Date(app.current_stage_entered_at)) / (1000 * 60 * 60 * 24)
      );
      return {
        ...app,
        daysSinceStageChange,
        isStale: daysSinceStageChange >= threshold,
        threshold,
      };
    });
  } catch (error) {
    console.error("Error getting all stale applications:", error);
    return [];
  }
}

/**
 * Get stale applications count
 */
export async function getStaleApplicationsCount() {
  try {
    // First try scheduler cache
    const cachedCount = staleApplicationScheduler.getStaleApplicationsCount();
    if (cachedCount > 0) {
      return cachedCount;
    }

    // Fallback to database query
    const staleApps = await getAllStaleApplications();
    return staleApps.length;
  } catch (error) {
    console.error("Error getting stale applications count:", error);
    return 0;
  }
}

/**
 * Filter applications to only include stale ones
 */
export function filterStaleApplications(applications, threshold) {
  if (!threshold || !Array.isArray(applications)) return [];
  
  return applications.filter(app => {
    if (app.is_archived || !app.current_stage_entered_at) return false;
    
    const daysSinceStageChange = Math.floor(
      (new Date() - new Date(app.current_stage_entered_at)) / (1000 * 60 * 60 * 24)
    );
    
    return daysSinceStageChange >= threshold;
  });
}

/**
 * Add stale information to applications array
 */
export async function addStaleInfoToApplications(applications) {
  const threshold = await getStaleApplicationThreshold();
  if (!threshold || !Array.isArray(applications)) return applications;

  return applications.map(app => {
    if (app.is_archived || !app.current_stage_entered_at) {
      return { ...app, isStale: false, daysSinceStageChange: 0 };
    }

    const daysSinceStageChange = Math.floor(
      (new Date() - new Date(app.current_stage_entered_at)) / (1000 * 60 * 60 * 24)
    );

    const isStale = daysSinceStageChange >= threshold;

    return {
      ...app,
      isStale,
      daysSinceStageChange,
      staleThreshold: threshold,
    };
  });
}