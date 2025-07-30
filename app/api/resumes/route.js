// app/api/resumes/route.js - Improved version with better storage cleanup
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { appPrisma } from "../../lib/prisma";
import { uploadToMinio, deleteFromMinio } from "../../lib/minio-storage";
import { getSystemSetting } from "../../lib/settings";

//const prisma = new prismaClient();

// Helper function to truncate strings safely
function truncateString(str, maxLength) {
  if (!str) return str;
  return str.length > maxLength ? str.substring(0, maxLength) : str;
}

// Helper function to get file extension safely
function getFileExtension(filename) {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop() : "";
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resumes = await appPrisma.user_resumes.findMany({
      where: { user_id: session.user.id },
      orderBy: { uploaded_at: "desc" },
    });

    return NextResponse.json(resumes);
  } catch (error) {
    console.error("Error fetching resumes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // GET THE MAX SIZE AND ALLOWED TYPES FROM SETTINGS
    const [maxSizeMB, allowedTypes] = await Promise.all([
      getSystemSetting("max_resume_size_mb", 5),
      getSystemSetting("allowed_resume_types", ["pdf", "doc", "docx"]),
    ]);

    // Validate file type using settings
    const fileExtension = file.name.split(".").pop().toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      return NextResponse.json(
        {
          error: `File type not allowed. Please upload: ${allowedTypes
            .join(", ")
            .toUpperCase()}`,
        },
        { status: 400 }
      );
    }

    // Validate file size using settings
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        {
          error: `File size exceeds the maximum allowed size of ${maxSizeMB}MB. Your file is ${(
            file.size /
            (1024 * 1024)
          ).toFixed(2)}MB.`,
        },
        { status: 413 }
      );
    }

    // Check if user already has a resume
    const existingResume = await appPrisma.user_resumes.findFirst({
      where: { user_id: session.user.id },
    });

    // Generate unique filename with length limits
    const timestamp = Date.now();
    const extension = getFileExtension(file.name);
    const originalName = file.name.replace(/\.[^/.]+$/, "");
    const safeOriginalName = originalName.substring(0, 50);
    const fileName = `${timestamp}-${safeOriginalName}.${extension}`;
    const filePath = `${session.user.id}/${fileName}`;

    // Validate that our generated path isn't too long
    if (filePath.length > 500) {
      return NextResponse.json(
        { error: "File path too long. Please use a shorter filename." },
        { status: 400 }
      );
    }

    // Upload new file to  Storage FIRST
    ("Uploading new file to storage...");
    const { data: uploadData, error: uploadError } = await uploadToMinio(
      file,
      filePath
    );

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    ("File uploaded successfully to storage");

    // Create or update resume record with safe values
    const resumeData = {
      user_id: session.user.id,
      file_name: truncateString(file.name, 255),
      file_size: file.size,
      file_type: truncateString(file.type, 50),
      storage_path: truncateString(filePath, 500),
      uploadedAt: new Date(),
      is_default: true,
    };

    let resume;
    let oldStoragePath = null;

    try {
      if (existingResume) {
        // Store old path for cleanup
        oldStoragePath = existingResume.storage_path;

        // Update existing resume in database
        ("Updating existing resume record...");
        resume = await appPrisma.user_resumes.update({
          where: { id: existingResume.id },
          data: resumeData,
        });
      } else {
        // Create new resume
        ("Creating new resume record...");
        resume = await appPrisma.user_resumes.create({
          data: resumeData,
        });
      }

      // If we had an old resume, delete it from storage AFTER successful database update
      if (oldStoragePath) {
        ("Deleting old file from storage:", oldStoragePath);
        const { error: deleteError } = await deleteFromMinio(oldStoragePath);

        if (deleteError) {
          console.error(
            "Warning: Failed to delete old file from storage:",
            deleteError
          );
          // Don't fail the request if storage cleanup fails
          // The new file is already uploaded and database is updated
        } else {
          ("Old file deleted successfully from storage");
        }
      }

      return NextResponse.json(
        {
          resume,
          message: existingResume
            ? "Resume updated successfully"
            : "Resume uploaded successfully",
        },
        { status: existingResume ? 200 : 201 }
      );
    } catch (dbError) {
      // If database operation fails, clean up the newly uploaded file
      console.error("Database error, cleaning up uploaded file:", dbError);

      const { error: cleanupError } = await deleteFromMinio(filePath);
      if (cleanupError) {
        console.error("Failed to cleanup uploaded file:", cleanupError);
      }

      throw dbError; // Re-throw the original error
    }
  } catch (error) {
    console.error("Error uploading resume:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the user's resume
    const resume = await appPrisma.user_resumes.findFirst({
      where: { user_id: session.user.id },
    });

    if (!resume) {
      return NextResponse.json(
        { error: "No resume found to delete" },
        { status: 404 }
      );
    }

    const storagePath = resume.storage_path;

    // Delete from database first
    ("Deleting resume from database...");
    await appPrisma.user_resumes.delete({
      where: { id: resume.id },
    });

    ("Resume deleted from database successfully");

    // Then delete from  Storage
    ("Deleting file from storage:", storagePath);
    const { error: deleteError } = await deleteFromStorage(storagePath);

    if (deleteError) {
      console.error(
        "Warning: Failed to delete file from storage:",
        deleteError
      );
      // Don't fail the request if storage cleanup fails
      // The database record is already deleted
      return NextResponse.json({
        message: "Resume deleted successfully (storage cleanup failed)",
      });
    }

    ("File deleted successfully from storage");

    return NextResponse.json({ message: "Resume deleted successfully" });
  } catch (error) {
    console.error("Error deleting resume:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Additional cleanup function you can call manually if needed
export async function cleanupOrphanedFiles() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // This would require listing files in storage and comparing with database
    // Implementation depends on your specific cleanup needs
    ("Manual cleanup function - implement based on your needs");

    return NextResponse.json({ message: "Cleanup completed" });
  } catch (error) {
    console.error("Error during cleanup:", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
