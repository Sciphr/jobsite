import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";
import { logAuditEvent } from "../../../../lib/auditMiddleware";
import { extractRequestContext } from "../../../lib/auditLog";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  const requestContext = extractRequestContext(request);

  if (!session) {
    // Log unauthorized multiple application check attempt
    await logAuditEvent({
      eventType: "ERROR",
      category: "SECURITY",
      action: "Unauthorized multiple application check attempt",
      description: "Multiple application status check attempted without valid session",
      actorType: "anonymous",
      actorName: "Anonymous",
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      severity: "warning",
      status: "failure",
      tags: ["applications", "check_multiple", "unauthorized", "security"]
    }, request).catch(console.error);
    
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { jobIds } = await request.json();

    if (!jobIds || !Array.isArray(jobIds)) {
      // Log validation failure for multiple application check
      await logAuditEvent({
        eventType: "ERROR",
        category: "VALIDATION",
        action: "Multiple application check failed - invalid job IDs",
        description: `User ${session.user.email} attempted multiple application check with invalid job IDs array`,
        actorId: session.user.id,
        actorType: "user",
        actorName: session.user.name || session.user.email,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        relatedUserId: session.user.id,
        severity: "info",
        status: "failure",
        tags: ["applications", "check_multiple", "validation", "invalid_job_ids"],
        metadata: {
          providedJobIds: jobIds,
          isArray: Array.isArray(jobIds),
          userEmail: session.user.email
        }
      }, request).catch(console.error);
      
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

    // Log successful multiple application check
    await logAuditEvent({
      eventType: "VIEW",
      category: "APPLICATION",
      action: "Multiple application status checked",
      description: `User ${session.user.email} checked application status for ${jobIds.length} jobs (${applications.length} applications found)`,
      actorId: session.user.id,
      actorType: "user",
      actorName: session.user.name || session.user.email,
      entityType: "application",
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      relatedUserId: session.user.id,
      severity: "info",
      status: "success",
      tags: ["applications", "check_multiple", "status", "bulk_check"],
      metadata: {
        requestedJobCount: jobIds.length,
        foundApplicationCount: applications.length,
        requestedJobIds: jobIds,
        foundApplicationJobIds: applications.map(app => app.jobId),
        userEmail: session.user.email
      }
    }, request).catch(console.error);

    return Response.json(result);
  } catch (error) {
    console.error("Error checking multiple applications:", error);
    
    // Log server error during multiple application check
    await logAuditEvent({
      eventType: "ERROR",
      category: "SYSTEM",
      action: "Multiple application check failed - server error",
      description: `Server error during multiple application status check for user: ${session.user.email}`,
      actorId: session.user.id,
      actorType: "user",
      actorName: session.user.name || session.user.email,
      entityType: "application",
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      relatedUserId: session.user.id,
      severity: "error",
      status: "failure",
      tags: ["applications", "check_multiple", "server_error", "system"],
      metadata: {
        error: error.message,
        stack: error.stack,
        requestedJobIds: jobIds || null,
        userEmail: session.user.email
      }
    }, request).catch(console.error);
    
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}
