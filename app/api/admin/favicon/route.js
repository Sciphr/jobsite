// app/api/admin/favicon/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";
import {
  uploadToSupabase,
  deleteFromSupabase,
  getMinioDownloadUrl,
} from "../../../lib/supabase-storage";

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
    const { data, error } = await getMinioDownloadUrl(
      faviconSetting.value,
      86400
    ); // 24 hours

    if (error) {
      console.error("Error generating favicon download URL:", error);
      return NextResponse.json({ faviconUrl: null });
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

    // Upload new favicon to MinIO first
    console.log("Uploading new favicon to storage...");
    const { data: uploadData, error: uploadError } = await uploadToSupabase(
      file,
      filePath
    );

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload favicon" },
        { status: 500 }
      );
    }

    console.log("Favicon uploaded successfully to storage");

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
        console.log("Deleting old favicon from storage:", oldStoragePath);
        const { error: deleteError } = await deleteFromSupabase(oldStoragePath);

        if (deleteError) {
          console.error(
            "Warning: Failed to delete old favicon from storage:",
            deleteError
          );
          // Don't fail the request if storage cleanup fails
        } else {
          console.log("Old favicon deleted successfully from storage");
        }
      }

      // Generate download URL for the new favicon
      const { data: urlData, error: urlError } = await getMinioDownloadUrl(
        filePath,
        86400
      );

      if (urlError) {
        console.error("Error generating download URL:", urlError);
        // Don't fail - the upload was successful
      }

      return NextResponse.json({
        message: "Favicon uploaded successfully",
        faviconUrl: urlData?.signedUrl || null,
        storagePath: filePath,
      });
    } catch (dbError) {
      // If database operation fails, clean up the newly uploaded file
      console.error("Database error, cleaning up uploaded favicon:", dbError);

      const { error: cleanupError } = await deleteFromSupabase(filePath);
      if (cleanupError) {
        console.error("Failed to cleanup uploaded favicon:", cleanupError);
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
      console.log("Deleting favicon file from storage:", storagePath);
      const { error: deleteError } = await deleteFromSupabase(storagePath);

      if (deleteError) {
        console.error(
          "Warning: Failed to delete favicon file from storage:",
          deleteError
        );
        // Don't fail the request if storage cleanup fails
        return NextResponse.json({
          message: "Favicon deleted successfully (storage cleanup failed)",
        });
      }

      console.log("Favicon file deleted successfully from storage");
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
