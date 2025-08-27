// lib/supabase-storage.js - Supabase Storage implementation
import { createClient } from '@supabase/supabase-js';

// Supabase client configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const BUCKET_NAME = "resumes";

// Ensure bucket exists
async function ensureBucketExists() {
  try {
    const { data, error } = await supabase.storage.getBucket(BUCKET_NAME);
    
    if (error && error.message === 'Bucket not found') {
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: false,
        allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (createError) {
        throw createError;
      }
      console.log(`✅ Created bucket: ${BUCKET_NAME}`);
    } else if (error) {
      throw error;
    }
  } catch (error) {
    console.error("❌ Error ensuring bucket exists:", error);
    throw error;
  }
}

// Upload file to Supabase Storage
export async function uploadToSupabase(file, filePath) {
  try {
    console.log("📤 Uploading to Supabase Storage:", filePath);

    await ensureBucketExists();

    // Convert file to buffer - handle different file types
    let fileBuffer;
    let contentType;

    if (file instanceof File) {
      // Browser File object
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      contentType = file.type;
    } else if (file.stream && typeof file.stream === "function") {
      // Next.js FormData file with stream
      const bytes = await file.bytes();
      fileBuffer = Buffer.from(bytes);
      contentType = file.type;
    } else if (file.arrayBuffer && typeof file.arrayBuffer === "function") {
      // File with arrayBuffer method
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      contentType = file.type;
    } else if (Buffer.isBuffer(file)) {
      // Already a buffer
      fileBuffer = file;
      contentType = "application/octet-stream";
    } else {
      throw new Error("Unsupported file type for upload");
    }

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileBuffer, {
        contentType: contentType || "application/octet-stream",
        upsert: true
      });

    if (error) {
      throw error;
    }

    console.log("✅ Supabase Storage upload success:", data);

    return {
      data: {
        path: data.path,
        id: data.id,
        fullPath: data.fullPath
      },
      error: null,
    };
  } catch (error) {
    console.error("❌ Supabase Storage upload error:", error);
    return { data: null, error };
  }
}

// Delete file from Supabase Storage
export async function deleteFromSupabase(filePath) {
  try {
    console.log("🗑️ Deleting from Supabase Storage:", filePath);

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      throw error;
    }

    console.log("✅ Supabase Storage delete success:", filePath);
    return { data: { path: filePath }, error: null };
  } catch (error) {
    console.error("❌ Supabase Storage delete error:", error);
    return { data: null, error };
  }
}

// Helper function to generate download URLs
export async function getSupabaseDownloadUrl(filePath, expiryInSeconds = 3600) {
  try {
    console.log("🔗 Generating Supabase Storage download URL:", filePath);

    // Generate signed URL (valid for 1 hour by default)
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, expiryInSeconds);

    if (error) {
      throw error;
    }

    console.log("✅ Supabase Storage download URL generated");
    return {
      data: { signedUrl: data.signedUrl },
      error: null,
    };
  } catch (error) {
    console.error("❌ Supabase Storage download URL error:", error);
    return { data: null, error };
  }
}

// Keep MinIO function name for backward compatibility
export async function getMinioDownloadUrl(filePath, expiryInSeconds = 3600) {
  return getSupabaseDownloadUrl(filePath, expiryInSeconds);
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

    // Generate signed URL from Supabase Storage (valid for 1 hour)
    const { data: urlData, error: urlError } = await getSupabaseDownloadUrl(
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

// Test Supabase Storage connection
export async function testSupabaseConnection() {
  try {
    await ensureBucketExists();
    console.log("✅ Supabase Storage connection successful");
    return { success: true };
  } catch (error) {
    console.error("❌ Supabase Storage connection failed:", error);
    return { success: false, error: error.message };
  }
}

// Keep MinIO function name for backward compatibility
export async function testMinioConnection() {
  return testSupabaseConnection();
}

// Helper function to list files (useful for debugging)
export async function listSupabaseFiles(prefix = "") {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(prefix, {
        limit: 100,
        offset: 0
      });

    if (error) {
      throw error;
    }

    return { data: data, error: null };
  } catch (error) {
    console.error("❌ Supabase Storage list error:", error);
    return { data: null, error };
  }
}

// Keep MinIO function name for backward compatibility
export async function listMinioFiles(prefix = "") {
  return listSupabaseFiles(prefix);
}
