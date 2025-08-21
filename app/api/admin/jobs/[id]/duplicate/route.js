import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import { appPrisma } from "../../../../../lib/prisma";

export async function POST(req, { params }) {
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
    // Get the original job
    const originalJob = await appPrisma.jobs.findUnique({
      where: { id },
      include: {
        categories: true,
      },
    });

    if (!originalJob) {
      return new Response(JSON.stringify({ message: "Job not found" }), {
        status: 404,
      });
    }

    // Create a unique slug for the duplicated job
    const baseSlug = originalJob.slug + "-copy";
    let newSlug = baseSlug;
    let counter = 1;

    // Check if slug exists and increment until we find a unique one
    while (await appPrisma.jobs.findUnique({ where: { slug: newSlug } })) {
      newSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create the duplicate job
    const duplicatedJob = await appPrisma.jobs.create({
      data: {
        title: `${originalJob.title} (Copy)`,
        slug: newSlug,
        description: originalJob.description,
        summary: originalJob.summary,
        department: originalJob.department,
        employment_type_id: originalJob.employment_type_id,
        experience_level_id: originalJob.experience_level_id,
        location: originalJob.location,
        remote_policy_id: originalJob.remote_policy_id,
        salaryMin: originalJob.salaryMin,
        salaryMax: originalJob.salaryMax,
        salaryCurrency: originalJob.salaryCurrency,
        salaryType: originalJob.salaryType,
        benefits: originalJob.benefits,
        requirements: originalJob.requirements,
        preferredQualifications: originalJob.preferredQualifications,
        educationRequired: originalJob.educationRequired,
        yearsExperienceRequired: originalJob.yearsExperienceRequired,
        applicationDeadline: originalJob.applicationDeadline,
        startDate: originalJob.startDate,
        applicationInstructions: originalJob.applicationInstructions,
        status: "Draft", // Always create as draft
        featured: false, // Don't copy featured status
        priority: originalJob.priority,
        categoryId: originalJob.categoryId,
        createdBy: session.user.id, // Set current user as creator
        // Reset stats
        viewCount: 0,
        applicationCount: 0,
        postedAt: null,
      },
      include: {
        categories: {
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

    return new Response(JSON.stringify(duplicatedJob), { status: 201 });
  } catch (error) {
    console.error("Job duplication error:", error);

    if (error.code === "P2025") {
      return new Response(
        JSON.stringify({ message: "Original job not found" }),
        {
          status: 404,
        }
      );
    }

    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
