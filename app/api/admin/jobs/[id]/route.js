import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { appPrisma } from "../../../../lib/prisma";

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);

  // Check if user is admin (privilege level 2 or higher)
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 2
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  const { id } = await params;

  try {
    const job = await appPrisma.job.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        applications: {
          select: {
            id: true,
            status: true,
            appliedAt: true,
          },
        },
      },
    });

    if (!job) {
      return new Response(JSON.stringify({ message: "Job not found" }), {
        status: 404,
      });
    }

    // Separately fetch creator if exists
    let creator = null;
    if (job.createdBy) {
      try {
        creator = await appPrisma.user.findUnique({
          where: { id: job.createdBy },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        });
      } catch (error) {
        console.warn(`Creator not found for job ${job.id}`);
      }
    }

    const jobWithCreator = { ...job, creator };

    return new Response(JSON.stringify(jobWithCreator), { status: 200 });
  } catch (error) {
    console.error("Job fetch error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);

  // Check if user is admin (privilege level 2 or higher)
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 2
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  const { id } = await params;

  try {
    const body = await req.json();

    // Extract fields that can be updated
    const updateData = {};

    // Status update
    if (body.status !== undefined) {
      const validStatuses = ["Active", "Draft", "Paused", "Closed"];
      if (!validStatuses.includes(body.status)) {
        return new Response(JSON.stringify({ message: "Invalid status" }), {
          status: 400,
        });
      }
      updateData.status = body.status;

      // If activating, set postedAt
      if (body.status === "Active" && !updateData.postedAt) {
        updateData.postedAt = new Date();
      }
    }

    // Featured toggle
    if (body.featured !== undefined) {
      updateData.featured = body.featured;
    }

    // Priority update
    if (body.priority !== undefined) {
      updateData.priority = body.priority;
    }

    // Other fields can be updated
    const allowedFields = [
      "title",
      "description",
      "summary",
      "department",
      "employmentType",
      "experienceLevel",
      "location",
      "remotePolicy",
      "salaryMin",
      "salaryMax",
      "salaryCurrency",
      "salaryType",
      "benefits",
      "requirements",
      "preferredQualifications",
      "educationRequired",
      "yearsExperienceRequired",
      "applicationDeadline",
      "startDate",
      "applicationInstructions",
      "categoryId",
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // Always update the updatedAt timestamp
    updateData.updatedAt = new Date();

    const updatedJob = await appPrisma.job.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Separately fetch creator if exists
    let creator = null;
    if (updatedJob.createdBy) {
      try {
        creator = await appPrisma.user.findUnique({
          where: { id: updatedJob.createdBy },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        });
      } catch (error) {
        console.warn(`Creator not found for job ${updatedJob.id}`);
      }
    }

    const jobWithCreator = { ...updatedJob, creator };

    return new Response(JSON.stringify(jobWithCreator), { status: 200 });
  } catch (error) {
    console.error("Job update error:", error);

    if (error.code === "P2025") {
      return new Response(JSON.stringify({ message: "Job not found" }), {
        status: 404,
      });
    }

    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);

  // Check if user is admin (privilege level 2 or higher)
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 2
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  const { id } = await params;

  try {
    // Check if job has applications
    const jobWithApplications = await appPrisma.job.findUnique({
      where: { id },
      include: {
        applications: true,
      },
    });

    if (!jobWithApplications) {
      return new Response(JSON.stringify({ message: "Job not found" }), {
        status: 404,
      });
    }

    // If job has applications, you might want to prevent deletion
    // or handle it differently (e.g., soft delete)
    if (jobWithApplications.applications.length > 0) {
      // Delete applications first to avoid foreign key constraint
      await appPrisma.application.deleteMany({
        where: { jobId: id },
      });
      console.warn(
        `Deleted ${jobWithApplications.applications.length} applications for job ${id}`
      );
    }

    // Delete the job
    await appPrisma.job.delete({
      where: { id },
    });

    return new Response(
      JSON.stringify({ message: "Job deleted successfully" }),
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Job deletion error:", error);

    if (error.code === "P2025") {
      return new Response(JSON.stringify({ message: "Job not found" }), {
        status: 404,
      });
    }

    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
