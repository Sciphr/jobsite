import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { appPrisma } from "../../../../lib/prisma";
import {
  auditApplication,
  extractRequestContext,
} from "../../../../lib/auditLog";
import { triggerStatusChangeAutomation } from "../../../../lib/emailAutomation";

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

  const { id } = await params;

  try {
    const body = await req.json();
    const { status, notes } = body;

    // Extract request context for audit logging
    const { ipAddress, userAgent, requestId } = extractRequestContext(req);

    // Get current application data for audit logging
    const currentApplication = await appPrisma.applications.findUnique({
      where: { id },
      include: {
        jobs: { select: { id: true, title: true } },
        users: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!currentApplication) {
      return new Response(
        JSON.stringify({ message: "Application not found" }),
        {
          status: 404,
        }
      );
    }

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
    const updatedApplication = await appPrisma.applications.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
        updatedAt: new Date(),
      },
      include: {
        jobs: {
          select: {
            id: true,
            title: true,
            department: true,
            salaryMin: true,
            salaryMax: true,
            benefits: true,
            startDate: true,
            applicationDeadline: true,
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
    });

    // Create audit logs for the changes
    const applicantName =
      updatedApplication.name ||
      (updatedApplication.users
        ? `${updatedApplication.users.firstName} ${updatedApplication.users.lastName}`.trim()
        : "Unknown");
    const actorName =
      session.user.firstName && session.user.lastName
        ? `${session.user.firstName} ${session.user.lastName}`.trim()
        : session.user.email || "System";

    // Log status change if status was updated
    if (status && status !== currentApplication.status) {
      await auditApplication.statusChange(
        updatedApplication.id,
        applicantName,
        currentApplication.status,
        status,
        session.user.id,
        actorName,
        updatedApplication.jobId
      );

      // Trigger email automation for status changes
      try {
        const automationResult = await triggerStatusChangeAutomation(
          updatedApplication.id,
          currentApplication.status,
          status,
          {
            userId: session.user.id,
            userName: actorName,
            ipAddress,
            userAgent,
            requestId,
          }
        );

        console.log(
          `🤖 Email automation processed: ${automationResult.triggered}/${automationResult.processed} rules triggered`
        );
      } catch (automationError) {
        console.error("Error in email automation:", automationError);
        // Don't fail the status update if automation fails
      }
    }

    // Log note update if notes were changed
    if (notes !== undefined && notes !== currentApplication.notes) {
      await auditApplication.noteUpdate(
        updatedApplication.id,
        applicantName,
        currentApplication.notes,
        notes,
        session.user.id,
        actorName
      );
    }

    // Format the response
    const formattedApplication = {
      id: updatedApplication.id,
      name:
        updatedApplication.name ||
        (updatedApplication.users
          ? `${updatedApplication.users.firstName} ${updatedApplication.users.lastName}`.trim()
          : null),
      email: updatedApplication.email || updatedApplication.users?.email,
      phone: updatedApplication.phone,
      status: updatedApplication.status,
      coverLetter: updatedApplication.coverLetter,
      resumeUrl: updatedApplication.resumeUrl,
      notes: updatedApplication.notes,
      appliedAt: updatedApplication.appliedAt,
      updatedAt: updatedApplication.updatedAt,
      jobId: updatedApplication.jobId,
      userId: updatedApplication.userId,
      job: updatedApplication.jobs, // Alias for frontend compatibility
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

  const { id } = await params;

  try {
    const application = await appPrisma.applications.findUnique({
      where: { id },
      include: {
        jobs: {
          select: {
            id: true,
            title: true,
            department: true,
            slug: true,
            description: true,
            requirements: true,
          },
        },
        users: {
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
        (application.users
          ? `${application.users.firstName} ${application.users.lastName}`.trim()
          : null),
      email: application.email || application.users?.email,
      phone: application.phone || application.users?.phone,
      status: application.status,
      coverLetter: application.coverLetter,
      resumeUrl: application.resumeUrl,
      notes: application.notes,
      appliedAt: application.appliedAt,
      updatedAt: application.updatedAt,
      jobId: application.jobId,
      userId: application.userId,
      job: application.jobs, // Alias for frontend compatibility
      user: application.users, // Alias for frontend compatibility
    };

    return new Response(JSON.stringify(formattedApplication), { status: 200 });
  } catch (error) {
    console.error("Application fetch error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);

  // Check if user is admin (privilege level 1 or higher - HR can delete applications)
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 1
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  const { id } = await params;

  try {
    // Check if application exists
    const application = await appPrisma.applications.findUnique({
      where: { id },
    });

    if (!application) {
      return new Response(
        JSON.stringify({ message: "Application not found" }),
        {
          status: 404,
        }
      );
    }

    // Delete the application
    await appPrisma.applications.delete({
      where: { id },
    });

    // Decrement application count for the job
    await appPrisma.jobs.update({
      where: { id: application.jobId },
      data: {
        applicationCount: {
          decrement: 1,
        },
      },
    });

    return new Response(
      JSON.stringify({ message: "Application deleted successfully" }),
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Application deletion error:", error);

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
