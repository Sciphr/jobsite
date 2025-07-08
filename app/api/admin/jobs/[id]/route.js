import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { appPrisma } from "../../../../lib/prisma";

import { sendJobPublishedNotification } from "../../../../lib/email";
import { getSystemSetting } from "../../../../lib/settings";

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
      "applicationInstructions",
      "categoryId",
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // Handle date fields properly - convert strings to Date objects
    if (body.applicationDeadline !== undefined) {
      if (
        body.applicationDeadline === null ||
        body.applicationDeadline === ""
      ) {
        updateData.applicationDeadline = null;
      } else {
        // Convert date string to Date object
        updateData.applicationDeadline = new Date(body.applicationDeadline);

        // Validate the date
        if (isNaN(updateData.applicationDeadline.getTime())) {
          return new Response(
            JSON.stringify({ message: "Invalid application deadline date" }),
            { status: 400 }
          );
        }
      }
    }

    if (body.startDate !== undefined) {
      if (body.startDate === null || body.startDate === "") {
        updateData.startDate = null;
      } else {
        // Convert date string to Date object
        updateData.startDate = new Date(body.startDate);

        // Validate the date
        if (isNaN(updateData.startDate.getTime())) {
          return new Response(
            JSON.stringify({ message: "Invalid start date" }),
            { status: 400 }
          );
        }
      }
    }

    // Always update the updatedAt timestamp
    updateData.updatedAt = new Date();

    console.log("Update data being sent to Prisma:", updateData);

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

    // Check if job was just published (status changed to Active)
    const wasJustPublished =
      updateData.status === "Active" && updateData.postedAt;

    // Send job published notification (if enabled and job was just published)
    const jobPublishedEmailEnabled = await getSystemSetting(
      "email_job_published",
      true
    );
    if (jobPublishedEmailEnabled && wasJustPublished) {
      console.log("📧 Sending job published notification for status update...");

      let creatorName = "Unknown";
      if (updatedJob.createdBy) {
        try {
          const creator = await appPrisma.user.findUnique({
            where: { id: updatedJob.createdBy },
            select: { firstName: true, lastName: true },
          });
          if (creator) {
            creatorName = `${creator.firstName} ${creator.lastName}`.trim();
          }
        } catch (error) {
          console.warn(
            "Could not fetch creator for job published notification"
          );
        }
      }

      const emailResult = await sendJobPublishedNotification({
        jobTitle: updatedJob.title,
        jobId: updatedJob.id,
        creatorName,
      });

      if (emailResult.success) {
        console.log("✅ Job published notification sent successfully");
      } else {
        console.error(
          "❌ Failed to send job published notification:",
          emailResult.error
        );
        // Don't fail the job update if email fails - just log it
      }
    }

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
