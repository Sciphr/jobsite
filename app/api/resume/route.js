// app/api/resumes/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { PrismaClient } from "../../../app/generated/prisma";
import {
  uploadToSupabase,
  deleteFromSupabase,
} from "../../lib/supabase-storage";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resumes = await prisma.userResumes.findMany({
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
    const existingResume = await prisma.userResumes.findFirst({
      where: { userId: session.user.id },
    });

    // If user has existing resume, delete it from storage first
    if (existingResume) {
      const { error: deleteError } = await deleteFromSupabase(
        existingResume.storagePath
      );
      if (deleteError) {
        console.error("Error deleting old resume from storage:", deleteError);
        // Continue with upload even if old file deletion fails
      }
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split(".").pop();
    const fileName = `${timestamp}-${file.name}`;
    const filePath = `${session.user.id}/${fileName}`;

    // Upload new file to Supabase Storage
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

    // Create or update resume record
    const resumeData = {
      userId: session.user.id,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      storagePath: filePath,
      uploadedAt: new Date(),
      isDefault: true, // Mark as default resume
    };

    let resume;
    if (existingResume) {
      // Update existing resume
      resume = await prisma.userResumes.update({
        where: { id: existingResume.id },
        data: resumeData,
      });
    } else {
      // Create new resume
      resume = await prisma.userResumes.create({
        data: resumeData,
      });
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
    const resume = await prisma.userResumes.findFirst({
      where: { userId: session.user.id },
    });

    if (!resume) {
      return NextResponse.json(
        { error: "No resume found to delete" },
        { status: 404 }
      );
    }

    // Delete from Supabase Storage
    const { error: deleteError } = await deleteFromSupabase(resume.storagePath);
    if (deleteError) {
      console.error("Storage deletion error:", deleteError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    await prisma.userResumes.delete({
      where: { id: resume.id },
    });

    return NextResponse.json({ message: "Resume deleted successfully" });
  } catch (error) {
    console.error("Error deleting resume:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
