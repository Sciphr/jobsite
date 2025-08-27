// app/api/favicon/route.js - Public favicon endpoint
import { NextResponse } from "next/server";
import { appPrisma } from "../../lib/prisma";
import { getMinioDownloadUrl } from "../../lib/supabase-storage";

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
    const { data, error } = await getMinioDownloadUrl(
      faviconSetting.value,
      86400
    ); // 24 hours

    if (error) {
      console.error("Error generating favicon download URL:", error);
      return NextResponse.json({ faviconUrl: null }, { status: 500 });
    }

    return NextResponse.json({
      faviconUrl: data.signedUrl,
      storagePath: faviconSetting.value,
    });
  } catch (error) {
    console.error("Error fetching favicon:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
