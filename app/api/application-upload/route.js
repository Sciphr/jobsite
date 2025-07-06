// app/api/application-upload/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { uploadToSupabase } from "../../lib/supabase-storage";

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
