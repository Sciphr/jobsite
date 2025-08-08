import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

// Google Analytics property ID (without the G- prefix) - read from environment variables
const GA_PROPERTY_ID = process.env.GOOGLE_ANALYTICS_PROPERTY_ID;

/**
 * Initialize Google Analytics client with service account credentials
 */
function getAnalyticsClient() {
  if (!process.env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_EMAIL || 
      !process.env.GOOGLE_ANALYTICS_PRIVATE_KEY) {
    throw new Error('Google Analytics service account credentials not configured');
  }

  if (!GA_PROPERTY_ID) {
    throw new Error('GOOGLE_ANALYTICS_PROPERTY_ID environment variable not configured');
  }

  const auth = new JWT({
    email: process.env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_ANALYTICS_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });

  return google.analyticsdata({ version: 'v1beta', auth });
}

/**
 * Get basic website metrics from Google Analytics
 */
export async function getWebsiteMetrics(startDate, endDate) {
  try {
    const analyticsDataClient = getAnalyticsClient();

    const response = await analyticsDataClient.properties.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      requestBody: {
        dateRanges: [
          {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
          },
        ],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ],
      }
    });

    if (!response.data.rows || response.data.rows.length === 0) {
      return {
        activeUsers: 0,
        sessions: 0,
        pageViews: 0,
        bounceRate: 0,
        averageSessionDuration: 0,
      };
    }

    const row = response.data.rows[0];
    return {
      activeUsers: parseInt(row.metricValues[0].value || '0'),
      sessions: parseInt(row.metricValues[1].value || '0'),
      pageViews: parseInt(row.metricValues[2].value || '0'),
      bounceRate: parseFloat(row.metricValues[3].value || '0'),
      averageSessionDuration: parseFloat(row.metricValues[4].value || '0'),
    };
  } catch (error) {
    console.error('Error fetching GA website metrics:', error);
    return {
      activeUsers: 0,
      sessions: 0,
      pageViews: 0,
      bounceRate: 0,
      averageSessionDuration: 0,
    };
  }
}

/**
 * Get traffic sources from Google Analytics
 */
export async function getTrafficSources(startDate, endDate) {
  try {
    const analyticsDataClient = getAnalyticsClient();

    const response = await analyticsDataClient.properties.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      requestBody: {
        dateRanges: [
          {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
          },
        ],
        dimensions: [{ name: 'sessionDefaultChannelGrouping' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      }
    });

    if (!response.data.rows) {
      return [];
    }

    return response.data.rows.map(row => ({
      source: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value || '0'),
    }));
  } catch (error) {
    console.error('Error fetching GA traffic sources:', error);
    return [];
  }
}

/**
 * Get top pages from Google Analytics
 */
export async function getTopPages(startDate, endDate, limit = 10) {
  try {
    const analyticsDataClient = getAnalyticsClient();

    const response = await analyticsDataClient.properties.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      requestBody: {
        dateRanges: [
          {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
          },
        ],
        dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: limit,
      }
    });

    if (!response.data.rows) {
      return [];
    }

    return response.data.rows.map(row => ({
      path: row.dimensionValues[0].value,
      title: row.dimensionValues[1].value,
      pageViews: parseInt(row.metricValues[0].value || '0'),
      sessions: parseInt(row.metricValues[1].value || '0'),
    }));
  } catch (error) {
    console.error('Error fetching GA top pages:', error);
    return [];
  }
}

/**
 * Get daily analytics data for charts
 */
export async function getDailyAnalytics(startDate, endDate) {
  try {
    const analyticsDataClient = getAnalyticsClient();

    const response = await analyticsDataClient.properties.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      requestBody: {
        dateRanges: [
          {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
          },
        ],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
        ],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }
    });

    if (!response.data.rows) {
      return [];
    }

    return response.data.rows.map(row => ({
      date: row.dimensionValues[0].value,
      users: parseInt(row.metricValues[0].value || '0'),
      sessions: parseInt(row.metricValues[1].value || '0'),
      pageViews: parseInt(row.metricValues[2].value || '0'),
    }));
  } catch (error) {
    console.error('Error fetching GA daily analytics:', error);
    return [];
  }
}

/**
 * Get job page specific analytics
 */
export async function getJobPageAnalytics(startDate, endDate) {
  try {
    const analyticsDataClient = getAnalyticsClient();

    const response = await analyticsDataClient.properties.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      requestBody: {
        dateRanges: [
          {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
          },
        ],
        dimensions: [{ name: 'pagePath' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'sessions' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' }
        ],
        dimensionFilter: {
          filter: {
            fieldName: 'pagePath',
            stringFilter: {
              matchType: 'CONTAINS',
              value: '/jobs/',
            },
          },
        },
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 20,
      }
    });

    if (!response.data.rows) {
      return [];
    }

    return response.data.rows.map(row => ({
      path: row.dimensionValues[0].value,
      pageViews: parseInt(row.metricValues[0].value || '0'),
      sessions: parseInt(row.metricValues[1].value || '0'),
      bounceRate: parseFloat(row.metricValues[2].value || '0'),
      avgSessionDuration: parseFloat(row.metricValues[3].value || '0'),
    }));
  } catch (error) {
    console.error('Error fetching GA job page analytics:', error);
    return [];
  }
}

/**
 * Get real-time analytics data
 */
export async function getRealTimeAnalytics() {
  try {
    const analyticsDataClient = getAnalyticsClient();

    const response = await analyticsDataClient.properties.runRealtimeReport({
      property: `properties/${GA_PROPERTY_ID}`,
      requestBody: {
        dimensions: [
          { name: 'country' },
          { name: 'deviceCategory' },
        ],
        metrics: [
          { name: 'activeUsers' },
        ],
        limit: 10,
      }
    });

    const totalActiveUsers = response.data.totals?.[0]?.metricValues?.[0]?.value || '0';
    
    const breakdown = response.data.rows?.map(row => ({
      country: row.dimensionValues[0].value,
      device: row.dimensionValues[1].value,
      activeUsers: parseInt(row.metricValues[0].value || '0'),
    })) || [];

    return {
      totalActiveUsers: parseInt(totalActiveUsers),
      breakdown,
    };
  } catch (error) {
    console.error('Error fetching real-time analytics:', error);
    throw error;
  }
}

/**
 * Get geographic analytics data
 */
export async function getGeographicAnalytics(startDate, endDate) {
  try {
    const analyticsDataClient = getAnalyticsClient();

    const response = await analyticsDataClient.properties.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      requestBody: {
        dateRanges: [{
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        }],
        dimensions: [
          { name: 'country' },
          { name: 'city' },
        ],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
        ],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 20,
      }
    });

    return response.data.rows?.map(row => ({
      country: row.dimensionValues[0].value,
      city: row.dimensionValues[1].value,
      activeUsers: parseInt(row.metricValues[0].value || '0'),
      sessions: parseInt(row.metricValues[1].value || '0'),
      pageViews: parseInt(row.metricValues[2].value || '0'),
    })) || [];
  } catch (error) {
    console.error('Error fetching geographic analytics:', error);
    throw error;
  }
}

/**
 * Get device and technology analytics
 */
export async function getDeviceAnalytics(startDate, endDate) {
  try {
    const analyticsDataClient = getAnalyticsClient();

    const response = await analyticsDataClient.properties.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      requestBody: {
        dateRanges: [{
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        }],
        dimensions: [
          { name: 'deviceCategory' },
          { name: 'operatingSystem' },
          { name: 'browser' },
        ],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'bounceRate' },
        ],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 15,
      }
    });

    return response.data.rows?.map(row => ({
      deviceCategory: row.dimensionValues[0].value,
      operatingSystem: row.dimensionValues[1].value,
      browser: row.dimensionValues[2].value,
      activeUsers: parseInt(row.metricValues[0].value || '0'),
      sessions: parseInt(row.metricValues[1].value || '0'),
      bounceRate: parseFloat(row.metricValues[2].value || '0'),
    })) || [];
  } catch (error) {
    console.error('Error fetching device analytics:', error);
    throw error;
  }
}

/**
 * Get detailed technology analytics (browsers, OS, screen resolutions)
 */
export async function getTechnologyAnalytics(startDate, endDate) {
  try {
    const analyticsDataClient = getAnalyticsClient();

    // Get browser breakdown
    const browserResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      requestBody: {
        dateRanges: [{
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        }],
        dimensions: [
          { name: 'browser' },
        ],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 10,
      }
    });

    // Get operating system breakdown
    const osResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      requestBody: {
        dateRanges: [{
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        }],
        dimensions: [
          { name: 'operatingSystem' },
        ],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 10,
      }
    });

    // Get screen resolution breakdown
    const screenResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      requestBody: {
        dateRanges: [{
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        }],
        dimensions: [
          { name: 'screenResolution' },
        ],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
        ],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 8,
      }
    });

    const browsers = browserResponse.data.rows?.map(row => ({
      browser: row.dimensionValues[0].value,
      activeUsers: parseInt(row.metricValues[0].value || '0'),
      sessions: parseInt(row.metricValues[1].value || '0'),
      bounceRate: parseFloat(row.metricValues[2].value || '0'),
      avgSessionDuration: parseFloat(row.metricValues[3].value || '0'),
    })) || [];

    const operatingSystems = osResponse.data.rows?.map(row => ({
      operatingSystem: row.dimensionValues[0].value,
      activeUsers: parseInt(row.metricValues[0].value || '0'),
      sessions: parseInt(row.metricValues[1].value || '0'),
      bounceRate: parseFloat(row.metricValues[2].value || '0'),
      avgSessionDuration: parseFloat(row.metricValues[3].value || '0'),
    })) || [];

    const screenResolutions = screenResponse.data.rows?.map(row => ({
      screenResolution: row.dimensionValues[0].value,
      activeUsers: parseInt(row.metricValues[0].value || '0'),
      sessions: parseInt(row.metricValues[1].value || '0'),
    })) || [];

    return {
      browsers,
      operatingSystems,
      screenResolutions
    };
  } catch (error) {
    console.error('Error fetching technology analytics:', error);
    throw error;
  }
}

/**
 * Get user journey and behavior analytics
 */
export async function getUserJourneyAnalytics(startDate, endDate) {
  try {
    const analyticsDataClient = getAnalyticsClient();

    // Get landing pages
    const landingPagesResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      requestBody: {
        dateRanges: [{
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        }],
        dimensions: [{ name: 'landingPage' }],
        metrics: [
          { name: 'sessions' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 10,
      }
    });

    // Get user engagement
    const engagementResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      requestBody: {
        dateRanges: [{
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        }],
        metrics: [
          { name: 'engagedSessions' },
          { name: 'userEngagementDuration' },
          { name: 'sessionsPerUser' },
        ],
      }
    });

    const landingPages = landingPagesResponse.data.rows?.map(row => ({
      page: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value || '0'),
      bounceRate: parseFloat(row.metricValues[1].value || '0'),
      avgSessionDuration: parseFloat(row.metricValues[2].value || '0'),
    })) || [];

    const engagement = engagementResponse.data.rows?.[0] ? {
      engagedSessions: parseInt(engagementResponse.data.rows[0].metricValues[0].value || '0'),
      userEngagementDuration: parseFloat(engagementResponse.data.rows[0].metricValues[1].value || '0'),
      sessionsPerUser: parseFloat(engagementResponse.data.rows[0].metricValues[2].value || '0'),
    } : null;

    return {
      landingPages,
      engagement,
    };
  } catch (error) {
    console.error('Error fetching user journey analytics:', error);
    throw error;
  }
}

/**
 * Get enhanced job performance analytics
 */
export async function getJobPerformanceAnalytics(startDate, endDate) {
  try {
    const analyticsDataClient = getAnalyticsClient();

    // Get detailed job page analytics with more metrics
    const response = await analyticsDataClient.properties.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      requestBody: {
        dateRanges: [{
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        }],
        dimensions: [
          { name: 'pagePath' },
          { name: 'pageTitle' },
        ],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
          { name: 'userEngagementDuration' },
        ],
        dimensionFilter: {
          filter: {
            fieldName: 'pagePath',
            stringFilter: {
              matchType: 'CONTAINS',
              value: '/jobs/',
            },
          },
        },
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 25,
      }
    });

    return response.data.rows?.map(row => ({
      path: row.dimensionValues[0].value,
      title: row.dimensionValues[1].value,
      pageViews: parseInt(row.metricValues[0].value || '0'),
      sessions: parseInt(row.metricValues[1].value || '0'),
      activeUsers: parseInt(row.metricValues[2].value || '0'),
      bounceRate: parseFloat(row.metricValues[3].value || '0'),
      avgSessionDuration: parseFloat(row.metricValues[4].value || '0'),
      engagementDuration: parseFloat(row.metricValues[5].value || '0'),
    })) || [];
  } catch (error) {
    console.error('Error fetching job performance analytics:', error);
    throw error;
  }
}

/**
 * Get time-based analytics (hourly patterns)
 */
export async function getTimeAnalytics(startDate, endDate) {
  try {
    const analyticsDataClient = getAnalyticsClient();

    const response = await analyticsDataClient.properties.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      requestBody: {
        dateRanges: [{
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        }],
        dimensions: [
          { name: 'hour' },
          { name: 'dayOfWeek' },
        ],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
        ],
        orderBys: [
          { dimension: { dimensionName: 'dayOfWeek' } },
          { dimension: { dimensionName: 'hour' } },
        ],
      }
    });

    return response.data.rows?.map(row => ({
      hour: parseInt(row.dimensionValues[0].value),
      dayOfWeek: parseInt(row.dimensionValues[1].value), // 0 = Sunday, 6 = Saturday
      activeUsers: parseInt(row.metricValues[0].value || '0'),
      sessions: parseInt(row.metricValues[1].value || '0'),
    })) || [];
  } catch (error) {
    console.error('Error fetching time analytics:', error);
    throw error;
  }
}

