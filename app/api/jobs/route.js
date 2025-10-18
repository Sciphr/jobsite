// app/api/jobs/route.js
import { appPrisma } from "../../lib/prisma";
import { logAuditEvent } from "../../../lib/auditMiddleware";
import { extractRequestContext } from "../../lib/auditLog";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { getJobVisibilityFilter } from "../../lib/jobVisibility";

export async function GET(request) {
  const requestContext = extractRequestContext(request);

  try {
    // Get session to determine user context
    const session = await getServerSession(authOptions);
    const user = session?.user || null;

    // Log jobs list access attempt
    await logAuditEvent({
      eventType: "VIEW",
      category: "JOB",
      action: "Jobs list accessed",
      description: "Public jobs list accessed",
      actorType: user ? "user" : "anonymous",
      actorName: user ? (user.name || user.email) : "Anonymous",
      actorId: user?.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      severity: "info",
      status: "success",
      tags: ["jobs", "list", "public", "access"]
    }, request).catch(console.error);

    // Get visibility filter based on user authentication status
    const visibilityFilter = await getJobVisibilityFilter(user);

    // Fetch active jobs with visibility filtering
    const jobs = await appPrisma.jobs.findMany({
      where: {
        status: "Active",
        ...visibilityFilter,
      },
      include: {
        categories: true,
        employment_types: true,
        experience_levels: true,
        remote_policies: true,
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
      appPrisma.categories.findMany({
        orderBy: { name: "asc" },
      }),
      appPrisma.jobs.findMany({
        where: {
          status: "Active",
          ...visibilityFilter,
        },
        select: { location: true },
        distinct: ["location"],
        orderBy: { location: "asc" },
      }),
      appPrisma.employment_types.findMany({
        where: { is_active: true },
        orderBy: [
          { sort_order: "asc" },
          { name: "asc" }
        ],
      }),
      appPrisma.experience_levels.findMany({
        where: { is_active: true },
        orderBy: [
          { sort_order: "asc" },
          { name: "asc" }
        ],
      }),
      appPrisma.remote_policies.findMany({
        where: { is_active: true },
        orderBy: [
          { sort_order: "asc" },
          { name: "asc" }
        ],
      }),
    ]);

    // Log successful jobs list retrieval
    await logAuditEvent({
      eventType: "VIEW",
      category: "JOB",
      action: "Jobs list retrieved successfully",
      description: `Successfully retrieved ${jobs.length} active jobs with filter options`,
      actorType: "anonymous",
      actorName: "Anonymous",
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      severity: "info",
      status: "success",
      tags: ["jobs", "list", "public", "success"],
      metadata: {
        jobCount: jobs.length,
        categoryCount: categories.length,
        locationCount: locations.length,
        employmentTypeCount: employmentTypes.length,
        experienceLevelCount: experienceLevels.length,
        remotePolicyCount: remotePolicies.length
      }
    }, request).catch(console.error);

    return new Response(
      JSON.stringify({
        jobs,
        filterOptions: {
          categories,
          locations: locations.map((l) => l.location),
          employmentTypes: employmentTypes.map((e) => e.name),
          experienceLevels: experienceLevels.map((e) => e.name),
          remotePolicies: remotePolicies.map((r) => r.name),
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Jobs fetch error:", error);
    
    // Log server error during jobs list access
    await logAuditEvent({
      eventType: "ERROR",
      category: "SYSTEM",
      action: "Jobs list access failed - server error",
      description: "Server error during public jobs list retrieval",
      actorType: "anonymous",
      actorName: "Anonymous",
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      severity: "error",
      status: "failure",
      tags: ["jobs", "list", "server_error", "system"],
      metadata: {
        error: error.message,
        stack: error.stack
      }
    }, request).catch(console.error);
    
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
