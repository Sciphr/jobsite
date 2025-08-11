import { appPrisma } from "../../../lib/prisma";

export async function GET() {
  try {
    // Get local auth enabled status from settings
    const localAuthSetting = await appPrisma.settings.findFirst({
      where: {
        key: 'local_auth_enabled',
        userId: null // System-wide setting
      }
    });

    return Response.json({
      local_auth_enabled: localAuthSetting?.value === 'true' || true // Default to true if not set
    });
  } catch (error) {
    console.error('Error checking local auth status:', error);
    return Response.json({
      local_auth_enabled: true // Default to true on error
    });
  }
}