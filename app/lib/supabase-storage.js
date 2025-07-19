// lib/supabase-storage.js - Updated to use MinIO instead of Supabase
// This file keeps the same name and function signatures for easy migration
import { Client } from "minio";

// MinIO client configuration
const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === "true" || false,
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || "resumes";

// Ensure bucket exists
async function ensureBucketExists() {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME);
      console.log(`✅ Created bucket: ${BUCKET_NAME}`);
    }
  } catch (error) {
    console.error("❌ Error ensuring bucket exists:", error);
    throw error;
  }
}

// Replace uploadToSupabase with MinIO implementation
export async function uploadToSupabase(file, filePath) {
  try {
    console.log("📤 Uploading to MinIO:", filePath);

    await ensureBucketExists();

    // Convert file to buffer - handle different file types
    let fileBuffer;
    let fileSize;
    let contentType;

    if (file instanceof File) {
      // Browser File object
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      fileSize = file.size;
      contentType = file.type;
    } else if (file.stream && typeof file.stream === "function") {
      // Next.js FormData file with stream
      const bytes = await file.bytes();
      fileBuffer = Buffer.from(bytes);
      fileSize = file.size;
      contentType = file.type;
    } else if (file.arrayBuffer && typeof file.arrayBuffer === "function") {
      // File with arrayBuffer method
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      fileSize = file.size || fileBuffer.length;
      contentType = file.type;
    } else if (Buffer.isBuffer(file)) {
      // Already a buffer
      fileBuffer = file;
      fileSize = file.length;
      contentType = "application/octet-stream";
    } else {
      throw new Error("Unsupported file type for upload");
    }

    // Upload to MinIO
    const result = await minioClient.putObject(
      BUCKET_NAME,
      filePath,
      fileBuffer,
      fileSize,
      {
        "Content-Type": contentType || "application/octet-stream",
      }
    );

    console.log("✅ MinIO upload success:", result);

    return {
      data: {
        path: filePath,
        etag: result.etag,
      },
      error: null,
    };
  } catch (error) {
    console.error("❌ MinIO upload error:", error);
    return { data: null, error };
  }
}

// Replace deleteFromSupabase with MinIO implementation
export async function deleteFromSupabase(filePath) {
  try {
    console.log("🗑️ Deleting from MinIO:", filePath);

    await minioClient.removeObject(BUCKET_NAME, filePath);

    console.log("✅ MinIO delete success:", filePath);
    return { data: { path: filePath }, error: null };
  } catch (error) {
    console.error("❌ MinIO delete error:", error);
    return { data: null, error };
  }
}

// Helper function to generate download URLs
export async function getMinioDownloadUrl(filePath, expiryInSeconds = 3600) {
  try {
    console.log("🔗 Generating MinIO download URL:", filePath);

    // Generate presigned URL (valid for 1 hour by default)
    const url = await minioClient.presignedGetObject(
      BUCKET_NAME,
      filePath,
      expiryInSeconds
    );

    console.log("✅ MinIO download URL generated");
    return {
      data: { signedUrl: url },
      error: null,
    };
  } catch (error) {
    console.error("❌ MinIO download URL error:", error);
    return { data: null, error };
  }
}

// Get user's single resume (updated to use Prisma instead of Supabase DB)
export async function getUserResume(userId) {
  try {
    const { appPrisma } = await import("./prisma");

    const resume = await appPrisma.userResume.findFirst({
      where: { userId: userId },
    });

    if (!resume) {
      return {
        success: true,
        resume: null,
      };
    }

    return {
      success: true,
      resume: resume,
    };
  } catch (error) {
    console.error("Get resume error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Upload or replace user's resume (updated for MinIO + Prisma)
export async function uploadResume(file, userId) {
  try {
    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Only PDF and Word documents are allowed");
    }

    // Validate file size (5MB limit to match API)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error("File size must be less than 5MB");
    }

    // Check if user already has a resume
    const existingResume = await getUserResume(userId);

    // If user has existing resume, delete it from storage
    if (existingResume.success && existingResume.resume) {
      const { error: deleteError } = await deleteFromSupabase(
        existingResume.resume.storagePath
      );

      if (deleteError) {
        console.error("Error deleting old resume from storage:", deleteError);
        // Continue with upload even if old file deletion fails
      }
    }

    // Generate unique file path
    const timestamp = Date.now();
    const fileExtension =
      file.type === "application/pdf"
        ? "pdf"
        : file.type === "application/msword"
          ? "doc"
          : "docx";
    const fileName = `${timestamp}-${file.name}`;
    const filePath = `${userId}/${fileName}`;

    // Upload to MinIO Storage
    const { data: uploadData, error: uploadError } = await uploadToSupabase(
      file,
      filePath
    );

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Import prisma to avoid circular dependency
    const { appPrisma } = await import("./prisma");

    // Create or update resume record in Prisma (not Supabase DB)
    const resumeData = {
      userId: userId,
      fileName: file.name,
      fileSize: file.size,
      fileType: fileExtension,
      storagePath: filePath,
      uploadedAt: new Date(),
      isDefault: true,
    };

    let dbData, dbError;

    if (existingResume.success && existingResume.resume) {
      // Update existing resume
      try {
        dbData = await appPrisma.userResume.update({
          where: { id: existingResume.resume.id },
          data: resumeData,
        });
      } catch (error) {
        dbError = error;
      }
    } else {
      // Create new resume
      try {
        dbData = await appPrisma.userResume.create({
          data: resumeData,
        });
      } catch (error) {
        dbError = error;
      }
    }

    if (dbError) {
      // If database operation fails, clean up uploaded file
      await deleteFromSupabase(filePath);
      throw new Error(`Database error: ${dbError.message}`);
    }

    return {
      success: true,
      resume: dbData,
      message:
        existingResume.success && existingResume.resume
          ? "Resume updated successfully"
          : "Resume uploaded successfully",
    };
  } catch (error) {
    console.error("Resume upload error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Delete user's resume (updated for MinIO + Prisma)
export async function deleteResume(userId) {
  try {
    const { appPrisma } = await import("./prisma");

    // Get resume data first from Prisma
    const resume = await appPrisma.userResume.findFirst({
      where: { userId: userId },
    });

    if (!resume) {
      throw new Error("No resume found to delete");
    }

    // Delete from MinIO storage
    const { error: storageError } = await deleteFromSupabase(
      resume.storagePath
    );

    if (storageError) {
      console.error("Storage deletion error:", storageError);
      // Continue with database deletion even if storage fails
    }

    // Delete from Prisma database
    await appPrisma.userResume.delete({
      where: { id: resume.id },
    });

    return {
      success: true,
      message: "Resume deleted successfully",
    };
  } catch (error) {
    console.error("Delete resume error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Get resume download URL (updated for MinIO + Prisma)
export async function getResumeDownloadUrl(userId) {
  try {
    const { appPrisma } = await import("./prisma");

    // Get resume data from Prisma
    const resume = await appPrisma.userResume.findFirst({
      where: { userId: userId },
    });

    if (!resume) {
      throw new Error("No resume found");
    }

    // Generate signed URL from MinIO (valid for 1 hour)
    const { data: urlData, error: urlError } = await getMinioDownloadUrl(
      resume.storagePath,
      3600
    );

    if (urlError) {
      throw new Error(`Failed to generate download URL: ${urlError.message}`);
    }

    return {
      success: true,
      url: urlData.signedUrl,
      fileName: resume.fileName,
    };
  } catch (error) {
    console.error("Get download URL error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Test MinIO connection
export async function testMinioConnection() {
  try {
    await ensureBucketExists();
    console.log("✅ MinIO connection successful");
    return { success: true };
  } catch (error) {
    console.error("❌ MinIO connection failed:", error);
    return { success: false, error: error.message };
  }
}

// Helper function to list files (useful for debugging)
export async function listMinioFiles(prefix = "") {
  try {
    const objectsStream = minioClient.listObjects(BUCKET_NAME, prefix, true);
    const objects = [];

    return new Promise((resolve, reject) => {
      objectsStream.on("data", (obj) => objects.push(obj));
      objectsStream.on("end", () => resolve({ data: objects, error: null }));
      objectsStream.on("error", (err) => reject({ data: null, error: err }));
    });
  } catch (error) {
    console.error("❌ MinIO list error:", error);
    return { data: null, error };
  }
}
