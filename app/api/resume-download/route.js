// Replace the entire file with:
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { getMinioDownloadUrl } from "../../lib/minio-storage";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storagePath = searchParams.get("path");

    if (!storagePath) {
      return NextResponse.json(
        { error: "Storage path is required" },
        { status: 400 }
      );
    }

    console.log("Attempting to download file from path:", storagePath);

    // Generate signed URL for file download (valid for 1 hour)
    const { data, error } = await getMinioDownloadUrl(storagePath, 3600);

    if (error) {
      console.error("Error generating download URL:", error);
      return NextResponse.json(
        {
          error: "File not found in storage",
          details: error.message,
          path: storagePath,
        },
        { status: 404 }
      );
    }

    console.log("Download URL generated successfully");

    return NextResponse.json({
      downloadUrl: data.signedUrl,
      message: "Download URL generated successfully",
    });
  } catch (error) {
    console.error("Error in resume download:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
