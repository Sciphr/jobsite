import { appPrisma } from "../../../lib/prisma";

export async function GET() {
  try {
    // Get SAML enabled status from settings
    const samlSetting = await appPrisma.settings.findFirst({
      where: {
        key: 'saml_enabled',
        userId: null // System-wide setting
      }
    });

    return Response.json({
      saml_enabled: samlSetting?.value === 'true' || false
    });
  } catch (error) {
    console.error('Error checking SAML status:', error);
    return Response.json({
      saml_enabled: false
    });
  }
}