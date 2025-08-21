// app/api/admin/stage-analytics/route.js
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";
import { getSystemSetting } from "../../../lib/settings";
import { protectRoute } from "../../../lib/middleware/apiProtection";

export async function GET(request) {
  const authResult = await protectRoute("analytics", "advanced");
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  try {
    // Check if stage time tracking is enabled
    const trackingEnabled = await getSystemSetting("track_time_in_stage", false);

    if (!trackingEnabled) {
      return Response.json({
        trackingEnabled: false,
        analytics: [],
        message: "Stage time tracking is disabled"
      });
    }

    // Get URL parameters for filtering
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build the query conditions
    let whereConditions = [];
    let queryParams = [];
    
    if (jobId && jobId !== 'all') {
      whereConditions.push(`a."jobId" = $${queryParams.length + 1}`);
      queryParams.push(jobId);
    }
    
    if (startDate) {
      whereConditions.push(`ash.entered_at >= $${queryParams.length + 1}`);
      queryParams.push(new Date(startDate));
    }
    
    if (endDate) {
      whereConditions.push(`ash.entered_at <= $${queryParams.length + 1}`);
      queryParams.push(new Date(endDate));
    }

    const whereClause = whereConditions.length > 0 
      ? `AND ${whereConditions.join(' AND ')}` 
      : '';

    // Get stage analytics
    const analytics = await appPrisma.$queryRawUnsafe(`
      SELECT 
        ash.stage,
        COUNT(*) as total_entries,
        ROUND(AVG(COALESCE(
          ash.time_in_stage_seconds, 
          EXTRACT(EPOCH FROM (COALESCE(ash.exited_at, NOW()) - ash.entered_at))::INTEGER
        ))) as avg_time_seconds,
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
      WHERE 1=1 ${whereClause}
      GROUP BY ash.stage
      ORDER BY avg_time_seconds DESC
    `, ...queryParams);

    // Format the duration strings
    const formatDuration = (seconds) => {
      if (!seconds || seconds < 0) return '0 sec';
      
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      
      if (days > 0) {
        return `${days}d ${hours}h`;
      } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        return `${minutes}m`;
      } else {
        return `${seconds}s`;
      }
    };

    const formattedAnalytics = analytics.map(row => ({
      stage: row.stage,
      total_entries: parseInt(row.total_entries),
      currently_in_stage: parseInt(row.currently_in_stage),
      avg_time_seconds: parseInt(row.avg_time_seconds),
      min_time_seconds: parseInt(row.min_time_seconds),
      max_time_seconds: parseInt(row.max_time_seconds),
      avg_time_formatted: formatDuration(parseInt(row.avg_time_seconds)),
      min_time_formatted: formatDuration(parseInt(row.min_time_seconds)),
      max_time_formatted: formatDuration(parseInt(row.max_time_seconds)),
    }));

    // Get overall statistics
    const totalTransitions = formattedAnalytics.reduce((sum, stage) => sum + stage.total_entries, 0);
    const totalCurrentlyInStages = formattedAnalytics.reduce((sum, stage) => sum + stage.currently_in_stage, 0);

    return Response.json({
      trackingEnabled: true,
      analytics: formattedAnalytics,
      summary: {
        totalTransitions,
        totalCurrentlyInStages,
        stagesWithData: formattedAnalytics.length
      },
      filters: {
        jobId: jobId || 'all',
        startDate: startDate || null,
        endDate: endDate || null
      }
    });

  } catch (error) {
    console.error("Stage analytics error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}