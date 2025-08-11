import { withAdminAuth } from "../../../../lib/auth";
import { appPrisma } from "../../../../lib/prisma";

// SAML setting keys
const SAML_SETTINGS = [
  'saml_enabled',
  'saml_entity_id',
  'saml_sso_url',
  'saml_sls_url',
  'saml_certificate',
  'saml_private_key',
  'saml_want_assertions_signed',
  'saml_want_response_signed',
  // Field mapping settings
  'saml_field_email',
  'saml_field_first_name',
  'saml_field_last_name',
  'saml_field_phone',
  'saml_field_display_name',
  'saml_field_user_id',
  'saml_use_default_fallbacks'
];

export const GET = withAdminAuth(async (request) => {
  try {
    // Get all SAML settings from database (system-wide settings have userId = null)
    const settings = await appPrisma.settings.findMany({
      where: {
        key: {
          in: SAML_SETTINGS
        },
        userId: null
      }
    });

    // Convert to key-value object with defaults
    const samlSettings = {
      saml_enabled: false,
      saml_entity_id: '',
      saml_sso_url: '',
      saml_sls_url: '',
      saml_certificate: '',
      saml_private_key: '',
      saml_want_assertions_signed: true,
      saml_want_response_signed: true,
      // Field mapping defaults (Azure AD format)
      saml_field_email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
      saml_field_first_name: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
      saml_field_last_name: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
      saml_field_phone: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/mobilephone',
      saml_field_display_name: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/displayname',
      saml_field_user_id: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
      saml_use_default_fallbacks: true
    };

    // Override with database values
    settings.forEach(setting => {
      if (setting.key === 'saml_enabled' || setting.key === 'saml_want_assertions_signed' || 
          setting.key === 'saml_want_response_signed' || setting.key === 'saml_use_default_fallbacks') {
        samlSettings[setting.key] = setting.value === 'true';
      } else {
        samlSettings[setting.key] = setting.value;
      }
    });

    return Response.json(samlSettings);
  } catch (error) {
    console.error('Error fetching SAML settings:', error);
    return Response.json({ error: 'Failed to fetch SAML settings' }, { status: 500 });
  }
});

export const PUT = withAdminAuth(async (request) => {
  try {
    const body = await request.json();
    
    // Validate required fields if SAML is enabled
    if (body.saml_enabled) {
      const required = ['saml_entity_id', 'saml_sso_url', 'saml_certificate'];
      const missing = required.filter(field => !body[field] || body[field].trim() === '');
      
      if (missing.length > 0) {
        return Response.json({
          error: `Missing required fields: ${missing.join(', ')}`
        }, { status: 400 });
      }
    }

    // Update settings in database (system-wide settings have userId = null)
    const updatePromises = SAML_SETTINGS.map(async (key) => {
      const value = body[key];
      const stringValue = typeof value === 'boolean' ? value.toString() : (value || '');

      // Check if setting exists first
      const existingSetting = await appPrisma.settings.findFirst({
        where: {
          key: key,
          userId: null
        }
      });

      if (existingSetting) {
        // Update existing setting
        return appPrisma.settings.update({
          where: { id: existingSetting.id },
          data: { value: stringValue }
        });
      } else {
        // Create new setting
        return appPrisma.settings.create({
          data: { 
            key: key, 
            value: stringValue, 
            userId: null,
            category: 'system',
            privilegeLevel: 2, // Admin level
            dataType: 'string'
          }
        });
      }
    });

    await Promise.all(updatePromises);

    return Response.json({ 
      success: true, 
      message: 'SAML settings saved successfully' 
    });
  } catch (error) {
    console.error('Error saving SAML settings:', error);
    return Response.json({ error: 'Failed to save SAML settings' }, { status: 500 });
  }
});