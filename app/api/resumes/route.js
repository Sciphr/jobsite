// app/api/resumes/route.js - Improved version with better storage cleanup
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { appPrisma } from "../../lib/prisma";
import { fileStorage } from "../../lib/minio";
import { getSystemSetting } from "../../lib/settings";
import { logAuditEvent } from "../../../lib/auditMiddleware";
import { extractRequestContext } from "../../lib/auditLog";

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

export async function GET(request) {
  const requestContext = extractRequestContext(request);
  
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      // Log unauthorized resume access attempt
      await logAuditEvent({
        eventType: "ERROR",
        category: "SECURITY",
        action: "Unauthorized resume access attempt",
        description: "Resume list access attempted without valid session",
        actorType: "user",
        actorName: "unauthenticated",
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        severity: "warning",
        status: "failure",
        tags: ["resumes", "access", "unauthorized", "security"]
      }, request).catch(console.error);

      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resumes = await appPrisma.user_resumes.findMany({
      where: { user_id: session.user.id },
      orderBy: { uploaded_at: "desc" },
    });

    // Convert snake_case database fields to camelCase for frontend
    const formattedResumes = resumes.map(resume => ({
      id: resume.id,
      fileName: resume.file_name,
      fileSize: resume.file_size,
      fileType: resume.file_type,
      storagePath: resume.storage_path,
      uploadedAt: resume.uploaded_at,
      isDefault: resume.is_default,
      userId: resume.user_id
    }));

    // Log successful resume list access
    await logAuditEvent({
      eventType: "VIEW",
      category: "FILE",
      action: "Resume list accessed",
      description: `User ${session.user.email} accessed their resume list (${resumes.length} resumes)`,
      entityType: "user_resumes",
      actorId: session.user.id,
      actorType: "user",
      actorName: session.user.name || session.user.email,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      relatedUserId: session.user.id,
      severity: "info",
      status: "success",
      tags: ["resumes", "access", "list", "files"],
      metadata: {
        resumeCount: resumes.length,
        accessedBy: session.user.email
      }
    }, request).catch(console.error);

    return NextResponse.json(formattedResumes);
  } catch (error) {
    console.error("Error fetching resumes:", error);
    
    // Log server error during resume list access
    await logAuditEvent({
      eventType: "ERROR",
      category: "SYSTEM",
      action: "Resume list access failed - server error",
      description: `Server error while accessing resume list for user: ${session?.user?.email || 'unknown'}`,
      entityType: "user_resumes",
      actorId: session?.user?.id,
      actorType: "user",
      actorName: session?.user?.name || session?.user?.email,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      relatedUserId: session?.user?.id,
      severity: "error",
      status: "failure",
      tags: ["resumes", "access", "server_error", "system"],
      metadata: {
        error: error.message,
        stack: error.stack
      }
    }, request).catch(console.error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const requestContext = extractRequestContext(request);
  
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      // Log unauthorized resume upload attempt
      await logAuditEvent({
        eventType: "ERROR",
        category: "SECURITY",
        action: "Unauthorized resume upload attempt",
        description: "Resume upload attempted without valid session",
        actorType: "user",
        actorName: "unauthenticated",
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        severity: "warning",
        status: "failure",
        tags: ["resumes", "upload", "unauthorized", "security"]
      }, request).catch(console.error);

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

    // Upload new file to MinIO FIRST
    console.log("Uploading new file to MinIO storage...");
    
    // Convert file to buffer for MinIO
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    try {
      const uploadResult = await fileStorage.uploadFile(
        filePath,
        fileBuffer,
        file.type,
        {
          'User-ID': session.user.id,
          'User-Email': session.user.email,
          'Original-Name': file.name,
          'Upload-Date': new Date().toISOString()
        }
      );
      
      console.log("✅ File uploaded to MinIO:", uploadResult);
      
    } catch (uploadError) {
      console.error("❌ MinIO upload failed:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file to MinIO storage" },
        { status: 500 }
      );
    }

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
        console.log("Updating existing resume record...");
        resume = await appPrisma.user_resumes.update({
          where: { id: existingResume.id },
          data: resumeData,
        });
      } else {
        // Create new resume
        console.log("Creating new resume record...");
        resume = await appPrisma.user_resumes.create({
          data: resumeData,
        });
      }

      // If we had an old resume, delete it from storage AFTER successful database update
      if (oldStoragePath) {
        console.log("Deleting old file from storage:", oldStoragePath);
        try {
          await fileStorage.deleteFile(oldStoragePath);
          console.log("✅ Old file deleted from MinIO");
        } catch (deleteError) {
          console.error(
            "⚠️ Warning: Failed to delete old file from MinIO:",
            deleteError
          );
          // Don't fail the request if storage cleanup fails
          // The new file is already uploaded and database is updated
        }
      }

      // Log successful resume upload/update
      await logAuditEvent({
        eventType: existingResume ? "UPDATE" : "UPLOAD",
        category: "FILE",
        action: existingResume ? "Resume updated successfully" : "Resume uploaded successfully",
        description: `User ${session.user.email} ${existingResume ? 'updated' : 'uploaded'} resume: ${file.name}`,
        entityType: "user_resume",
        entityId: resume.id,
        entityName: file.name,
        actorId: session.user.id,
        actorType: "user",
        actorName: session.user.name || session.user.email,
        oldValues: existingResume ? {
          fileName: existingResume.file_name,
          fileSize: existingResume.file_size,
          storagePath: existingResume.storage_path
        } : null,
        newValues: {
          fileName: file.name,
          fileSize: file.size,
          storagePath: filePath
        },
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        relatedUserId: session.user.id,
        severity: "info",
        status: "success",
        tags: ["resumes", existingResume ? "update" : "upload", "success", "files"],
        metadata: {
          resumeId: resume.id,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          storagePath: filePath,
          isUpdate: !!existingResume,
          uploadedBy: session.user.email
        }
      }, request).catch(console.error);

      // Format the resume response to match frontend expectations
      const formattedResume = {
        id: resume.id,
        fileName: resume.file_name,
        fileSize: resume.file_size,
        fileType: resume.file_type,
        storagePath: resume.storage_path,
        uploadedAt: resume.uploadedAt || resume.uploaded_at,
        isDefault: resume.is_default,
        userId: resume.user_id
      };

      return NextResponse.json(
        {
          resume: formattedResume,
          message: existingResume
            ? "Resume updated successfully"
            : "Resume uploaded successfully",
        },
        { status: existingResume ? 200 : 201 }
      );
    } catch (dbError) {
      // If database operation fails, clean up the newly uploaded file
      console.error("Database error, cleaning up uploaded file:", dbError);

      try {
        await fileStorage.deleteFile(filePath);
        console.log("✅ Cleanup: Uploaded file deleted from MinIO");
      } catch (cleanupError) {
        console.error("❌ Failed to cleanup uploaded file:", cleanupError);
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

export async function DELETE(request) {
  const requestContext = extractRequestContext(request);
  
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      // Log unauthorized resume deletion attempt
      await logAuditEvent({
        eventType: "ERROR",
        category: "SECURITY",
        action: "Unauthorized resume deletion attempt",
        description: "Resume deletion attempted without valid session",
        actorType: "user",
        actorName: "unauthenticated",
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        severity: "warning",
        status: "failure",
        tags: ["resumes", "delete", "unauthorized", "security"]
      }, request).catch(console.error);

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
    console.log("Deleting resume from database...");
    await appPrisma.user_resumes.delete({
      where: { id: resume.id },
    });

    console.log("Resume deleted from database successfully");

    // Then delete from Supabase Storage
    console.log("Deleting file from storage:", storagePath);
    try {
      await fileStorage.deleteFile(storagePath);
      console.log("✅ File deleted from MinIO");
    } catch (deleteError) {
      console.error(
        "⚠️ Warning: Failed to delete file from MinIO:",
        deleteError
      );
      // Don't fail the request if storage cleanup fails
      // The database record is already deleted
      return NextResponse.json({
        message: "Resume deleted successfully (storage cleanup failed)",
      });
    }

    console.log("File deleted successfully from storage");

    // Log successful resume deletion
    await logAuditEvent({
      eventType: "DELETE",
      category: "FILE",
      action: "Resume deleted successfully",
      description: `User ${session.user.email} deleted their resume: ${resume.file_name}`,
      entityType: "user_resume",
      entityId: resume.id,
      entityName: resume.file_name,
      actorId: session.user.id,
      actorType: "user",
      actorName: session.user.name || session.user.email,
      oldValues: {
        fileName: resume.file_name,
        fileSize: resume.file_size,
        storagePath: resume.storage_path
      },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      relatedUserId: session.user.id,
      severity: "info",
      status: "success",
      tags: ["resumes", "delete", "success", "files"],
      metadata: {
        resumeId: resume.id,
        fileName: resume.file_name,
        fileSize: resume.file_size,
        storagePath: resume.storage_path,
        deletedBy: session.user.email
      }
    }, request).catch(console.error);

    return NextResponse.json({ message: "Resume deleted successfully" });
  } catch (error) {
    console.error("Error deleting resume:", error);
    
    // Log server error during resume deletion
    await logAuditEvent({
      eventType: "ERROR",
      category: "SYSTEM",
      action: "Resume deletion failed - server error",
      description: `Server error during resume deletion for user: ${session?.user?.email || 'unknown'}`,
      entityType: "user_resume",
      actorId: session?.user?.id,
      actorType: "user",
      actorName: session?.user?.name || session?.user?.email,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      relatedUserId: session?.user?.id,
      severity: "error",
      status: "failure",
      tags: ["resumes", "delete", "server_error", "system"],
      metadata: {
        error: error.message,
        stack: error.stack,
        deletedBy: session?.user?.email
      }
    }, request).catch(console.error);

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
