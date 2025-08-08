import { protectRoute } from "../../../../lib/middleware/apiProtection";
import crypto from 'crypto';

// Encryption functions
const ENCRYPTION_KEY = process.env.ENCRYPTION_SECRET || 'your-fallback-key-change-this';
const ALGORITHM = 'aes-256-cbc';

function encrypt(text) {
  try {
    // Create a proper key from the encryption secret
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

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
  // Check if user has permission to configure analytics
  const authResult = await protectRoute("analytics", "configure");
  if (authResult.error) return authResult.error;

  try {
    const { propertyId, measurementId, serviceAccountEmail, serviceAccountPrivateKey } = await req.json();
    
    console.log('Received configuration request:', { 
      propertyId, 
      measurementId, 
      serviceAccountEmail,
      hasPrivateKey: !!serviceAccountPrivateKey 
    });

    // Validate required fields
    if (!propertyId || !measurementId || !serviceAccountEmail || !serviceAccountPrivateKey) {
      console.log('Validation failed - missing fields');
      return new Response(JSON.stringify({
        success: false,
        error: "All fields are required"
      }), { status: 400 });
    }

    // Encrypt the private key
    console.log('Encrypting private key...');
    const encryptedPrivateKey = encrypt(serviceAccountPrivateKey);
    console.log('Private key encrypted successfully');

    // Save to database
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    try {
      console.log('Connecting to database...');
      
      // Check if configuration already exists
      const existingResult = await pool.query(
        'SELECT id FROM analytics_configurations LIMIT 1'
      );
      
      console.log('Existing configurations found:', existingResult.rows.length);

      let query, values;
      if (existingResult.rows.length > 0) {
        console.log('Updating existing configuration...');
        // Update existing configuration
        query = `
          UPDATE analytics_configurations 
          SET property_id = $1, 
              measurement_id = $2, 
              service_account_email = $3, 
              service_account_private_key = $4,
              connection_status = 'connected',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $5
          RETURNING id
        `;
        values = [propertyId, measurementId, serviceAccountEmail, encryptedPrivateKey, existingResult.rows[0].id];
      } else {
        console.log('Inserting new configuration...');
        // Insert new configuration
        query = `
          INSERT INTO analytics_configurations 
          (property_id, measurement_id, service_account_email, service_account_private_key, connection_status)
          VALUES ($1, $2, $3, $4, 'connected')
          RETURNING id
        `;
        values = [propertyId, measurementId, serviceAccountEmail, encryptedPrivateKey];
      }

      const result = await pool.query(query, values);
      console.log('Database operation completed successfully, ID:', result.rows[0].id);

      // Update the analytics_tracking setting to true
      console.log('Updating analytics_tracking setting...');
      const { updateSystemSetting } = await import("../../../../lib/settings");
      await updateSystemSetting("analytics_tracking", true);
      console.log('Settings updated successfully');

      return new Response(JSON.stringify({
        success: true,
        message: "Configuration saved successfully",
        configId: result.rows[0].id
      }), { status: 200 });

    } finally {
      await pool.end();
    }

  } catch (error) {
    console.error('Configuration save error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: "Failed to save configuration"
    }), { status: 500 });
  }
}

export async function GET(req) {
  // Check if user has permission to view analytics config
  const authResult = await protectRoute("analytics", "view");
  if (authResult.error) return authResult.error;

  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    try {
      const result = await pool.query(`
        SELECT 
          id,
          property_id,
          measurement_id,
          service_account_email,
          connection_status,
          last_test_at,
          test_error_message,
          created_at,
          updated_at
        FROM analytics_configurations 
        ORDER BY created_at DESC 
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          configured: false
        }), { status: 200 });
      }

      const config = result.rows[0];
      return new Response(JSON.stringify({
        success: true,
        configured: true,
        config: {
          id: config.id,
          propertyId: config.property_id,
          measurementId: config.measurement_id,
          serviceAccountEmail: config.service_account_email,
          connectionStatus: config.connection_status,
          lastTestAt: config.last_test_at,
          testErrorMessage: config.test_error_message,
          createdAt: config.created_at,
          updatedAt: config.updated_at
        }
      }), { status: 200 });

    } finally {
      await pool.end();
    }

  } catch (error) {
    console.error('Get configuration error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: "Failed to get configuration"
    }), { status: 500 });
  }
}

export async function DELETE(req) {
  // Check if user has permission to configure analytics
  const authResult = await protectRoute("analytics", "configure");
  if (authResult.error) return authResult.error;

  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    try {
      // Delete all analytics configurations
      await pool.query('DELETE FROM analytics_configurations');

      // Update the analytics_tracking setting to false
      const { updateSystemSetting } = await import("../../../../lib/settings");
      await updateSystemSetting("analytics_tracking", false);

      return new Response(JSON.stringify({
        success: true,
        message: "Configuration removed successfully"
      }), { status: 200 });

    } finally {
      await pool.end();
    }

  } catch (error) {
    console.error('Configuration delete error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: "Failed to remove configuration"
    }), { status: 500 });
  }
}