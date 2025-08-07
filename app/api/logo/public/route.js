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
    const { data, error } = await getMinioDownloadUrl(logoSetting.value, 86400); // 24 hours

    if (error) {
      console.error("Error generating logo download URL:", error);
      return NextResponse.json({ logoUrl: null });
    }

    return NextResponse.json({
      logoUrl: data.signedUrl,
      storagePath: logoSetting.value,
    });

  } catch (error) {
    console.error("Error fetching public logo:", error);
    return NextResponse.json({ logoUrl: null });
  }
}