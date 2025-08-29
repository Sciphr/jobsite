// app/api/admin/logo/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";
import { protectRoute } from "../../../lib/middleware/apiProtection";
import { fileStorage } from "../../../lib/minio";

// Helper function to validate image types
function isValidImageType(fileType) {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
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
    // Use protectRoute for consistent authentication
    const authResult = await protectRoute("settings", "view", {
      minPrivilegeLevel: 2,
    });
    if (authResult.error) return authResult.error;

    // Get current logo setting
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
      const downloadUrl = await fileStorage.getPresignedUrl(
        logoSetting.value,
        86400
      ); // 24 hours

      return NextResponse.json({
        logoUrl: downloadUrl,
        storagePath: logoSetting.value,
      });
    } catch (error) {
      console.error("Error generating logo download URL:", error);
      return NextResponse.json({ logoUrl: null });
    }
  } catch (error) {
    console.error("Error fetching logo:", error);
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
    if (!isValidImageType(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Please upload JPG, PNG, WebP, or SVG images only.",
        },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB for logos)
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        {
          error: `File size too large. Maximum size is 5MB. Your file is ${(
            file.size /
            (1024 * 1024)
          ).toFixed(2)}MB.`,
        },
        { status: 413 }
      );
    }

    // Generate unique filename for logo
    const timestamp = Date.now();
    const extension = getFileExtension(file.name);
    const fileName = `logo-${timestamp}.${extension}`;
    const filePath = `settings/logos/${fileName}`;

    // Check for existing logo
    const existingLogoSetting = await appPrisma.settings.findFirst({
      where: {
        key: "site_logo_url",
        userId: null,
      },
    });

    // Upload new logo to MinIO storage
    console.log("Uploading new logo to MinIO storage...");
    
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
          'File-Type': 'logo'
        }
      );
      
      console.log("✅ Logo uploaded to MinIO:", uploadResult);
    } catch (uploadError) {
      console.error("❌ MinIO upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload logo to storage" },
        { status: 500 }
      );
    }

    let oldStoragePath = null;

    try {
      if (existingLogoSetting) {
        // Store old path for cleanup
        oldStoragePath = existingLogoSetting.value;

        // Update existing logo setting
        console.log("Updating existing logo setting...");
        await appPrisma.settings.update({
          where: { id: existingLogoSetting.id },
          data: {
            value: filePath,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new logo setting
        console.log("Creating new logo setting...");
        await appPrisma.settings.create({
          data: {
            key: "site_logo_url",
            value: filePath,
            category: "branding",
            description: "Site logo image path in storage",
            dataType: "string",
            privilegeLevel: 2,
          },
        });
      }

      // If we had an old logo, delete it from storage AFTER successful database update
      if (oldStoragePath && oldStoragePath !== filePath) {
        console.log("Deleting old logo from MinIO storage:", oldStoragePath);
        try {
          await fileStorage.deleteFile(oldStoragePath);
          console.log("✅ Old logo deleted from MinIO");
        } catch (deleteError) {
          console.error(
            "⚠️ Warning: Failed to delete old logo from MinIO:",
            deleteError
          );
          // Don't fail the request if storage cleanup fails
        }
      }

      // Generate download URL for the new logo
      let logoUrl = null;
      try {
        logoUrl = await fileStorage.getPresignedUrl(filePath, 86400);
      } catch (urlError) {
        console.error("Error generating download URL:", urlError);
        // Don't fail - the upload was successful
      }

      return NextResponse.json({
        message: "Logo uploaded successfully",
        logoUrl: logoUrl,
        storagePath: filePath,
      });
    } catch (dbError) {
      // If database operation fails, clean up the newly uploaded file
      console.error("Database error, cleaning up uploaded logo:", dbError);

      try {
        await fileStorage.deleteFile(filePath);
        console.log("✅ Cleanup: Uploaded logo deleted from MinIO");
      } catch (cleanupError) {
        console.error("❌ Failed to cleanup uploaded logo:", cleanupError);
      }

      throw dbError; // Re-throw the original error
    }
  } catch (error) {
    console.error("Error uploading logo:", error);
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

    // Find the current logo setting
    const logoSetting = await appPrisma.settings.findFirst({
      where: {
        key: "site_logo_url",
        userId: null,
      },
    });

    if (!logoSetting) {
      return NextResponse.json(
        { error: "No logo found to delete" },
        { status: 404 }
      );
    }

    const storagePath = logoSetting.value;

    // Delete from database first
    console.log("Deleting logo setting from database...");
    await appPrisma.settings.delete({
      where: { id: logoSetting.id },
    });

    console.log("Logo setting deleted from database successfully");

    // Then delete from MinIO storage
    if (storagePath) {
      console.log("Deleting logo file from MinIO storage:", storagePath);
      try {
        await fileStorage.deleteFile(storagePath);
        console.log("✅ Logo file deleted from MinIO");
      } catch (deleteError) {
        console.error(
          "⚠️ Warning: Failed to delete logo file from MinIO:",
          deleteError
        );
        // Don't fail the request if storage cleanup fails
        return NextResponse.json({
          message: "Logo deleted successfully (storage cleanup failed)",
        });
      }
    }

    return NextResponse.json({ message: "Logo deleted successfully" });
  } catch (error) {
    console.error("Error deleting logo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
