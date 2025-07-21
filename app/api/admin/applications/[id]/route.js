import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { appPrisma } from "../../../../lib/prisma";
import { auditApplication, extractRequestContext } from "../../../../lib/auditLog";
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
    const currentApplication = await appPrisma.application.findUnique({
      where: { id },
      include: {
        job: { select: { id: true, title: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });

    if (!currentApplication) {
      return new Response(JSON.stringify({ message: "Application not found" }), {
        status: 404,
      });
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

    // Create audit logs for the changes
    const applicantName = updatedApplication.name || 
      (updatedApplication.user ? `${updatedApplication.user.firstName} ${updatedApplication.user.lastName}`.trim() : 'Unknown');
    const actorName = `${session.user.firstName} ${session.user.lastName}`.trim() || session.user.email;

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
        
        console.log(`🤖 Email automation processed: ${automationResult.triggered}/${automationResult.processed} rules triggered`);
      } catch (automationError) {
        console.error('Error in email automation:', automationError);
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

  const { id } = await params;

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
    const application = await appPrisma.application.findUnique({
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
    await appPrisma.application.delete({
      where: { id },
    });

    // Decrement application count for the job
    await appPrisma.job.update({
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
