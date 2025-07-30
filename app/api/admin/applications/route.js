import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";

export async function GET(req) {
  const session = await getServerSession(authOptions);

  // Check if user is admin (privilege level 1 or higher - HR can see applications)
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 1
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

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
        (app.user ? `${app.user.firstName} ${app.user.lastName}`.trim() : null),
      email: app.email || app.user?.email,
      phone: app.phone,
      status: app.status,
      coverLetter: app.coverLetter,
      resumeUrl: app.resumeUrl,
      notes: app.notes,
      appliedAt: app.appliedAt,
      updatedAt: app.updatedAt,
      jobId: app.jobId,
      userId: app.userId,
      job: app.job,
    }));

    return new Response(JSON.stringify(formattedApplications), { status: 200 });
  } catch (error) {
    console.error("Applications fetch error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
