// app/api/logo/public/route.js
import { NextResponse } from "next/server";
import { appPrisma } from "../../../lib/prisma";
import { getMinioDownloadUrl } from "../../../lib/minio-storage";

export async function GET() {
  try {
    // Get current logo setting - no authentication required since it's public branding
    const logoSetting = await appPrisma.settings.findFirst({
      where: {
        key: "site_logo_url",
        userId: null, // Global setting
      },
    });

    if (!logoSetting || !logoSetting.value) {
      return NextResponse.json({ logoUrl: null });
    }

    // Generate download URL for the current logo
    try {
      const logoDownloadUrl = await getMinioDownloadUrl(logoSetting.value);
      return NextResponse.json({ 
        logoUrl: logoDownloadUrl,
        logoKey: logoSetting.value 
      });
    } catch (storageError) {
      console.error("Error generating logo download URL:", storageError);
      return NextResponse.json({ logoUrl: null });
    }

  } catch (error) {
    console.error("Error fetching public logo:", error);
    return NextResponse.json({ logoUrl: null });
  }
}