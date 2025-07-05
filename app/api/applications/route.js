// app/api/applications/route.js (for App Router)
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { PrismaClient } from "../../../app/generated/prisma";

const prisma = new PrismaClient();

export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const applications = await prisma.application.findMany({
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
      orderBy: { appliedAt: "desc" },
    });

    return Response.json(applications);
  } catch (error) {
    console.error("Applications fetch error:", error);
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const { jobId, coverLetter, resumeUrl } = await request.json();

    if (!jobId) {
      return Response.json({ message: "Job ID is required" }, { status: 400 });
    }

    // Check if job exists
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return Response.json({ message: "Job not found" }, { status: 404 });
    }

    // Check if already applied
    const existingApplication = await prisma.application.findUnique({
      where: {
        userId_jobId: {
          userId,
          jobId,
        },
      },
    });

    if (existingApplication) {
      return Response.json(
        { message: "Already applied to this job" },
        { status: 400 }
      );
    }

    const application = await prisma.application.create({
      data: {
        userId,
        jobId,
        coverLetter: coverLetter || null,
        resumeUrl: resumeUrl || null,
      },
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

    // Increment application count for the job
    await prisma.job.update({
      where: { id: jobId },
      data: {
        applicationCount: {
          increment: 1,
        },
      },
    });

    return Response.json(application, { status: 201 });
  } catch (error) {
    console.error("Apply to job error:", error);
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const { applicationId, status } = await request.json();

    if (!applicationId || !status) {
      return Response.json(
        { message: "Application ID and status are required" },
        { status: 400 }
      );
    }

    // Updated valid statuses based on your schema
    const validStatuses = [
      "Applied",
      "Reviewing",
      "Interview",
      "Rejected",
      "Hired",
    ];
    if (!validStatuses.includes(status)) {
      return Response.json({ message: "Invalid status" }, { status: 400 });
    }

    const updatedApplication = await prisma.application.update({
      where: {
        id: applicationId,
        userId, // Ensure user can only update their own applications
      },
      data: { status },
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

    return Response.json(updatedApplication);
  } catch (error) {
    console.error("Update application error:", error);
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}
