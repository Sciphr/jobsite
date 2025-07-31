import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";
import { protectRoute } from "../../../lib/middleware/apiProtection";

export async function GET(req) {
  // Check if user has permission to view applications
  const authResult = await protectRoute("applications", "view");
  if (authResult.error) return authResult.error;

  const { session } = authResult;

  try {
    const applications = await appPrisma.applications.findMany({
      include: {
        jobs: {
          select: {
            id: true,
            title: true,
            department: true,
            slug: true,
            employmentType: true,
            experienceLevel: true,
            location: true,
            remotePolicy: true,
            salaryMin: true,
            salaryMax: true,
            salaryCurrency: true,
          },
        },
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        appliedAt: "desc",
      },
    });

    // Format the data for the frontend
    const formattedApplications = applications.map((app) => ({
      id: app.id,
      name:
        app.name ||
        (app.users ? `${app.users.firstName} ${app.users.lastName}`.trim() : null),
      email: app.email || app.users?.email,
      phone: app.phone,
      status: app.status,
      coverLetter: app.coverLetter,
      resumeUrl: app.resumeUrl,
      notes: app.notes,
      appliedAt: app.appliedAt,
      updatedAt: app.updatedAt,
      jobId: app.jobId,
      userId: app.userId,
      job: app.jobs, // Alias for frontend compatibility
    }));

    return new Response(JSON.stringify(formattedApplications), { status: 200 });
  } catch (error) {
    console.error("Applications fetch error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
