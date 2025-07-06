// app/api/saved-jobs/route.js
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { appPrisma } from "../../lib/prisma";
import { NextResponse } from "next/server";

//const prisma = new prismaClient();

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
      const savedJob = await appPrisma.savedJob.findUnique({
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
    const savedJobs = await appPrisma.savedJob.findMany({
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

    const job = await appPrisma.job.findUnique({ where: { id: jobId } });

    if (!job) {
      return NextResponse.json({ message: "Job not found" }, { status: 404 });
    }

    const existingSave = await appPrisma.savedJob.findUnique({
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

    const savedJob = await appPrisma.savedJob.create({
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

    // FIXED: Changed from appPrisma.savedJobs.delete to appPrisma.savedJob.delete
    await appPrisma.savedJob.delete({
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
