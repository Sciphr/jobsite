// app/api/favicon/image/route.js - Proxy endpoint to serve favicon through the app domain
import { NextResponse } from "next/server";
import { appPrisma } from "../../../lib/prisma";
import { fileStorage } from "../../../lib/minio";

export async function GET() {
  try {
    // Get current favicon setting
    const faviconSetting = await appPrisma.settings.findFirst({
      where: {
        key: "site_favicon_url",
        userId: null, // Global setting
      },
    });

    if (!faviconSetting || !faviconSetting.value) {
      return new NextResponse(null, { status: 404 });
    }

    // Generate download URL for the current favicon
    let downloadUrl;
    try {
      downloadUrl = await fileStorage.getPresignedUrl(
        faviconSetting.value,
        86400
      );
    } catch (error) {
      console.error("Error generating favicon download URL:", error);
      return new NextResponse(null, { status: 500 });
    }

    // Fetch the actual image from MinIO
    const imageResponse = await fetch(downloadUrl);

    if (!imageResponse.ok) {
      console.error("Error fetching favicon from MinIO:", imageResponse.status);
      return new NextResponse(null, { status: 500 });
    }

    const imageBuffer = await imageResponse.arrayBuffer();

    // Determine content type based on file extension
    const extension = faviconSetting.value.split(".").pop().toLowerCase();
    let contentType = "image/x-icon";

    if (extension === "png") {
      contentType = "image/png";
    } else if (extension === "svg") {
      contentType = "image/svg+xml";
    }

    // Return the image with appropriate headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error serving favicon:", error);
    return new NextResponse(null, { status: 500 });
  }
}
