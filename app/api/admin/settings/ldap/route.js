import { withAdminAuth } from "../../../../lib/auth";
import { appPrisma } from "../../../../lib/prisma";

// LDAP setting keys
const LDAP_SETTINGS = [
  'ldap_enabled',
  'ldap_server',
  'ldap_port',
  'ldap_base_dn',
  'ldap_bind_dn',
  'ldap_bind_password',
  'ldap_user_search_base',
  'ldap_group_search_base',
  'ldap_use_ssl',
  // Field mapping settings
  'ldap_field_email',
  'ldap_field_first_name',
  'ldap_field_last_name',
  'ldap_field_phone',
  'ldap_field_display_name',
  'ldap_field_user_id',
  'ldap_use_default_fallbacks'
];

export const GET = withAdminAuth(async (request) => {
  try {
    // Get all LDAP settings from database (system-wide settings have userId = null)
    const settings = await appPrisma.settings.findMany({
      where: {
        key: {
          in: LDAP_SETTINGS
        },
        userId: null
      }
    });

    // Convert to key-value object with defaults
    const ldapSettings = {
      ldap_enabled: false,
      ldap_server: '',
      ldap_port: '389',
      ldap_base_dn: '',
      ldap_bind_dn: '',
      ldap_bind_password: '',
      ldap_user_search_base: '',
      ldap_group_search_base: '',
      ldap_use_ssl: false,
      // Field mapping defaults
      ldap_field_email: 'mail',
      ldap_field_first_name: 'givenName',
      ldap_field_last_name: 'sn',
      ldap_field_phone: 'telephoneNumber',
      ldap_field_display_name: 'displayName',
      ldap_field_user_id: 'uid',
      ldap_use_default_fallbacks: true
    };

    // Override with database values
    settings.forEach(setting => {
      if (setting.key === 'ldap_enabled' || setting.key === 'ldap_use_ssl' || setting.key === 'ldap_use_default_fallbacks') {
        ldapSettings[setting.key] = setting.value === 'true';
      } else {
        ldapSettings[setting.key] = setting.value;
      }
    });

    return Response.json(ldapSettings);
  } catch (error) {
    console.error('Error fetching LDAP settings:', error);
    return Response.json({ error: 'Failed to fetch LDAP settings' }, { status: 500 });
  }
});

export const PUT = withAdminAuth(async (request) => {
  try {
    const body = await request.json();
    
    // Validate required fields if LDAP is enabled
    if (body.ldap_enabled) {
      const required = ['ldap_server', 'ldap_base_dn', 'ldap_bind_dn', 'ldap_bind_password'];
      const missing = required.filter(field => !body[field] || body[field].trim() === '');
      
      if (missing.length > 0) {
        return Response.json({
          error: `Missing required fields: ${missing.join(', ')}`
        }, { status: 400 });
      }
    }

    // Update settings in database (system-wide settings have userId = null)
    const updatePromises = LDAP_SETTINGS.map(async (key) => {
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
      message: 'LDAP settings saved successfully' 
    });
  } catch (error) {
    console.error('Error saving LDAP settings:', error);
    return Response.json({ error: 'Failed to save LDAP settings' }, { status: 500 });
  }
});