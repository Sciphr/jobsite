import { protectRoute } from "../../../../lib/middleware/apiProtection";
import crypto from 'crypto';

// Decryption function
const ENCRYPTION_KEY = process.env.ENCRYPTION_SECRET || 'your-fallback-key-change-this';
const ALGORITHM = 'aes-256-cbc';

function decrypt(encryptedData) {
  try {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    // Create the same key from the encryption secret
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

export async function POST(req) {
  // Check if user has permission to test analytics
  const authResult = await protectRoute("analytics", "view");
  if (authResult.error) return authResult.error;

  try {
    // Get stored configuration from database
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    let config;
    try {
      const result = await pool.query(`
        SELECT 
          property_id,
          measurement_id,
          service_account_email,
          service_account_private_key
        FROM analytics_configurations 
        ORDER BY created_at DESC 
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          error: "No analytics configuration found"
        }), { status: 400 });
      }

      config = result.rows[0];
    } finally {
      await pool.end();
    }

    // Decrypt the private key
    let decryptedPrivateKey;
    try {
      decryptedPrivateKey = decrypt(config.service_account_private_key);
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to decrypt stored credentials"
      }), { status: 500 });
    }

    // Test the connection using stored credentials
    const { google } = require('googleapis');
    
    try {
      // Clean and format the private key
      let formattedPrivateKey = decryptedPrivateKey;
      
      // Handle different private key formats
      if (!formattedPrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        // If it's just the key content, wrap it
        formattedPrivateKey = `-----BEGIN PRIVATE KEY-----\n${formattedPrivateKey}\n-----END PRIVATE KEY-----`;
      }
      
      // Replace literal \n with actual newlines
      formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n');

      // Create JWT client with proper key formatting
      const jwtClient = new google.auth.JWT({
        email: config.service_account_email,
        key: formattedPrivateKey,
        scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
      });

      // Test authentication
      await jwtClient.authorize();

      // Create analytics client
      const analyticsData = google.analyticsdata('v1beta');

      // Test basic query to verify property access
      const testResponse = await analyticsData.properties.runReport({
        auth: jwtClient,
        property: `properties/${config.property_id}`,
        requestBody: {
          dateRanges: [{ 
            startDate: '7daysAgo', 
            endDate: 'today' 
          }],
          metrics: [{ name: 'activeUsers' }]
        }
      });

      const activeUsers = testResponse.data.rows?.[0]?.metricValues?.[0]?.value || '0';

      // Update connection status in database
      const { Pool: Pool2 } = require('pg');
      const pool2 = new Pool2({
        connectionString: process.env.DATABASE_URL,
      });

      try {
        await pool2.query(`
          UPDATE analytics_configurations 
          SET connection_status = 'connected',
              last_test_at = CURRENT_TIMESTAMP,
              test_error_message = NULL
        `);
      } finally {
        await pool2.end();
      }

      return new Response(JSON.stringify({
        success: true,
        message: "Connection test successful",
        data: {
          propertyId: config.property_id,
          measurementId: config.measurement_id,
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

      // Update connection status to failed
      const { Pool: Pool3 } = require('pg');
      const pool3 = new Pool3({
        connectionString: process.env.DATABASE_URL,
      });

      try {
        await pool3.query(`
          UPDATE analytics_configurations 
          SET connection_status = 'failed',
              last_test_at = CURRENT_TIMESTAMP,
              test_error_message = $1
        `, [errorMessage]);
      } finally {
        await pool3.end();
      }

      return new Response(JSON.stringify({
        success: false,
        error: errorMessage
      }), { status: 200 }); // Return 200 to avoid breaking the UI
    }

  } catch (error) {
    console.error('Test stored connection error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: "Server error during connection test"
    }), { status: 500 });
  }
}