// app/api/favicon/route.js - Public favicon endpoint
import { NextResponse } from "next/server";
import { appPrisma } from "../../lib/prisma";
import { fileStorage } from "../../lib/minio";

export async function GET() {
  try {
    // Get current favicon setting (no auth required for public access)
    const faviconSetting = await appPrisma.settings.findFirst({
      where: {
        key: "site_favicon_url",
        userId: null, // Global setting
      },
    });

    if (!faviconSetting || !faviconSetting.value) {
      return NextResponse.json({ faviconUrl: null }, { status: 404 });
    }

    // Generate download URL for the current favicon
    try {
      const downloadUrl = await fileStorage.getPresignedUrl(
        faviconSetting.value,
        86400
      ); // 24 hours

      return NextResponse.json({ faviconUrl: downloadUrl });
    } catch (error) {
      console.error("Error generating favicon download URL:", error);
      return NextResponse.json({ faviconUrl: null }, { status: 500 });
    }
  } catch (error) {
    console.error("Error fetching favicon:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
