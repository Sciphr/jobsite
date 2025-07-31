// app/api/admin/logo/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";
import {
  uploadToMinio,
  deleteFromMinio,
  getMinioDownloadUrl,
} from "../../../lib/minio-storage";

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
    const session = await getServerSession(authOptions);
    if (!session || session.user.privilegeLevel < 2) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Upload new logo to MinIO first
    console.log("Uploading new logo to storage...");
    const { data: uploadData, error: uploadError } = await uploadToMinio(
      file,
      filePath
    );

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload logo" },
        { status: 500 }
      );
    }

    console.log("Logo uploaded successfully to storage");

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
        console.log("Deleting old logo from storage:", oldStoragePath);
        const { error: deleteError } = await deleteFromMinio(oldStoragePath);

        if (deleteError) {
          console.error(
            "Warning: Failed to delete old logo from storage:",
            deleteError
          );
          // Don't fail the request if storage cleanup fails
        } else {
          console.log("Old logo deleted successfully from storage");
        }
      }

      // Generate download URL for the new logo
      const { data: urlData, error: urlError } = await getMinioDownloadUrl(
        filePath,
        86400
      );

      if (urlError) {
        console.error("Error generating download URL:", urlError);
        // Don't fail - the upload was successful
      }

      return NextResponse.json({
        message: "Logo uploaded successfully",
        logoUrl: urlData?.signedUrl || null,
        storagePath: filePath,
      });
    } catch (dbError) {
      // If database operation fails, clean up the newly uploaded file
      console.error("Database error, cleaning up uploaded logo:", dbError);

      const { error: cleanupError } = await deleteFromMinio(filePath);
      if (cleanupError) {
        console.error("Failed to cleanup uploaded logo:", cleanupError);
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
      console.log("Deleting logo file from storage:", storagePath);
      const { error: deleteError } = await deleteFromMinio(storagePath);

      if (deleteError) {
        console.error(
          "Warning: Failed to delete logo file from storage:",
          deleteError
        );
        // Don't fail the request if storage cleanup fails
        return NextResponse.json({
          message: "Logo deleted successfully (storage cleanup failed)",
        });
      }

      console.log("Logo file deleted successfully from storage");
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
