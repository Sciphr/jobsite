// app/api/admin/resume-download/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    // TODO: Add admin check when you implement admin roles
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

    // Generate signed URL for file download (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from("resumes")
      .createSignedUrl(storagePath, 3600);

    if (error) {
      console.error("Error generating download URL:", error);
      return NextResponse.json(
        { error: "Failed to generate download URL" },
        { status: 500 }
      );
    }

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
