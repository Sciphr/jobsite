import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";
import { getSystemSetting } from "../../../lib/settings";

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
    const jobs = await appPrisma.job.findMany({
      include: {
        category: {
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
        return { ...job, creator };
      })
    );

    // Format the data for frontend
    const formattedJobs = jobsWithCreators.map((job) => ({
      id: job.id,
      title: job.title,
      slug: job.slug,
      description: job.description,
      summary: job.summary,
      department: job.department,
      employmentType: job.employmentType,
      experienceLevel: job.experienceLevel,
      location: job.location,
      remotePolicy: job.remotePolicy,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryCurrency: job.salaryCurrency,
      salaryType: job.salaryType,
      benefits: job.benefits,
      requirements: job.requirements,
      preferredQualifications: job.preferredQualifications,
      educationRequired: job.educationRequired,
      yearsExperienceRequired: job.yearsExperienceRequired,
      applicationDeadline: job.applicationDeadline,
      startDate: job.startDate,
      applicationInstructions: job.applicationInstructions,
      status: job.status,
      featured: job.featured,
      priority: job.priority,
      viewCount: job.viewCount,
      applicationCount: job.applicationCount,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      postedAt: job.postedAt,
      categoryId: job.categoryId,
      createdBy: job.createdBy,
      category: job.category,
      creator: job.creator,
    }));

    return new Response(JSON.stringify(formattedJobs), { status: 200 });
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

    // Validation
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

    // Create the job
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
        salaryMin: salaryMin || null,
        salaryMax: salaryMax || null,
        salaryCurrency:
          salaryCurrency || (await getSystemSetting("default_currency", "CAD")),
        salaryType: salaryType || "Annual",
        benefits: benefits || null,
        requirements,
        preferredQualifications: preferredQualifications || null,
        educationRequired: educationRequired || null,
        yearsExperienceRequired: yearsExperienceRequired || null,
        applicationDeadline: applicationDeadline
          ? new Date(applicationDeadline)
          : null,
        startDate: startDate ? new Date(startDate) : null,
        applicationInstructions: applicationInstructions || null,
        status: status || "Draft",
        featured: featured || false,
        priority: priority || 0,
        categoryId,
        createdBy: session.user.id,
        postedAt: status === "Active" ? new Date() : null,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return new Response(JSON.stringify(newJob), { status: 201 });
  } catch (error) {
    console.error("Job creation error:", error);

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
