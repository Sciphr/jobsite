import { NextResponse } from 'next/server';
import { appPrisma } from '../../../lib/prisma';

export async function GET() {
  try {
    // Get authentication label settings - this is a public endpoint
    const authSettings = await appPrisma.settings.findMany({
      where: {
        key: {
          in: [
            'local_auth_label',
            'local_auth_description',
            'ldap_auth_label',
            'ldap_auth_description',
            'saml_auth_label',
            'saml_auth_description',
            'auth_show_descriptions',
            'auth_default_method'
          ]
        },
        userId: null // System-wide settings
      }
    });

    // Convert to key-value pairs with defaults
    const settingsMap = authSettings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    return NextResponse.json({
      local_auth_label: settingsMap.local_auth_label || 'Local Login',
      local_auth_description: settingsMap.local_auth_description || 'For external candidates and contractors',
      ldap_auth_label: settingsMap.ldap_auth_label || 'Employee Login',
      ldap_auth_description: settingsMap.ldap_auth_description || 'Use your company credentials',
      saml_auth_label: settingsMap.saml_auth_label || 'Company Login',
      saml_auth_description: settingsMap.saml_auth_description || 'Use your single sign-on account',
      auth_show_descriptions: settingsMap.auth_show_descriptions === 'true' || true,
      auth_default_method: settingsMap.auth_default_method || 'local'
    });
  } catch (error) {
    console.error('Error fetching auth labels:', error);
    // Return defaults on error to ensure sign-in page still works
    return NextResponse.json({
      local_auth_label: 'Local Login',
      local_auth_description: 'For external candidates and contractors',
      ldap_auth_label: 'Employee Login',
      ldap_auth_description: 'Use your company credentials',
      saml_auth_label: 'Company Login',
      saml_auth_description: 'Use your single sign-on account',
      auth_show_descriptions: true,
      auth_default_method: 'local'
    });
  }
}