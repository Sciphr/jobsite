// app/lib/stageTracking.js
import { appPrisma } from "./prisma";

/**
 * Get current stage duration for an application
 */
export async function getCurrentStageDuration(applicationId) {
  try {
    const result = await appPrisma.$queryRaw`
      SELECT 
        stage,
        entered_at,
        EXTRACT(EPOCH FROM (NOW() - entered_at))::INTEGER as duration_seconds,
        CASE 
          WHEN EXTRACT(EPOCH FROM (NOW() - entered_at)) < 60 THEN 
            EXTRACT(EPOCH FROM (NOW() - entered_at))::INTEGER || ' sec'
          WHEN EXTRACT(EPOCH FROM (NOW() - entered_at)) < 3600 THEN 
            (EXTRACT(EPOCH FROM (NOW() - entered_at)) / 60)::INTEGER || ' min'
          WHEN EXTRACT(EPOCH FROM (NOW() - entered_at)) < 86400 THEN 
            (EXTRACT(EPOCH FROM (NOW() - entered_at)) / 3600)::INTEGER || ' hrs'
          ELSE 
            (EXTRACT(EPOCH FROM (NOW() - entered_at)) / 86400)::INTEGER || ' days'
        END as duration_formatted
      FROM application_stage_history
      WHERE application_id = ${applicationId}::uuid
      AND exited_at IS NULL
      ORDER BY entered_at DESC
      LIMIT 1
    `;

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error getting current stage duration:', error);
    return null;
  }
}

/**
 * Get full application timeline with stage durations
 */
export async function getApplicationTimeline(applicationId) {
  try {
    const result = await appPrisma.$queryRaw`
      SELECT 
        stage,
        previous_stage,
        entered_at,
        exited_at,
        COALESCE(
          time_in_stage_seconds, 
          EXTRACT(EPOCH FROM (COALESCE(exited_at, NOW()) - entered_at))::INTEGER
        ) as time_in_stage_seconds,
        CASE 
          WHEN COALESCE(
            time_in_stage_seconds, 
            EXTRACT(EPOCH FROM (COALESCE(exited_at, NOW()) - entered_at))::INTEGER
          ) < 60 THEN 
            COALESCE(
              time_in_stage_seconds, 
              EXTRACT(EPOCH FROM (COALESCE(exited_at, NOW()) - entered_at))::INTEGER
            ) || ' sec'
          WHEN COALESCE(
            time_in_stage_seconds, 
            EXTRACT(EPOCH FROM (COALESCE(exited_at, NOW()) - entered_at))::INTEGER
          ) < 3600 THEN 
            (COALESCE(
              time_in_stage_seconds, 
              EXTRACT(EPOCH FROM (COALESCE(exited_at, NOW()) - entered_at))::INTEGER
            ) / 60)::INTEGER || ' min'
          WHEN COALESCE(
            time_in_stage_seconds, 
            EXTRACT(EPOCH FROM (COALESCE(exited_at, NOW()) - entered_at))::INTEGER
          ) < 86400 THEN 
            (COALESCE(
              time_in_stage_seconds, 
              EXTRACT(EPOCH FROM (COALESCE(exited_at, NOW()) - entered_at))::INTEGER
            ) / 3600)::INTEGER || ' hrs'
          ELSE 
            (COALESCE(
              time_in_stage_seconds, 
              EXTRACT(EPOCH FROM (COALESCE(exited_at, NOW()) - entered_at))::INTEGER
            ) / 86400)::INTEGER || ' days'
        END as duration_formatted,
        changed_by_name,
        (exited_at IS NULL) as is_current
      FROM application_stage_history
      WHERE application_id = ${applicationId}::uuid
      ORDER BY entered_at ASC
    `;

    return result;
  } catch (error) {
    console.error('Error getting application timeline:', error);
    return [];
  }
}

/**
 * Get stage analytics for multiple applications or overall statistics
 */
export async function getStageAnalytics(filters = {}) {
  try {
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (filters.jobId) {
      whereClause += ` AND a.jobId = $${params.length + 1}`;
      params.push(filters.jobId);
    }
    
    if (filters.dateRange) {
      whereClause += ` AND ash.entered_at >= $${params.length + 1} AND ash.entered_at <= $${params.length + 2}`;
      params.push(filters.dateRange.start);
      params.push(filters.dateRange.end);
    }

    const result = await appPrisma.$queryRawUnsafe(`
      SELECT 
        ash.stage,
        COUNT(*) as total_entries,
        AVG(COALESCE(
          ash.time_in_stage_seconds, 
          EXTRACT(EPOCH FROM (COALESCE(ash.exited_at, NOW()) - ash.entered_at))::INTEGER
        )) as avg_time_seconds,
        MIN(COALESCE(
          ash.time_in_stage_seconds, 
          EXTRACT(EPOCH FROM (COALESCE(ash.exited_at, NOW()) - ash.entered_at))::INTEGER
        )) as min_time_seconds,
        MAX(COALESCE(
          ash.time_in_stage_seconds, 
          EXTRACT(EPOCH FROM (COALESCE(ash.exited_at, NOW()) - ash.entered_at))::INTEGER
        )) as max_time_seconds,
        COUNT(CASE WHEN ash.exited_at IS NULL THEN 1 END) as currently_in_stage
      FROM application_stage_history ash
      JOIN applications a ON ash.application_id = a.id
      ${whereClause}
      GROUP BY ash.stage
      ORDER BY avg_time_seconds DESC
    `, ...params);

    // Format the results
    return result.map(row => ({
      ...row,
      avg_time_formatted: formatDuration(row.avg_time_seconds),
      min_time_formatted: formatDuration(row.min_time_seconds),
      max_time_formatted: formatDuration(row.max_time_seconds),
    }));
  } catch (error) {
    console.error('Error getting stage analytics:', error);
    return [];
  }
}

/**
 * Format duration in seconds to human readable format
 */
export function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0 sec';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${remainingSeconds}s`;
  }
}

/**
 * Get stage duration badge color based on time spent
 */
export function getStageDurationColor(stage, durationSeconds) {
  const thresholds = {
    'Applied': { warning: 3 * 86400, danger: 7 * 86400 }, // 3 days, 7 days
    'Reviewing': { warning: 5 * 86400, danger: 10 * 86400 }, // 5 days, 10 days
    'Interview': { warning: 7 * 86400, danger: 14 * 86400 }, // 7 days, 14 days
    'Hired': { warning: 14 * 86400, danger: 30 * 86400 }, // 14 days, 30 days
    'Rejected': { warning: 86400, danger: 3 * 86400 }, // 1 day, 3 days
  };

  const threshold = thresholds[stage] || thresholds['Applied'];
  
  if (durationSeconds >= threshold.danger) {
    return 'danger'; // Red
  } else if (durationSeconds >= threshold.warning) {
    return 'warning'; // Yellow
  } else {
    return 'success'; // Green
  }
}

/**
 * Check if stage time tracking is enabled
 */
export async function isStageTimeTrackingEnabled() {
  try {
    const { getSystemSetting } = await import("./settings");
    return await getSystemSetting("track_time_in_stage", false);
  } catch (error) {
    console.error('Error checking stage tracking setting:', error);
    return false;
  }
}