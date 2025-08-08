import { protectRoute } from "../../../../lib/middleware/apiProtection";
import crypto from 'crypto';

export async function POST(req) {
  // Check if user has permission to configure analytics
  const authResult = await protectRoute("analytics", "configure");
  if (authResult.error) return authResult.error;

  try {
    const { propertyId, measurementId, serviceAccountEmail, serviceAccountPrivateKey } = await req.json();

    // Validate required fields
    if (!propertyId || !measurementId || !serviceAccountEmail || !serviceAccountPrivateKey) {
      return new Response(JSON.stringify({
        success: false,
        error: "All fields are required"
      }), { status: 400 });
    }

    // Test the connection by creating a temporary analytics client
    const { google } = require('googleapis');
    
    try {
      // Create JWT client with provided credentials
      const jwtClient = new google.auth.JWT(
        serviceAccountEmail,
        null,
        serviceAccountPrivateKey.replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/analytics.readonly'],
        null
      );

      // Test authentication
      await jwtClient.authorize();

      // Create analytics client
      const analyticsData = google.analyticsdata('v1beta');

      // Test basic query to verify property access
      const testResponse = await analyticsData.properties.runReport({
        auth: jwtClient,
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ 
            startDate: '7daysAgo', 
            endDate: 'today' 
          }],
          metrics: [{ name: 'activeUsers' }]
        }
      });

      const activeUsers = testResponse.data.rows?.[0]?.metricValues?.[0]?.value || '0';

      return new Response(JSON.stringify({
        success: true,
        message: "Connection successful",
        data: {
          propertyId,
          measurementId,
          activeUsers: parseInt(activeUsers)
        }
      }), { status: 200 });

    } catch (apiError) {
      console.error('GA4 API Error:', apiError);
      
      let errorMessage = 'Failed to connect to Google Analytics';
      
      if (apiError.message?.includes('insufficient permissions') || apiError.code === 403) {
        errorMessage = 'Service account does not have access to this GA4 property. Please add the service account email as a Viewer in your GA4 property settings.';
      } else if (apiError.message?.includes('invalid_grant') || apiError.code === 401) {
        errorMessage = 'Invalid service account credentials. Please check your private key and email.';
      } else if (apiError.message?.includes('not found') || apiError.code === 404) {
        errorMessage = 'GA4 property not found. Please verify your Property ID.';
      }

      return new Response(JSON.stringify({
        success: false,
        error: errorMessage
      }), { status: 200 }); // Return 200 to avoid breaking the UI
    }

  } catch (error) {
    console.error('Test connection error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: "Server error during connection test"
    }), { status: 500 });
  }
}