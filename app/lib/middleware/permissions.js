// app/lib/middleware/permissions.js
import { userHasPermission, userHasPermissions } from "@/app/lib/permissions";
import { NextResponse } from "next/server";

/**
 * Middleware to require specific permission for API routes
 * @param {string} resource - The resource being accessed
 * @param {string} action - The action being performed
 * @returns {Function} Middleware function
 */
export function requirePermission(resource, action) {
  return async function permissionMiddleware(request, context, next) {
    try {
      // Import dynamically to avoid build-time execution
      const { getServerSession } = await import("next-auth/next");
      const { authOptions } = await import("@/app/api/auth/[...nextauth]/route");
      
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      const hasPermission = await userHasPermission(
        session.user.id,
        resource,
        action
      );

      if (!hasPermission) {
        return NextResponse.json(
          { 
            error: "Insufficient permissions",
            required: { resource, action }
          },
          { status: 403 }
        );
      }

      // Add user info to request for downstream handlers
      request.user = session.user;
      request.userPermissions = { resource, action };

      return next();
    } catch (error) {
      console.error("Permission middleware error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

/**
 * Middleware to require multiple permissions (AND logic)
 * @param {Array} permissionChecks - Array of {resource, action} objects
 * @returns {Function} Middleware function
 */
export function requirePermissions(permissionChecks) {
  return async function permissionsMiddleware(request, context, next) {
    try {
      // Import dynamically to avoid build-time execution
      const { getServerSession } = await import("next-auth/next");
      const { authOptions } = await import("@/app/api/auth/[...nextauth]/route");
      
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      const permissionResults = await userHasPermissions(
        session.user.id,
        permissionChecks
      );

      const missingPermissions = [];
      for (const check of permissionChecks) {
        const key = `${check.resource}:${check.action}`;
        if (!permissionResults[key]) {
          missingPermissions.push(check);
        }
      }

      if (missingPermissions.length > 0) {
        return NextResponse.json(
          { 
            error: "Insufficient permissions",
            missing: missingPermissions
          },
          { status: 403 }
        );
      }

      request.user = session.user;
      request.userPermissions = permissionResults;

      return next();
    } catch (error) {
      console.error("Permissions middleware error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

/**
 * Middleware to require ANY of the specified permissions (OR logic)
 * @param {Array} permissionChecks - Array of {resource, action} objects
 * @returns {Function} Middleware function
 */
export function requireAnyPermission(permissionChecks) {
  return async function anyPermissionMiddleware(request, context, next) {
    try {
      // Import dynamically to avoid build-time execution
      const { getServerSession } = await import("next-auth/next");
      const { authOptions } = await import("@/app/api/auth/[...nextauth]/route");
      
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      const permissionResults = await userHasPermissions(
        session.user.id,
        permissionChecks
      );

      const hasAnyPermission = Object.values(permissionResults).some(Boolean);

      if (!hasAnyPermission) {
        return NextResponse.json(
          { 
            error: "Insufficient permissions",
            required: "At least one of these permissions",
            options: permissionChecks
          },
          { status: 403 }
        );
      }

      request.user = session.user;
      request.userPermissions = permissionResults;

      return next();
    } catch (error) {
      console.error("Any permission middleware error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

/**
 * Simple wrapper for API routes that need permission checking
 * Usage: export const GET = withPermission('jobs', 'view', async (request) => { ... });
 */
export function withPermission(resource, action, handler) {
  return async function permissionWrappedHandler(request, context) {
    try {
      // Import getServerSession dynamically to avoid build-time execution
      const { getServerSession } = await import("next-auth/next");
      const { authOptions } = await import("@/app/api/auth/[...nextauth]/route");
      
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      const hasPermission = await userHasPermission(
        session.user.id,
        resource,
        action
      );

      if (!hasPermission) {
        return NextResponse.json(
          { 
            error: "Insufficient permissions",
            required: { resource, action }
          },
          { status: 403 }
        );
      }

      // Add user to request context
      const enhancedRequest = {
        ...request,
        user: session.user,
        userHasPermission: async (r, a) => userHasPermission(session.user.id, r, a)
      };

      return handler(enhancedRequest, context);
    } catch (error) {
      console.error("Permission wrapper error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

/**
 * Utility to check permissions in API route handlers
 */
export async function checkPermissionInHandler(request, resource, action) {
  // Import dynamically to avoid build-time execution
  const { getServerSession } = await import("next-auth/next");
  const { authOptions } = await import("@/app/api/auth/[...nextauth]/route");
  
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error("No authenticated user");
  }

  const hasPermission = await userHasPermission(
    session.user.id,
    resource,
    action
  );

  if (!hasPermission) {
    throw new Error(`Insufficient permissions: ${resource}:${action}`);
  }

  return true;
}

/**
 * Get user's permission set for use in API handlers
 */
export async function getUserPermissionSetInHandler(request) {
  // Import dynamically to avoid build-time execution
  const { getServerSession } = await import("next-auth/next");
  const { authOptions } = await import("@/app/api/auth/[...nextauth]/route");
  
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error("No authenticated user");
  }

  const { getUserPermissionSet } = await import("@/app/lib/permissions");
  return getUserPermissionSet(session.user.id);
}