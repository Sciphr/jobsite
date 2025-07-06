// app/api/applications/route.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { PrismaClient } from "../../../app/generated/prisma";

const prisma = new PrismaClient();

export async function GET(request) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  // If jobId is provided, check if user has applied to that specific job
  if (jobId) {
    if (!session) {
      return Response.json({ hasApplied: false }, { status: 200 });
    }

    try {
      const userId = session.user.id;

      const application = await prisma.application.findUnique({
        where: {
          userId_jobId: {
            userId,
            jobId,
          },
        },
        select: {
          id: true,
          status: true,
          appliedAt: true,
        },
      });

      if (application) {
        return Response.json({
          hasApplied: true,
          status: application.status,
          appliedAt: application.appliedAt,
          applicationId: application.id,
        });
      } else {
        return Response.json({
          hasApplied: false,
        });
      }
    } catch (error) {
      console.error("Error checking application status:", error);
      return Response.json(
        { message: "Internal server error" },
        { status: 500 }
      );
    }
  }

  // If no jobId, return all user's applications (existing logic)
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
  const userId = session?.user?.id || null;

  try {
    const { jobId, name, email, phone, coverLetter, resumeUrl } =
      await request.json();

    if (!jobId || !resumeUrl) {
      return Response.json(
        { message: "Job ID and resume are required" },
        { status: 400 }
      );
    }

    // Check if job exists
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return Response.json({ message: "Job not found" }, { status: 404 });
    }

    let applicationData = {
      jobId,
      coverLetter: coverLetter || null,
      resumeUrl,
    };

    if (userId) {
      // Logged-in user: Get user profile data
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      });

      if (!user) {
        return Response.json({ message: "User not found" }, { status: 404 });
      }

      // Check for duplicate application
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

      // Use user profile data
      applicationData.userId = userId;
      applicationData.name =
        `${user.firstName || ""} ${user.lastName || ""}`.trim() || null;
      applicationData.email = user.email;
      applicationData.phone = user.phone;
    } else {
      // Guest user: Require name, email, phone from form
      if (!name || !email || !phone) {
        return Response.json(
          {
            message:
              "Name, email, and phone are required for guest applications",
          },
          { status: 400 }
        );
      }

      applicationData.name = name;
      applicationData.email = email;
      applicationData.phone = phone;
    }

    const application = await prisma.application.create({
      data: applicationData,
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
