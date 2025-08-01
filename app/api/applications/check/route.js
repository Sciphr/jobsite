import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";
import { logAuditEvent } from "../../../../lib/auditMiddleware";
import { extractRequestContext } from "../../../lib/auditLog";

export async function GET(request) {
  const session = await getServerSession(authOptions);
  const requestContext = extractRequestContext(request);

  if (!session) {
    // Log unauthorized application check attempt
    await logAuditEvent({
      eventType: "ERROR",
      category: "SECURITY",
      action: "Unauthorized application check attempt",
      description: "Application status check attempted without valid session",
      actorType: "anonymous",
      actorName: "Anonymous",
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      severity: "warning",
      status: "failure",
      tags: ["applications", "check", "unauthorized", "security"]
    }, request).catch(console.error);
    
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    // Log validation failure for application check
    await logAuditEvent({
      eventType: "ERROR",
      category: "VALIDATION",
      action: "Application check failed - missing job ID",
      description: `User ${session.user.email} attempted to check application status without providing job ID`,
      actorId: session.user.id,
      actorType: "user",
      actorName: session.user.name || session.user.email,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      relatedUserId: session.user.id,
      severity: "info",
      status: "failure",
      tags: ["applications", "check", "validation", "missing_job_id"]
    }, request).catch(console.error);
    
    return Response.json({ message: "Job ID is required" }, { status: 400 });
  }

  try {
    const application = await appPrisma.applications.findUnique({
      where: {
        userId_jobId: {
          userId: session.user.id,
          jobId: jobId,
        },
      },
    });

    // Log successful application check
    await logAuditEvent({
      eventType: "VIEW",
      category: "APPLICATION",
      action: "Application status checked",
      description: `User ${session.user.email} checked application status for job ${jobId}: ${application ? 'applied' : 'not applied'}`,
      actorId: session.user.id,
      actorType: "user",
      actorName: session.user.name || session.user.email,
      entityType: "application",
      entityId: application?.id || null,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      relatedUserId: session.user.id,
      relatedJobId: jobId,
      relatedApplicationId: application?.id || null,
      severity: "info",
      status: "success",
      tags: ["applications", "check", "status", application ? "applied" : "not_applied"],
      metadata: {
        jobId: jobId,
        hasApplied: !!application,
        applicationId: application?.id || null,
        applicationStatus: application?.status || null,
        userEmail: session.user.email
      }
    }, request).catch(console.error);

    return Response.json({
      hasApplied: !!application,
      applicationId: application?.id || null,
      status: application?.status || null,
    });
  } catch (error) {
    console.error("Error checking application status:", error);
    
    // Log server error during application check
    await logAuditEvent({
      eventType: "ERROR",
      category: "SYSTEM",
      action: "Application check failed - server error",
      description: `Server error during application status check for user: ${session.user.email}`,
      actorId: session.user.id,
      actorType: "user",
      actorName: session.user.name || session.user.email,
      entityType: "application",
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      relatedUserId: session.user.id,
      relatedJobId: jobId,
      severity: "error",
      status: "failure",
      tags: ["applications", "check", "server_error", "system"],
      metadata: {
        error: error.message,
        stack: error.stack,
        jobId: jobId,
        userEmail: session.user.email
      }
    }, request).catch(console.error);
    
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}
