// app/api/admin/favicon/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";
import { fileStorage } from "../../../lib/minio";

// Helper function to validate favicon types
function isValidFaviconType(fileType) {
  const allowedTypes = [
    "image/x-icon",
    "image/vnd.microsoft.icon",
    "image/png",
    "image/svg+xml",
  ];
  return allowedTypes.includes(fileType.toLowerCase());
}

// Helper function to get file extension
function getFileExtension(filename) {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.privilegeLevel < 2) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current favicon setting
    const faviconSetting = await appPrisma.settings.findFirst({
      where: {
        key: "site_favicon_url",
        userId: null, // Global setting
      },
    });

    if (!faviconSetting || !faviconSetting.value) {
      return NextResponse.json({ faviconUrl: null });
    }

    // Generate download URL for the current favicon
    try {
      const downloadUrl = await fileStorage.getPresignedUrl(
        faviconSetting.value,
        86400
      ); // 24 hours

      return NextResponse.json({
        faviconUrl: downloadUrl,
        storagePath: faviconSetting.value,
      });
    } catch (error) {
      console.error("Error generating favicon download URL:", error);
      return NextResponse.json({ faviconUrl: null });
    }
  } catch (error) {
    console.error("Error fetching favicon:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.privilegeLevel < 2) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!isValidFaviconType(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Please upload ICO, PNG, or SVG files only.",
        },
        { status: 400 }
      );
    }

    // Validate file size (max 1MB for favicons)
    const maxSizeBytes = 1 * 1024 * 1024; // 1MB
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        {
          error: `File size too large. Maximum size is 1MB. Your file is ${(
            file.size /
            (1024 * 1024)
          ).toFixed(2)}MB.`,
        },
        { status: 413 }
      );
    }

    // Generate unique filename for favicon
    const timestamp = Date.now();
    const extension = getFileExtension(file.name);
    const fileName = `favicon-${timestamp}.${extension}`;
    const filePath = `settings/favicons/${fileName}`;

    // Check for existing favicon
    const existingFaviconSetting = await appPrisma.settings.findFirst({
      where: {
        key: "site_favicon_url",
        userId: null,
      },
    });

    // Upload new favicon to MinIO storage
    console.log("Uploading new favicon to MinIO storage...");
    
    try {
      // Convert file to buffer for MinIO
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      
      const uploadResult = await fileStorage.uploadFile(
        filePath,
        fileBuffer,
        file.type,
        {
          'User-ID': session.user.id,
          'User-Email': session.user.email,
          'Original-Name': file.name,
          'Upload-Date': new Date().toISOString(),
          'File-Type': 'favicon'
        }
      );
      
      console.log("✅ Favicon uploaded to MinIO:", uploadResult);
    } catch (uploadError) {
      console.error("❌ MinIO upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload favicon to storage" },
        { status: 500 }
      );
    }

    let oldStoragePath = null;

    try {
      if (existingFaviconSetting) {
        // Store old path for cleanup
        oldStoragePath = existingFaviconSetting.value;

        // Update existing favicon setting
        console.log("Updating existing favicon setting...");
        await appPrisma.settings.update({
          where: { id: existingFaviconSetting.id },
          data: {
            value: filePath,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new favicon setting
        console.log("Creating new favicon setting...");
        await appPrisma.settings.create({
          data: {
            key: "site_favicon_url",
            value: filePath,
            category: "branding",
            description: "Site favicon image path in storage",
            dataType: "string",
            privilegeLevel: 2,
          },
        });
      }

      // If we had an old favicon, delete it from storage AFTER successful database update
      if (oldStoragePath && oldStoragePath !== filePath) {
        console.log("Deleting old favicon from MinIO storage:", oldStoragePath);
        try {
          await fileStorage.deleteFile(oldStoragePath);
          console.log("✅ Old favicon deleted from MinIO");
        } catch (deleteError) {
          console.error(
            "⚠️ Warning: Failed to delete old favicon from MinIO:",
            deleteError
          );
          // Don't fail the request if storage cleanup fails
        }
      }

      // Generate download URL for the new favicon
      let faviconUrl = null;
      try {
        faviconUrl = await fileStorage.getPresignedUrl(filePath, 86400);
      } catch (urlError) {
        console.error("Error generating download URL:", urlError);
        // Don't fail - the upload was successful
      }

      return NextResponse.json({
        message: "Favicon uploaded successfully",
        faviconUrl: faviconUrl,
        storagePath: filePath,
      });
    } catch (dbError) {
      // If database operation fails, clean up the newly uploaded file
      console.error("Database error, cleaning up uploaded favicon:", dbError);

      try {
        await fileStorage.deleteFile(filePath);
        console.log("✅ Cleanup: Uploaded favicon deleted from MinIO");
      } catch (cleanupError) {
        console.error("❌ Failed to cleanup uploaded favicon:", cleanupError);
      }

      throw dbError; // Re-throw the original error
    }
  } catch (error) {
    console.error("Error uploading favicon:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.privilegeLevel < 2) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the current favicon setting
    const faviconSetting = await appPrisma.settings.findFirst({
      where: {
        key: "site_favicon_url",
        userId: null,
      },
    });

    if (!faviconSetting) {
      return NextResponse.json(
        { error: "No favicon found to delete" },
        { status: 404 }
      );
    }

    const storagePath = faviconSetting.value;

    // Delete from database first
    console.log("Deleting favicon setting from database...");
    await appPrisma.settings.delete({
      where: { id: faviconSetting.id },
    });

    console.log("Favicon setting deleted from database successfully");

    // Then delete from MinIO storage
    if (storagePath) {
      console.log("Deleting favicon file from MinIO storage:", storagePath);
      try {
        await fileStorage.deleteFile(storagePath);
        console.log("✅ Favicon file deleted from MinIO");
      } catch (deleteError) {
        console.error(
          "⚠️ Warning: Failed to delete favicon file from MinIO:",
          deleteError
        );
        // Don't fail the request if storage cleanup fails
        return NextResponse.json({
          message: "Favicon deleted successfully (storage cleanup failed)",
        });
      }
    }

    return NextResponse.json({ message: "Favicon deleted successfully" });
  } catch (error) {
    console.error("Error deleting favicon:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
