// app/api/resumes/route.js - Improved version with better storage cleanup
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { appPrisma } from "../../lib/prisma";
import {
  uploadToSupabase,
  deleteFromSupabase,
} from "../../lib/supabase-storage";

const prisma = new PrismaClient();

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

    const resumes = await prisma.userResume.findMany({
      where: { userId: session.user.id },
      orderBy: { uploadedAt: "desc" },
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

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Invalid file type. Only PDF and Word documents are allowed.",
        },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size too large. Maximum 5MB allowed." },
        { status: 400 }
      );
    }

    // Check if user already has a resume
    const existingResume = await prisma.userResume.findFirst({
      where: { userId: session.user.id },
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

    // Upload new file to Supabase Storage FIRST
    console.log("Uploading new file to storage...");
    const { data: uploadData, error: uploadError } = await uploadToSupabase(
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

    console.log("File uploaded successfully to storage");

    // Create or update resume record with safe values
    const resumeData = {
      userId: session.user.id,
      fileName: truncateString(file.name, 255),
      fileSize: file.size,
      fileType: truncateString(file.type, 50),
      storagePath: truncateString(filePath, 500),
      uploadedAt: new Date(),
      isDefault: true,
    };

    let resume;
    let oldStoragePath = null;

    try {
      if (existingResume) {
        // Store old path for cleanup
        oldStoragePath = existingResume.storagePath;

        // Update existing resume in database
        console.log("Updating existing resume record...");
        resume = await prisma.userResume.update({
          where: { id: existingResume.id },
          data: resumeData,
        });
      } else {
        // Create new resume
        console.log("Creating new resume record...");
        resume = await prisma.userResume.create({
          data: resumeData,
        });
      }

      // If we had an old resume, delete it from storage AFTER successful database update
      if (oldStoragePath) {
        console.log("Deleting old file from storage:", oldStoragePath);
        const { error: deleteError } = await deleteFromSupabase(oldStoragePath);

        if (deleteError) {
          console.error(
            "Warning: Failed to delete old file from storage:",
            deleteError
          );
          // Don't fail the request if storage cleanup fails
          // The new file is already uploaded and database is updated
        } else {
          console.log("Old file deleted successfully from storage");
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

      const { error: cleanupError } = await deleteFromSupabase(filePath);
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
    const resume = await prisma.userResume.findFirst({
      where: { userId: session.user.id },
    });

    if (!resume) {
      return NextResponse.json(
        { error: "No resume found to delete" },
        { status: 404 }
      );
    }

    const storagePath = resume.storagePath;

    // Delete from database first
    console.log("Deleting resume from database...");
    await prisma.userResume.delete({
      where: { id: resume.id },
    });

    console.log("Resume deleted from database successfully");

    // Then delete from Supabase Storage
    console.log("Deleting file from storage:", storagePath);
    const { error: deleteError } = await deleteFromSupabase(storagePath);

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

    console.log("File deleted successfully from storage");

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
    console.log("Manual cleanup function - implement based on your needs");

    return NextResponse.json({ message: "Cleanup completed" });
  } catch (error) {
    console.error("Error during cleanup:", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
