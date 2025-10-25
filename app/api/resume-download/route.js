import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { fileStorage } from "../../lib/minio";

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

    // Directly stream the file through the application instead of using presigned URLs
    try {
      const fileStream = await fileStorage.downloadFile(storagePath);
      console.log("✅ Got file stream from MinIO");
      
      // Get file stats for headers
      const stats = await fileStorage.getFileStats(storagePath);
      
      // Extract filename from path
      const fileName = storagePath.split('/').pop();
      
      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of fileStream) {
        chunks.push(chunk);
      }
      const fileBuffer = Buffer.concat(chunks);
      
      // Return the file directly - use 'inline' to view in browser instead of download
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': stats.metaData['content-type'] || 'application/octet-stream',
          'Content-Disposition': `inline; filename="${fileName}"`,
          'Content-Length': fileBuffer.length.toString(),
        },
      });
    } catch (error) {
      console.error("Error downloading file from MinIO:", error);
      return NextResponse.json(
        {
          error: "File not found in storage",
          details: error.message,
          path: storagePath,
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error in resume download:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
