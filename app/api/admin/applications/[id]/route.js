import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { appPrisma } from "../../../../lib/prisma";

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);

  // Check if user is admin (privilege level 1 or higher - HR can update applications)
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 1
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  const { id } = params;

  try {
    const body = await req.json();
    const { status, notes } = body;

    // Validate status
    const validStatuses = [
      "Applied",
      "Reviewing",
      "Interview",
      "Hired",
      "Rejected",
    ];
    if (status && !validStatuses.includes(status)) {
      return new Response(JSON.stringify({ message: "Invalid status" }), {
        status: 400,
      });
    }

    // Update the application
    const updatedApplication = await appPrisma.application.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
        updatedAt: new Date(),
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            department: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Format the response
    const formattedApplication = {
      id: updatedApplication.id,
      name:
        updatedApplication.name ||
        (updatedApplication.user
          ? `${updatedApplication.user.firstName} ${updatedApplication.user.lastName}`.trim()
          : null),
      email: updatedApplication.email || updatedApplication.user?.email,
      phone: updatedApplication.phone,
      status: updatedApplication.status,
      coverLetter: updatedApplication.coverLetter,
      resumeUrl: updatedApplication.resumeUrl,
      notes: updatedApplication.notes,
      appliedAt: updatedApplication.appliedAt,
      updatedAt: updatedApplication.updatedAt,
      jobId: updatedApplication.jobId,
      userId: updatedApplication.userId,
      job: updatedApplication.job,
    };

    return new Response(JSON.stringify(formattedApplication), { status: 200 });
  } catch (error) {
    console.error("Application update error:", error);

    if (error.code === "P2025") {
      return new Response(
        JSON.stringify({ message: "Application not found" }),
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

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);

  // Check if user is admin (privilege level 1 or higher)
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 1
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  const { id } = params;

  try {
    const application = await appPrisma.application.findUnique({
      where: { id },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            department: true,
            slug: true,
            description: true,
            requirements: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!application) {
      return new Response(
        JSON.stringify({ message: "Application not found" }),
        {
          status: 404,
        }
      );
    }

    // Format the response
    const formattedApplication = {
      id: application.id,
      name:
        application.name ||
        (application.user
          ? `${application.user.firstName} ${application.user.lastName}`.trim()
          : null),
      email: application.email || application.user?.email,
      phone: application.phone || application.user?.phone,
      status: application.status,
      coverLetter: application.coverLetter,
      resumeUrl: application.resumeUrl,
      notes: application.notes,
      appliedAt: application.appliedAt,
      updatedAt: application.updatedAt,
      jobId: application.jobId,
      userId: application.userId,
      job: application.job,
      user: application.user,
    };

    return new Response(JSON.stringify(formattedApplication), { status: 200 });
  } catch (error) {
    console.error("Application fetch error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
