import { protectRoute } from "../../../../lib/middleware/apiProtection";
import { 
  getWebsiteMetrics, 
  getTrafficSources, 
  getTopPages,
  getDailyAnalytics,
  getJobPageAnalytics,
  getRealTimeAnalytics,
  getGeographicAnalytics,
  getDeviceAnalytics,
  getUserJourneyAnalytics,
  getJobPerformanceAnalytics,
  getTimeAnalytics,
  getTechnologyAnalytics
} from "../../../../lib/googleAnalytics";

export async function GET(req) {
  // Check if user has permission to view analytics
  const authResult = await protectRoute("analytics", "view");
  if (authResult.error) return authResult.error;

  try {
    // Check if analytics tracking is enabled
    const { getSystemSetting } = await import("../../../../lib/settings");
    const trackingEnabled = await getSystemSetting("analytics_tracking", false);
    
    if (!trackingEnabled) {
      return new Response(JSON.stringify({ 
        enabled: false,
        message: "Google Analytics tracking is disabled" 
      }), { status: 200 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "30d";
    const includeRealtime = searchParams.get("realtime") === "true";

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    switch (range) {
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(now.getDate() - 90);
        break;
      case "1y":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Check if database configuration exists
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    let hasConfiguration = false;
    try {
      const result = await pool.query(`
        SELECT COUNT(*) as count
        FROM analytics_configurations 
        WHERE connection_status = 'connected'
      `);
      hasConfiguration = parseInt(result.rows[0].count) > 0;
    } finally {
      await pool.end();
    }

    if (!hasConfiguration) {
      return new Response(JSON.stringify({
        enabled: true,
        configured: false,
        message: "Google Analytics not configured. Please use the configuration wizard.",
        setupInstructions: {
          step1: "Go to Applications Manager > Settings",
          step2: "Find the Google Analytics 4 Integration section",
          step3: "Click 'Configure GA4 Integration'",
          step4: "Follow the setup wizard to connect your GA4 property",
          note: "You'll need your GA4 Property ID, Measurement ID, and Service Account credentials"
        }
      }), { status: 200 });
    }

    // Fetch all Google Analytics data in parallel
    const dataPromises = [
      getWebsiteMetrics(startDate, now),
      getTrafficSources(startDate, now),
      getTopPages(startDate, now, 10),
      getDailyAnalytics(startDate, now),
      getJobPageAnalytics(startDate, now),
      getGeographicAnalytics(startDate, now),
      getDeviceAnalytics(startDate, now),
      getUserJourneyAnalytics(startDate, now),
      getJobPerformanceAnalytics(startDate, now),
      getTimeAnalytics(startDate, now),
      getTechnologyAnalytics(startDate, now)
    ];

    // Add real-time data if requested
    if (includeRealtime) {
      dataPromises.push(getRealTimeAnalytics());
    }

    const results = await Promise.all(dataPromises);

    const [
      websiteMetrics,
      trafficSources,
      topPages,
      dailyAnalytics,
      jobPageAnalytics,
      geographicAnalytics,
      deviceAnalytics,
      userJourneyAnalytics,
      jobPerformanceAnalytics,
      timeAnalytics,
      technologyAnalytics,
      realTimeAnalytics = null
    ] = results;

    // Calculate additional insights
    const totalJobPageViews = jobPageAnalytics.reduce((sum, page) => sum + page.pageViews, 0);
    const avgJobPageBounceRate = jobPageAnalytics.length > 0 
      ? jobPageAnalytics.reduce((sum, page) => sum + page.bounceRate, 0) / jobPageAnalytics.length 
      : 0;

    // Format traffic sources with colors
    const formattedTrafficSources = trafficSources.map((source, index) => ({
      ...source,
      color: getTrafficSourceColor(source.source, index)
    }));

    const analyticsData = {
      enabled: true,
      configured: true,
      overview: {
        activeUsers: websiteMetrics.activeUsers,
        sessions: websiteMetrics.sessions,
        pageViews: websiteMetrics.pageViews,
        bounceRate: websiteMetrics.bounceRate,
        averageSessionDuration: websiteMetrics.averageSessionDuration,
        totalJobPageViews,
        avgJobPageBounceRate
      },
      trafficSources: formattedTrafficSources,
      topPages,
      dailyAnalytics,
      jobPages: jobPageAnalytics,
      realTime: realTimeAnalytics,
      geographic: geographicAnalytics,
      devices: deviceAnalytics,
      userJourney: userJourneyAnalytics,
      jobPerformance: jobPerformanceAnalytics,
      timePatterns: timeAnalytics,
      technology: technologyAnalytics,
      insights: {
        topTrafficSource: trafficSources[0]?.source || 'N/A',
        mostViewedPage: topPages[0]?.path || 'N/A',
        jobPagesPercentage: websiteMetrics.pageViews > 0 
          ? ((totalJobPageViews / websiteMetrics.pageViews) * 100).toFixed(2)
          : '0',
        topJobPage: jobPerformanceAnalytics[0]?.title || 'N/A',
        topCountry: geographicAnalytics[0]?.country || 'N/A',
        topDevice: deviceAnalytics[0]?.deviceCategory || 'N/A',
        peakHour: timeAnalytics.reduce((peak, current) => 
          current.sessions > (peak.sessions || 0) ? current : peak, {}).hour || 'N/A'
      }
    };

    return new Response(JSON.stringify(analyticsData), { 
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' // Cache for 5 minutes
      }
    });

  } catch (error) {
    console.error("Google Analytics fetch error:", error);
    
    // Check for specific error types and provide helpful messages
    let errorMessage = 'Failed to fetch Google Analytics data';
    let setupInstructions = null;
    
    if (error.message.includes('insufficient permissions') || error.message.includes('User does not have sufficient permissions')) {
      errorMessage = 'Service account does not have access to Google Analytics property';
      setupInstructions = {
        step1: "Go to Google Analytics Admin panel",
        step2: "Navigate to Property > Property Access Management",
        step3: "Add your service account email from the GA4 configuration",
        step4: "Grant 'Viewer' role to the service account",
        step5: "Wait 5-10 minutes for permissions to propagate",
        step6: "Refresh this page to try again",
        note: "Make sure you're using the correct Property ID and the service account email is added as a user to the GA4 property, not the account level."
      };
    } else if (error.message.includes('credentials') || error.message.includes('authentication')) {
      errorMessage = 'Google Analytics credentials not properly configured';
      setupInstructions = {
        step1: "Go to Applications Manager > Settings > Google Analytics 4 Integration",
        step2: "Verify your service account credentials are correct",
        step3: "Test the connection to ensure your configuration works",
        step4: "Re-configure if necessary using the configuration wizard"
      };
    } else if (error.message.includes('Property ID')) {
      errorMessage = 'Invalid Google Analytics Property ID';
      setupInstructions = {
        step1: "Go to Applications Manager > Settings > Google Analytics 4 Integration",
        step2: "Verify your Property ID is correct (numeric, like 123456789)",
        step3: "Make sure you're using a GA4 property, not Universal Analytics",
        step4: "Re-configure using the setup wizard if needed",
        note: "Use the Property ID, not the Measurement ID (G-XXXXXXXXXX)"
      };
    }
    
    // Return a structured error response
    return new Response(JSON.stringify({
      enabled: true,
      configured: true,
      error: true,
      message: errorMessage,
      setupInstructions,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }), { status: 200 }); // Return 200 to avoid breaking the dashboard
  }
}

// Helper function to assign colors to traffic sources
function getTrafficSourceColor(source, index) {
  const colors = {
    'Organic Search': '#10B981',
    'Direct': '#3B82F6', 
    'Social': '#8B5CF6',
    'Email': '#F59E0B',
    'Referral': '#EF4444',
    'Paid Search': '#06B6D4',
    'Display': '#84CC16'
  };
  
  const fallbackColors = [
    '#6B7280', '#F97316', '#EC4899', '#14B8A6', 
    '#F59E0B', '#8B5CF6', '#EF4444'
  ];
  
  return colors[source] || fallbackColors[index % fallbackColors.length];
}