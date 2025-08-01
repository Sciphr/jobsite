// app/api/auth/refresh/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/route";
import { logAuditEvent } from "../../../../lib/auditMiddleware";
import { extractRequestContext } from "../../../lib/auditLog";

export async function POST(request) {
  const requestContext = extractRequestContext(request);
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      // Log failed session refresh - not authenticated
      await logAuditEvent({
        eventType: "ERROR",
        category: "SECURITY",
        action: "Failed session refresh - not authenticated",
        description: "Session refresh attempt failed because user is not authenticated",
        actorType: "user",
        actorName: "unauthenticated",
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        severity: "warning",
        status: "failure",
        tags: ["authentication", "session_refresh", "failed", "unauthenticated"]
      }, request).catch(console.error);

      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // This endpoint is mainly used to trigger NextAuth to refresh the session
    // The actual refresh logic happens in the JWT callback
    
    // Log successful session refresh
    await logAuditEvent({
      eventType: "UPDATE",
      category: "USER",
      action: "Session refreshed successfully",
      description: `Session refresh triggered for user: ${session.user.email || session.user.name}`,
      entityType: "user",
      entityId: session.user.id,
      entityName: session.user.email || session.user.name,
      actorId: session.user.id,
      actorType: "user",
      actorName: session.user.name || session.user.email,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      relatedUserId: session.user.id,
      severity: "info",
      status: "success",
      tags: ["authentication", "session_refresh", "success"],
      metadata: {
        userId: session.user.id,
        userRole: session.user.role,
        privilegeLevel: session.user.privilegeLevel
      }
    }, request).catch(console.error);
    
    return NextResponse.json({ 
      success: true, 
      message: "Session refresh triggered",
      userId: session.user.id
    });
  } catch (error) {
    console.error("Session refresh error:", error);
    
    // Log server error during session refresh
    await logAuditEvent({
      eventType: "ERROR",
      category: "USER",
      action: "Session refresh failed - server error",
      description: `Session refresh failed due to server error: ${error.message}`,
      actorType: "user",
      actorName: "unknown",
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      severity: "error",
      status: "failure",
      tags: ["authentication", "session_refresh", "failed", "server_error"],
      metadata: {
        error: error.message,
        stack: error.stack
      }
    }, request).catch(console.error);

    return NextResponse.json({ error: "Failed to refresh session" }, { status: 500 });
  }
}