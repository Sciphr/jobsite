// app/api/admin/jobs/route.js - Updated POST method
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";
import { getSystemSetting } from "../../../lib/settings";
import { sendJobPublishedNotification } from "../../../lib/email";
import { logAuditEvent } from "../../../../lib/auditMiddleware";
import { extractRequestContext } from "../../../lib/auditLog";

export async function GET(req) {
  const session = await getServerSession(authOptions);

  // Check if user is admin (privilege level 2 or higher for jobs management)
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 2
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const jobs = await appPrisma.jobs.findMany({
      include: {
        categories: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Separately fetch creator info for jobs that have valid createdBy
    const jobsWithCreators = await Promise.all(
      jobs.map(async (job) => {
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
        return { ...job, creator };
      })
    );

    return new Response(JSON.stringify(jobsWithCreators), { status: 200 });
  } catch (error) {
    console.error("Jobs fetch error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}

export async function POST(req) {
  const session = await getServerSession(authOptions);

  // Check if user is admin (privilege level 2 or higher for creating jobs)
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 2
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const body = await req.json();
    const requestContext = extractRequestContext(req);

    // Get relevant settings
    const [
      requireSalaryRange,
      applicationDeadlineRequired,
      autoPublishJobs,
      defaultExpirationDays,
      defaultCurrency,
    ] = await Promise.all([
      getSystemSetting("require_salary_range", false),
      getSystemSetting("application_deadline_required", false),
      getSystemSetting("auto_publish_jobs", false),
      getSystemSetting("job_expiration_days", 60),
      getSystemSetting("default_currency", "CAD"),
    ]);

    // Extract and validate required fields
    const {
      title,
      slug,
      description,
      summary,
      department,
      employmentType,
      experienceLevel,
      location,
      remotePolicy,
      salaryMin,
      salaryMax,
      salaryCurrency,
      salaryType,
      benefits,
      requirements,
      preferredQualifications,
      educationRequired,
      yearsExperienceRequired,
      applicationDeadline,
      startDate,
      applicationInstructions,
      status,
      featured,
      priority,
      categoryId,
    } = body;

    // Basic validation
    if (
      !title ||
      !slug ||
      !description ||
      !department ||
      !location ||
      !requirements ||
      !categoryId
    ) {
      return new Response(
        JSON.stringify({
          message:
            "Missing required fields: title, slug, description, department, location, requirements, categoryId",
        }),
        {
          status: 400,
        }
      );
    }

    // Apply salary range validation if required by settings
    if (requireSalaryRange) {
      if (!salaryMin || !salaryMax) {
        return new Response(
          JSON.stringify({
            message: "Salary range is required by system settings",
          }),
          {
            status: 400,
          }
        );
      }
      if (salaryMin >= salaryMax) {
        return new Response(
          JSON.stringify({
            message: "Minimum salary must be less than maximum salary",
          }),
          {
            status: 400,
          }
        );
      }
    }

    // Apply application deadline validation if required by settings
    if (applicationDeadlineRequired && !applicationDeadline) {
      return new Response(
        JSON.stringify({
          message: "Application deadline is required by system settings",
        }),
        {
          status: 400,
        }
      );
    }

    // Check if slug is unique
    const existingJob = await appPrisma.job.findUnique({
      where: { slug },
    });

    if (existingJob) {
      return new Response(
        JSON.stringify({ message: "A job with this slug already exists" }),
        {
          status: 409,
        }
      );
    }

    // Calculate auto-expiration date if enabled
    let autoExpirationDate = null;
    const autoExpireDays = await getSystemSetting("auto_expire_jobs_days", 0);
    if (autoExpireDays > 0) {
      autoExpirationDate = new Date();
      autoExpirationDate.setDate(autoExpirationDate.getDate() + autoExpireDays);
    }

    // Determine job status based on settings
    let jobStatus = status || "Draft";
    let postedAt = null;

    // Auto-publish overrides the form status when enabled
    if (autoPublishJobs && (!status || status === "Draft")) {
      jobStatus = "Active";
    }

    // Set postedAt if job is being published
    if (jobStatus === "Active") {
      postedAt = new Date();

      // If we have auto-expiration enabled and no specific expiration date set,
      // calculate it from the posting date
      if (autoExpireDays > 0 && !autoExpirationDate) {
        autoExpirationDate = new Date(postedAt);
        autoExpirationDate.setDate(
          autoExpirationDate.getDate() + autoExpireDays
        );
      }
    }

    const newJob = await appPrisma.job.create({
      data: {
        title,
        slug,
        description,
        summary: summary || null,
        department,
        employmentType: employmentType || "Full-time",
        experienceLevel: experienceLevel || "Mid",
        location,
        remotePolicy: remotePolicy || "On-site",
        salaryMin: salaryMin ? parseInt(salaryMin, 10) : null,
        salaryMax: salaryMax ? parseInt(salaryMax, 10) : null,
        salaryCurrency: salaryCurrency || defaultCurrency,
        salaryType: salaryType || "Annual",
        benefits: benefits || null,
        requirements,
        preferredQualifications: preferredQualifications || null,
        educationRequired: educationRequired || null,
        yearsExperienceRequired: yearsExperienceRequired
          ? parseInt(yearsExperienceRequired, 10)
          : null,
        applicationDeadline: applicationDeadline
          ? new Date(applicationDeadline)
          : null,
        startDate: startDate ? new Date(startDate) : null,
        applicationInstructions: applicationInstructions || null,
        status: jobStatus,
        featured: featured || false,
        priority: priority ? parseInt(priority, 10) : 0,
        categoryId,
        createdBy: session.user.id,
        postedAt,
        // Add auto-expiration if calculated
        autoExpiresAt: autoExpirationDate,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Log successful job creation
    await logAuditEvent(
      {
        eventType: "CREATE",
        category: "JOB",
        subcategory: newJob.status === "Active" ? "JOB_PUBLISH" : null,
        entityType: "job",
        entityId: newJob.id,
        entityName: newJob.title,
        action:
          newJob.status === "Active"
            ? "Job created and published"
            : "Job created as draft",
        description: `Created job posting: ${newJob.title} in ${newJob.department} department`,
        newValues: {
          title: newJob.title,
          department: newJob.department,
          status: newJob.status,
          location: newJob.location,
          employmentType: newJob.employmentType,
        },
        relatedJobId: newJob.id,
        severity: "info",
        status: "success",
        tags: ["job", "create", newJob.status.toLowerCase(), "admin_action"],
        metadata: {
          autoPublished: autoPublishJobs && newJob.status === "Active",
          category: newJob.categories.name,
          salary:
            newJob.salaryMin && newJob.salaryMax
              ? `${newJob.salaryMin}-${newJob.salaryMax} ${newJob.salaryCurrency}`
              : null,
          featured: newJob.featured,
        },
        ...requestContext,
      },
      req
    );

    return new Response(JSON.stringify(newJob), { status: 201 });
  } catch (error) {
    console.error("Job creation error:", error);

    // Log the error
    await logAuditEvent(
      {
        eventType: "ERROR",
        category: "JOB",
        entityType: "job",
        action: "Failed to create job",
        description: `Job creation failed: ${error.message}`,
        severity: "error",
        status: "failure",
        tags: ["job", "create", "error"],
        metadata: {
          errorCode: error.code,
          errorMessage: error.message,
          attempted: {
            title: body?.title,
            department: body?.department,
            slug: body?.slug,
          },
        },
      },
      req
    );

    if (error.code === "P2002") {
      return new Response(
        JSON.stringify({ message: "A job with this slug already exists" }),
        {
          status: 409,
        }
      );
    }

    if (error.code === "P2003") {
      return new Response(JSON.stringify({ message: "Invalid category ID" }), {
        status: 400,
      });
    }

    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
