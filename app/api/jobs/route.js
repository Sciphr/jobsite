// app/api/jobs/route.js
import { appPrisma } from "../../lib/prisma";

export async function GET() {
  try {
    // Fetch active jobs
    const jobs = await appPrisma.job.findMany({
      where: { status: "Active" },
      include: {
        category: true,
      },
      orderBy: [
        { featured: "desc" },
        { priority: "asc" },
        { postedAt: "desc" },
      ],
    });

    // Get filter options for dropdowns
    const [
      categories,
      locations,
      employmentTypes,
      experienceLevels,
      remotePolicies,
    ] = await Promise.all([
      appPrisma.category.findMany({
        orderBy: { name: "asc" },
      }),
      appPrisma.job.findMany({
        where: { status: "Active" },
        select: { location: true },
        distinct: ["location"],
        orderBy: { location: "asc" },
      }),
      appPrisma.job.findMany({
        where: { status: "Active" },
        select: { employmentType: true },
        distinct: ["employmentType"],
        orderBy: { employmentType: "asc" },
      }),
      appPrisma.job.findMany({
        where: { status: "Active" },
        select: { experienceLevel: true },
        distinct: ["experienceLevel"],
        orderBy: { experienceLevel: "asc" },
      }),
      appPrisma.job.findMany({
        where: { status: "Active" },
        select: { remotePolicy: true },
        distinct: ["remotePolicy"],
        orderBy: { remotePolicy: "asc" },
      }),
    ]);

    return new Response(
      JSON.stringify({
        jobs,
        filterOptions: {
          categories,
          locations: locations.map((l) => l.location),
          employmentTypes: employmentTypes.map((e) => e.employmentType),
          experienceLevels: experienceLevels.map((e) => e.experienceLevel),
          remotePolicies: remotePolicies.map((r) => r.remotePolicy),
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Jobs fetch error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
