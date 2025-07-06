// app/api/saved-jobs/route.js
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route"; // ✅ move authOptions to a shared /lib/auth.js
import { PrismaClient } from "../../../app/generated/prisma"; // ✅ adjust import if needed
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  try {
    // If jobId is provided, check if specific job is saved
    if (jobId) {
      const savedJob = await prisma.savedJobs.findUnique({
        where: {
          userId_jobId: {
            userId,
            jobId,
          },
        },
      });

      return NextResponse.json({ isSaved: !!savedJob });
    }

    // Otherwise, return all saved jobs
    const savedJobs = await prisma.savedJobs.findMany({
      where: { userId },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            department: true,
            location: true,
            salaryMin: true,
            salaryMax: true,
            salaryCurrency: true,
            employmentType: true,
            remotePolicy: true,
            createdAt: true,
            slug: true,
          },
        },
      },
      orderBy: { savedAt: "desc" },
    });

    return NextResponse.json(savedJobs);
  } catch (error) {
    console.error("Saved jobs fetch error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const { jobId } = await request.json();

    if (!jobId) {
      return NextResponse.json(
        { message: "Job ID is required" },
        { status: 400 }
      );
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } });

    if (!job) {
      return NextResponse.json({ message: "Job not found" }, { status: 404 });
    }

    const existingSave = await prisma.savedJobs.findUnique({
      where: {
        userId_jobId: {
          userId,
          jobId,
        },
      },
    });

    if (existingSave) {
      return NextResponse.json(
        { message: "Job already saved" },
        { status: 400 }
      );
    }

    const savedJob = await prisma.savedJobs.create({
      data: { userId, jobId },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            department: true,
            location: true,
            salaryMin: true,
            salaryMax: true,
            salaryCurrency: true,
            employmentType: true,
            remotePolicy: true,
            createdAt: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json(savedJob, { status: 201 });
  } catch (error) {
    console.error("Save job error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const { jobId } = await request.json();

    if (!jobId) {
      return NextResponse.json(
        { message: "Job ID is required" },
        { status: 400 }
      );
    }

    await prisma.savedJob.delete({
      where: {
        userId_jobId: {
          userId,
          jobId,
        },
      },
    });

    return NextResponse.json({ message: "Job removed from saved jobs" });
  } catch (error) {
    console.error("Remove saved job error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
