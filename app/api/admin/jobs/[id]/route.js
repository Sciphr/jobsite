import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { appPrisma } from "../../../../lib/prisma";
import { protectRoute } from "../../../../lib/middleware/apiProtection";

import { sendJobPublishedNotification } from "../../../../lib/email";
import { getSystemSetting } from "../../../../lib/settings";
import {
  logAuditEvent,
  calculateChanges,
  truncateForDb,
} from "../../../../../lib/auditMiddleware";
import { extractRequestContext } from "../../../../lib/auditLog";

export async function GET(req, { params }) {
  const authResult = await protectRoute("jobs", "view");
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  const { id } = await params;

  try {
    const job = await appPrisma.jobs.findUnique({
      where: { id },
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        employment_types: {
          select: {
            id: true,
            name: true,
          },
        },
        experience_levels: {
          select: {
            id: true,
            name: true,
          },
        },
        remote_policies: {
          select: {
            id: true,
            name: true,
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
        creator = await appPrisma.users.findUnique({
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
  const authResult = await protectRoute("jobs", "edit");
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  const { id } = await params;
  let body;

  try {
    body = await req.json();
    const requestContext = extractRequestContext(req);

    // Get current job data for audit logging
    const currentJob = await appPrisma.jobs.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        status: true,
        featured: true,
        priority: true,
        department: true,
        applicationDeadline: true,
        startDate: true,
        postedAt: true,
        autoExpiresAt: true,
      },
    });

    if (!currentJob) {
      // Log failed attempt to update non-existent job
      await logAuditEvent(
        {
          eventType: "UPDATE",
          category: "JOB",
          entityType: "job",
          entityId: id,
          action: "Failed to update job - Job not found",
          description: `Attempted to update non-existent job with ID: ${id}`,
          severity: "warning",
          status: "failure",
          tags: ["job", "update", "not_found"],
          ...requestContext,
        },
        req
      );

      return new Response(JSON.stringify({ message: "Job not found" }), {
        status: 404,
      });
    }

    // Extract fields that can be updated
    const updateData = {};

    // Status update with auto-expiration handling
    if (body.status !== undefined) {
      const validStatuses = ["Active", "Draft", "Paused", "Closed"];
      if (!validStatuses.includes(body.status)) {
        return new Response(JSON.stringify({ message: "Invalid status" }), {
          status: 400,
        });
      }
      updateData.status = body.status;

      // If activating a job, set postedAt and calculate auto-expiration
      if (body.status === "Active") {
        if (!updateData.postedAt) {
          updateData.postedAt = new Date();
        }

        // Calculate auto-expiration if enabled and not already set
        const autoExpireDays = await getSystemSetting(
          "auto_expire_jobs_days",
          0
        );
        if (autoExpireDays > 0) {
          // Only set auto-expiration if it's not already set
          const currentJob = await appPrisma.jobs.findUnique({
            where: { id },
            select: { autoExpiresAt: true, postedAt: true },
          });

          if (!currentJob?.autoExpiresAt) {
            const expirationDate = new Date(updateData.postedAt);
            expirationDate.setDate(expirationDate.getDate() + autoExpireDays);
            updateData.autoExpiresAt = expirationDate;
          }
        }
      }

      // If setting to Draft, Paused, or Closed, clear auto-expiration
      if (["Draft", "Paused", "Closed"].includes(body.status)) {
        updateData.autoExpiresAt = null;
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
      "employment_type_id",
      "experience_level_id",
      "location",
      "remote_policy_id",
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
      "application_type",
      "visibility",
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // Handle numeric fields properly - convert strings to integers
    if (body.salaryMin !== undefined) {
      updateData.salaryMin = body.salaryMin ? parseInt(body.salaryMin, 10) : null;
    }
    if (body.salaryMax !== undefined) {
      updateData.salaryMax = body.salaryMax ? parseInt(body.salaryMax, 10) : null;
    }
    if (body.priority !== undefined) {
      updateData.priority = body.priority ? parseInt(body.priority, 10) : 0;
    }
    if (body.yearsExperienceRequired !== undefined) {
      updateData.yearsExperienceRequired = body.yearsExperienceRequired ? 
        parseInt(body.yearsExperienceRequired, 10) : null;
    }

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

    const updatedJob = await appPrisma.jobs.update({
      where: { id },
      data: updateData,
      include: {
        categories: {
          select: {
            id: true,
            name: true,
          },
        },
        employment_types: {
          select: {
            id: true,
            name: true,
          },
        },
        experience_levels: {
          select: {
            id: true,
            name: true,
          },
        },
        remote_policies: {
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

    // Calculate what changed for audit log
    const changes = calculateChanges(currentJob, updateData);
    const changedFields = Object.keys(changes || {});

    // Log successful job update
    await logAuditEvent(
      {
        eventType: "UPDATE",
        category: "JOB",
        subcategory:
          changedFields.includes("status") && updateData.status === "Active"
            ? "JOB_PUBLISH"
            : changedFields.includes("featured")
              ? "JOB_FEATURE"
              : null,
        entityType: "job",
        entityId: id,
        entityName: truncateForDb(currentJob.title, 255),
        action: `Job updated: ${changedFields.length} field${changedFields.length !== 1 ? 's' : ''}`,
        description: truncateForDb(`Updated job posting: ${currentJob.title}. Changed fields: ${changedFields.join(", ")}`, 500),
        oldValues: currentJob,
        newValues: updateData,
        changes,
        relatedJobId: id,
        severity: changedFields.includes("status") ? "warning" : "info",
        status: "success",
        tags: ["job", "update", "admin_action", ...changedFields.slice(0, 10)],
        metadata: {
          changedFields,
          changedFieldsList: changedFields.join(", "),
          wasJustPublished,
          category: updatedJob.categories?.name,
        },
        ...requestContext,
      },
      req
    );

    // Trigger job notifications if job was just published
    if (wasJustPublished) {
      try {
        await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/jobs/notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ jobId: updatedJob.id }),
        });
        console.log(`📧 Job notifications triggered for updated job: ${updatedJob.title}`);
      } catch (notificationError) {
        console.error('Failed to trigger job notifications:', notificationError);
        // Don't fail job update if notification fails
      }
    }

    // Separately fetch creator if exists
    let creator = null;
    if (updatedJob.createdBy) {
      try {
        creator = await appPrisma.users.findUnique({
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

    // Log the error
    await logAuditEvent(
      {
        eventType: "ERROR",
        category: "JOB",
        entityType: "job",
        entityId: id,
        action: "Failed to update job",
        description: `Job update failed: ${error.message}`.substring(0, 500),
        severity: "error",
        status: "failure",
        tags: ["job", "update", "error"],
        metadata: {
          errorCode: error.code,
          errorMessage: error.message,
          attempted: body,
        },
      },
      req
    );

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
  const authResult = await protectRoute("jobs", "delete");
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  const { id } = await params;

  try {
    const requestContext = extractRequestContext(req);

    // Check if job has applications and get job data for audit
    const jobWithApplications = await appPrisma.jobs.findUnique({
      where: { id },
      include: {
        applications: true,
      },
    });

    if (!jobWithApplications) {
      // Log failed attempt to delete non-existent job
      await logAuditEvent(
        {
          eventType: "DELETE",
          category: "JOB",
          entityType: "job",
          entityId: id,
          action: "Failed to delete job - Job not found",
          description: `Attempted to delete non-existent job with ID: ${id}`,
          severity: "warning",
          status: "failure",
          tags: ["job", "delete", "not_found"],
          ...requestContext,
        },
        req
      );

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
    await appPrisma.jobs.delete({
      where: { id },
    });

    // Log successful job deletion
    await logAuditEvent(
      {
        eventType: "DELETE",
        category: "JOB",
        entityType: "job",
        entityId: id,
        entityName: jobWithApplications.title,
        action: "Job deleted",
        description: `Deleted job posting: ${jobWithApplications.title} (${jobWithApplications.department})`,
        oldValues: {
          title: jobWithApplications.title,
          status: jobWithApplications.status,
          department: jobWithApplications.department,
          applicationsCount: jobWithApplications.applications.length,
        },
        // Don't set relatedJobId for deletions since the job no longer exists
        severity: "warning",
        status: "success",
        tags: ["job", "delete", "admin_action"],
        metadata: {
          deletedApplications: jobWithApplications.applications.length,
          jobStatus: jobWithApplications.status,
          department: jobWithApplications.department,
          featured: jobWithApplications.featured,
        },
        ...requestContext,
      },
      req
    );

    return new Response(
      JSON.stringify({ message: "Job deleted successfully" }),
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Job deletion error:", error);

    // Log the error
    await logAuditEvent(
      {
        eventType: "ERROR",
        category: "JOB",
        entityType: "job",
        entityId: id,
        action: "Failed to delete job",
        description: `Job deletion failed: ${error.message}`,
        severity: "error",
        status: "failure",
        tags: ["job", "delete", "error"],
        metadata: {
          errorCode: error.code,
          errorMessage: error.message,
        },
      },
      req
    );

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
