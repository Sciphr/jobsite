// lib/supabase-storage.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Simple upload function for API routes
export async function uploadToSupabase(file, filePath) {
  try {
    const { data, error } = await supabase.storage
      .from("resumes")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true, // Allow overwriting existing files
      });

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

// Simple delete function for API routes
export async function deleteFromSupabase(filePath) {
  try {
    const { data, error } = await supabase.storage
      .from("resumes")
      .remove([filePath]);

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

// Get user's single resume
export async function getUserResume(userId) {
  try {
    const { data, error } = await supabase
      .from("user_resumes")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      // If no resume found, return null instead of error
      if (error.code === "PGRST116") {
        return {
          success: true,
          resume: null,
        };
      }
      throw new Error(`Failed to fetch resume: ${error.message}`);
    }

    return {
      success: true,
      resume: data,
    };
  } catch (error) {
    console.error("Get resume error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Upload or replace user's resume
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
      const { error: deleteError } = await supabase.storage
        .from("resumes")
        .remove([existingResume.resume.storage_path]);

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

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Create or update resume record
    const resumeData = {
      user_id: userId,
      file_name: file.name,
      file_size: file.size,
      file_type: fileExtension,
      storage_path: filePath,
      uploaded_at: new Date().toISOString(),
    };

    let dbData, dbError;

    if (existingResume.success && existingResume.resume) {
      // Update existing resume
      const { data, error } = await supabase
        .from("user_resumes")
        .update(resumeData)
        .eq("id", existingResume.resume.id)
        .select()
        .single();

      dbData = data;
      dbError = error;
    } else {
      // Create new resume
      const { data, error } = await supabase
        .from("user_resumes")
        .insert(resumeData)
        .select()
        .single();

      dbData = data;
      dbError = error;
    }

    if (dbError) {
      // If database operation fails, clean up uploaded file
      await supabase.storage.from("resumes").remove([filePath]);
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

// Delete user's resume
export async function deleteResume(userId) {
  try {
    // Get resume data first
    const { data: resume, error: fetchError } = await supabase
      .from("user_resumes")
      .select("storage_path, id")
      .eq("user_id", userId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        throw new Error("No resume found to delete");
      }
      throw new Error(`Resume not found: ${fetchError.message}`);
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("resumes")
      .remove([resume.storage_path]);

    if (storageError) {
      console.error("Storage deletion error:", storageError);
      // Continue with database deletion even if storage fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from("user_resumes")
      .delete()
      .eq("id", resume.id);

    if (dbError) {
      throw new Error(`Database deletion failed: ${dbError.message}`);
    }

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

// Get resume download URL
export async function getResumeDownloadUrl(userId) {
  try {
    // Get resume data
    const { data: resume, error: fetchError } = await supabase
      .from("user_resumes")
      .select("storage_path, file_name")
      .eq("user_id", userId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        throw new Error("No resume found");
      }
      throw new Error(`Resume not found: ${fetchError.message}`);
    }

    // Generate signed URL (valid for 1 hour)
    const { data: urlData, error: urlError } = await supabase.storage
      .from("resumes")
      .createSignedUrl(resume.storage_path, 3600);

    if (urlError) {
      throw new Error(`Failed to generate download URL: ${urlError.message}`);
    }

    return {
      success: true,
      url: urlData.signedUrl,
      fileName: resume.file_name,
    };
  } catch (error) {
    console.error("Get download URL error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
