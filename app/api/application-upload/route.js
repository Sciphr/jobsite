// app/api/application-upload/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { uploadToSupabase } from "../../lib/supabase-storage";
import { getSystemSetting } from "../../lib/settings";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const jobId = formData.get("jobId");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 });
    }

    // Get allowed types from settings
    const allowedTypes = await getSystemSetting("allowed_resume_types", [
      "pdf",
      "doc",
      "docx",
    ]);
    const maxSizeMB = await getSystemSetting("max_resume_size_mb", 5);

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
          error: `File size too large. Maximum ${maxSizeMB}MB allowed.`,
        },
        { status: 400 }
      );
    }

    // Get session (optional - could be guest application)
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || "guest";

    // Generate unique filename for application
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split(".").pop();
    const fileName = `application-${timestamp}-${randomId}.${extension}`;
    const filePath = `applications/${jobId}/${userId}/${fileName}`;

    // Upload file to Supabase Storage
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

    // Return the storage path for use in application
    return NextResponse.json({
      storagePath: filePath,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      message: "File uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading application file:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
