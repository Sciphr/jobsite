import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

// Google Analytics property ID (without the G- prefix)
const GA_PROPERTY_ID = '474651932'; // Your G-NGGR5RCXPB property ID

/**
 * Initialize Google Analytics client with service account credentials
 */
function getAnalyticsClient() {
  if (!process.env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_EMAIL || 
      !process.env.GOOGLE_ANALYTICS_PRIVATE_KEY) {
    throw new Error('Google Analytics service account credentials not configured');
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
 * Check if Google Analytics tracking is enabled
 */
export async function isAnalyticsTrackingEnabled() {
  try {
    const { getSystemSetting } = await import("./settings");
    return await getSystemSetting("analytics_tracking", false);
  } catch (error) {
    console.error('Error checking analytics tracking setting:', error);
    return false;
  }
}