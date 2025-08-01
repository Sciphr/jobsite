// app/api/profile/change-password/route.js
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";
import { logAuditEvent } from "../../../../lib/auditMiddleware";
import { extractRequestContext } from "../../../lib/auditLog";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  const requestContext = extractRequestContext(req);

  if (!session) {
    // Log unauthorized password change attempt
    await logAuditEvent({
      eventType: "ERROR",
      category: "SECURITY",
      action: "Unauthorized password change attempt",
      description: "Password change attempted without valid session",
      actorType: "user",
      actorName: "unauthenticated",
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      severity: "warning",
      status: "failure",
      tags: ["authentication", "password_change", "failed", "unauthorized"]
    }, req).catch(console.error);

    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const { currentPassword, newPassword } = await req.json();

    // Validation
    if (!currentPassword) {
      // Log validation failure
      await logAuditEvent({
        eventType: "ERROR",
        category: "USER",
        action: "Password change failed - missing current password",
        description: `Password change validation failed for user: ${session.user.email}`,
        entityType: "user",
        entityId: session.user.id,
        entityName: session.user.email,
        actorId: session.user.id,
        actorType: "user",
        actorName: session.user.name || session.user.email,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        relatedUserId: session.user.id,
        severity: "warning",
        status: "failure",
        tags: ["password_change", "validation", "failed", "missing_field"]
      }, req).catch(console.error);

      return new Response(
        JSON.stringify({
          message: "Current password is required",
          field: "currentPassword",
        }),
        { status: 400 }
      );
    }

    if (!newPassword) {
      // Log validation failure
      await logAuditEvent({
        eventType: "ERROR",
        category: "USER",
        action: "Password change failed - missing new password",
        description: `Password change validation failed for user: ${session.user.email}`,
        entityType: "user",
        entityId: session.user.id,
        entityName: session.user.email,
        actorId: session.user.id,
        actorType: "user",
        actorName: session.user.name || session.user.email,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        relatedUserId: session.user.id,
        severity: "warning",
        status: "failure",
        tags: ["password_change", "validation", "failed", "missing_field"]
      }, req).catch(console.error);

      return new Response(
        JSON.stringify({
          message: "New password is required",
          field: "newPassword",
        }),
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      // Log password policy violation
      await logAuditEvent({
        eventType: "ERROR",
        category: "SECURITY",
        action: "Password change failed - policy violation",
        description: `Password change failed due to weak password policy for user: ${session.user.email}`,
        entityType: "user",
        entityId: session.user.id,
        entityName: session.user.email,
        actorId: session.user.id,
        actorType: "user",
        actorName: session.user.name || session.user.email,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        relatedUserId: session.user.id,
        severity: "warning",
        status: "failure",
        tags: ["password_change", "policy_violation", "failed", "weak_password"],
        metadata: {
          passwordLength: newPassword.length,
          minimumRequired: 6
        }
      }, req).catch(console.error);

      return new Response(
        JSON.stringify({
          message: "Password must be at least 6 characters",
          field: "newPassword",
        }),
        { status: 400 }
      );
    }

    // Get user from database
    const user = await appPrisma.users.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      // Log user not found error
      await logAuditEvent({
        eventType: "ERROR",
        category: "SECURITY",
        action: "Password change failed - user not found",
        description: `Password change attempted for non-existent user ID: ${session.user.id}`,
        entityType: "user",
        entityId: session.user.id,
        actorId: session.user.id,
        actorType: "user",
        actorName: session.user.email,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        severity: "error",
        status: "failure",
        tags: ["password_change", "failed", "user_not_found", "data_integrity"]
      }, req).catch(console.error);

      return new Response(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      // Log incorrect current password attempt
      await logAuditEvent({
        eventType: "ERROR",
        category: "SECURITY",
        action: "Password change failed - incorrect current password",
        description: `Password change failed due to incorrect current password for user: ${session.user.email}`,
        entityType: "user",
        entityId: session.user.id,
        entityName: session.user.email,
        actorId: session.user.id,
        actorType: "user",
        actorName: session.user.name || session.user.email,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        relatedUserId: session.user.id,
        severity: "warning",
        status: "failure",
        tags: ["password_change", "failed", "incorrect_password", "authentication"]
      }, req).catch(console.error);

      return new Response(
        JSON.stringify({
          message: "Current password is incorrect",
          field: "currentPassword",
        }),
        { status: 400 }
      );
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    if (isSamePassword) {
      // Log attempt to use same password
      await logAuditEvent({
        eventType: "ERROR",
        category: "USER",
        action: "Password change failed - same password",
        description: `Password change failed because new password is same as current for user: ${session.user.email}`,
        entityType: "user",
        entityId: session.user.id,
        entityName: session.user.email,
        actorId: session.user.id,
        actorType: "user",
        actorName: session.user.name || session.user.email,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        relatedUserId: session.user.id,
        severity: "info",
        status: "failure",
        tags: ["password_change", "failed", "same_password", "policy"]
      }, req).catch(console.error);

      return new Response(
        JSON.stringify({
          message: "New password must be different from current password",
          field: "newPassword",
        }),
        { status: 400 }
      );
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password in database
    await appPrisma.users.update({
      where: { id: session.user.id },
      data: {
        password: hashedNewPassword,
        updatedAt: new Date(),
      },
    });

    // Log successful password change
    await logAuditEvent({
      eventType: "UPDATE",
      category: "USER",
      subcategory: "PASSWORD_CHANGE",
      action: "Password changed successfully",
      description: `User successfully changed their password: ${session.user.email}`,
      entityType: "user",
      entityId: session.user.id,
      entityName: session.user.email,
      actorId: session.user.id,
      actorType: "user",
      actorName: session.user.name || session.user.email,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      relatedUserId: session.user.id,
      severity: "info",
      status: "success",
      tags: ["password_change", "success", "security", "authentication"],
      metadata: {
        userId: session.user.id,
        userEmail: session.user.email,
        changeTimestamp: new Date().toISOString()
      }
    }, req).catch(console.error);

    return new Response(
      JSON.stringify({ message: "Password changed successfully" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Password change error:", error);
    
    // Log server error during password change
    await logAuditEvent({
      eventType: "ERROR",
      category: "SYSTEM",
      action: "Password change failed - server error",
      description: `Password change failed due to server error for user: ${session?.user?.email || 'unknown'}`,
      entityType: "user",
      entityId: session?.user?.id,
      entityName: session?.user?.email,
      actorId: session?.user?.id,
      actorType: "user",
      actorName: session?.user?.name || session?.user?.email,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
      relatedUserId: session?.user?.id,
      severity: "error",
      status: "failure",
      tags: ["password_change", "failed", "server_error", "system"],
      metadata: {
        error: error.message,
        stack: error.stack,
        userId: session?.user?.id
      }
    }, req).catch(console.error);

    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
