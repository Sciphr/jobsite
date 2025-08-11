import { appPrisma } from "../../../lib/prisma";

export async function GET() {
  try {
    // Check if LDAP is enabled (system-wide setting with userId = null)
    const ldapEnabledSetting = await appPrisma.settings.findFirst({
      where: { 
        key: 'ldap_enabled',
        userId: null
      }
    });

    const isLDAPEnabled = ldapEnabledSetting?.value === 'true';

    return Response.json({ 
      ldap_enabled: isLDAPEnabled 
    });
  } catch (error) {
    console.error('Error checking LDAP status:', error);
    return Response.json({ 
      ldap_enabled: false 
    });
  }
}