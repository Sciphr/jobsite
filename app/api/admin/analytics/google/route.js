import { protectRoute } from "../../../../lib/middleware/apiProtection";
import { 
  getWebsiteMetrics, 
  getTrafficSources, 
  getTopPages,
  getDailyAnalytics,
  getJobPageAnalytics,
  isAnalyticsTrackingEnabled 
} from "../../../../lib/googleAnalytics";

export async function GET(req) {
  // Check if user has permission to view analytics
  const authResult = await protectRoute("analytics", "view");
  if (authResult.error) return authResult.error;

  try {
    // Check if analytics tracking is enabled
    const trackingEnabled = await isAnalyticsTrackingEnabled();
    if (!trackingEnabled) {
      return new Response(JSON.stringify({ 
        enabled: false,
        message: "Google Analytics tracking is disabled" 
      }), { status: 200 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "30d";

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

    // Check if service account credentials are configured
    if (!process.env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_EMAIL || 
        !process.env.GOOGLE_ANALYTICS_PRIVATE_KEY) {
      return new Response(JSON.stringify({
        enabled: true,
        configured: false,
        message: "Google Analytics service account credentials not configured",
        setupInstructions: {
          step1: "Go to Google Cloud Console",
          step2: "Enable Google Analytics Reporting API",
          step3: "Create a service account",
          step4: "Download service account JSON key",
          step5: "Add GOOGLE_ANALYTICS_SERVICE_ACCOUNT_EMAIL and GOOGLE_ANALYTICS_PRIVATE_KEY to environment variables",
          step6: "Add service account email to Google Analytics property users"
        }
      }), { status: 200 });
    }

    // Fetch all Google Analytics data in parallel
    const [
      websiteMetrics,
      trafficSources,
      topPages,
      dailyAnalytics,
      jobPageAnalytics
    ] = await Promise.all([
      getWebsiteMetrics(startDate, now),
      getTrafficSources(startDate, now),
      getTopPages(startDate, now, 10),
      getDailyAnalytics(startDate, now),
      getJobPageAnalytics(startDate, now)
    ]);

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
      insights: {
        topTrafficSource: trafficSources[0]?.source || 'N/A',
        mostViewedPage: topPages[0]?.path || 'N/A',
        jobPagesPercentage: websiteMetrics.pageViews > 0 
          ? ((totalJobPageViews / websiteMetrics.pageViews) * 100).toFixed(2)
          : '0'
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
    
    // Return a structured error response
    return new Response(JSON.stringify({
      enabled: true,
      configured: true,
      error: true,
      message: error.message.includes('credentials') 
        ? 'Google Analytics credentials not properly configured'
        : 'Failed to fetch Google Analytics data',
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