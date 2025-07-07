// app/api/resume-download/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

// Use service role key for admin operations (same as upload)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Changed from ANON_KEY to SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storagePath = searchParams.get("path");

    if (!storagePath) {
      return NextResponse.json(
        { error: "Storage path is required" },
        { status: 400 }
      );
    }

    "Attempting to download file from path:", storagePath;

    // First, check if the file exists
    const { data: fileData, error: fileError } = await supabase.storage
      .from("resumes")
      .list(storagePath.split("/")[0], {
        search: storagePath.split("/")[1],
      });

    if (fileError) {
      console.error("Error checking file existence:", fileError);
    } else {
      "Files found in directory:", fileData;
    }

    // Generate signed URL for file download (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from("resumes")
      .createSignedUrl(storagePath, 3600);

    if (error) {
      console.error("Error generating download URL:", error);
      console.error("Storage path attempted:", storagePath);

      // Try to get more information about available files
      const userId = storagePath.split("/")[0];
      const { data: userFiles, error: listError } = await supabase.storage
        .from("resumes")
        .list(userId);

      if (!listError && userFiles) {
        "Available files for user:", userFiles;
      }

      return NextResponse.json(
        {
          error: "File not found in storage",
          details: error.message,
          path: storagePath,
        },
        { status: 404 }
      );
    }

    ("Download URL generated successfully");

    return NextResponse.json({
      downloadUrl: data.signedUrl,
      message: "Download URL generated successfully",
    });
  } catch (error) {
    console.error("Error in resume download:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
