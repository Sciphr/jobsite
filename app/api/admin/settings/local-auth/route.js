import { NextResponse } from 'next/server';
import { appPrisma } from '../../../../lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { AuthAudit } from '../../../../lib/audit';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.privilegeLevel < 3) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all authentication-related settings
    const authSettings = await appPrisma.settings.findMany({
      where: {
        key: {
          in: [
            'local_auth_enabled',
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
      local_auth_enabled: settingsMap.local_auth_enabled === 'true' || true,
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
    console.error('Error fetching local auth settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch local auth settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.privilegeLevel < 3) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Define all possible settings with their metadata
    const settingsConfig = {
      local_auth_enabled: { dataType: 'boolean', description: 'Enable local username/password authentication' },
      local_auth_label: { dataType: 'string', description: 'Display label for local authentication method' },
      local_auth_description: { dataType: 'string', description: 'Description text shown under local authentication' },
      ldap_auth_label: { dataType: 'string', description: 'Display label for LDAP authentication method' },
      ldap_auth_description: { dataType: 'string', description: 'Description text shown under LDAP authentication' },
      saml_auth_label: { dataType: 'string', description: 'Display label for SAML authentication method' },
      saml_auth_description: { dataType: 'string', description: 'Description text shown under SAML authentication' },
      auth_show_descriptions: { dataType: 'boolean', description: 'Whether to show description text under authentication methods' },
      auth_default_method: { dataType: 'string', description: 'Default authentication method to select (local, ldap, saml)' }
    };

    // Update each setting that was provided
    const updatePromises = [];
    for (const [key, value] of Object.entries(body)) {
      if (settingsConfig[key]) {
        const config = settingsConfig[key];

        // Validate data types
        if (config.dataType === 'boolean' && typeof value !== 'boolean') {
          return NextResponse.json(
            { error: `${key} must be a boolean` },
            { status: 400 }
          );
        }
        if (config.dataType === 'string' && typeof value !== 'string') {
          return NextResponse.json(
            { error: `${key} must be a string` },
            { status: 400 }
          );
        }

        // Validate specific constraints
        if (key === 'auth_default_method' && !['local', 'ldap', 'saml'].includes(value)) {
          return NextResponse.json(
            { error: 'auth_default_method must be one of: local, ldap, saml' },
            { status: 400 }
          );
        }

        // Handle system-wide settings (userId: null) differently
        // Since Prisma composite key doesn't allow null values, we need to check and update/create manually
        updatePromises.push(
          (async () => {
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
                data: {
                  value: value.toString(),
                  updatedAt: new Date()
                }
              });
            } else {
              // Create new setting
              return appPrisma.settings.create({
                data: {
                  key: key,
                  value: value.toString(),
                  description: config.description,
                  dataType: config.dataType,
                  category: 'authentication',
                  userId: null,
                  privilegeLevel: 3,
                  updatedAt: new Date()
                }
              });
            }
          })()
        );
      }
    }

    // Execute all updates
    await Promise.all(updatePromises);

    // Log authentication method change if local_auth_enabled was modified
    if ('local_auth_enabled' in body) {
      if (body.local_auth_enabled) {
        await AuthAudit.authMethodEnabled('local', session?.user);
      } else {
        await AuthAudit.authMethodDisabled('local', session?.user);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Authentication settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating local auth settings:', error);
    return NextResponse.json(
      { error: 'Failed to update local auth settings' },
      { status: 500 }
    );
  }
}