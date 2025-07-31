import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { jobIds } = await request.json();

    if (!jobIds || !Array.isArray(jobIds)) {
      return Response.json(
        { message: "Job IDs array is required" },
        { status: 400 }
      );
    }

    const applications = await appPrisma.applications.findMany({
      where: {
        userId: session.user.id,
        jobId: { in: jobIds },
      },
      select: {
        jobId: true,
        status: true,
        appliedAt: true,
      },
    });

    // Create a map of jobId -> application data
    const applicationMap = {};
    applications.forEach((app) => {
      applicationMap[app.jobId] = {
        hasApplied: true,
        status: app.status,
        appliedAt: app.appliedAt,
      };
    });

    // For each requested job ID, include the result (or null if not applied)
    const result = {};
    jobIds.forEach((jobId) => {
      result[jobId] = applicationMap[jobId] || { hasApplied: false };
    });

    return Response.json(result);
  } catch (error) {
    console.error("Error checking multiple applications:", error);
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}
