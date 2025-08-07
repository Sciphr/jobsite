// app/lib/middleware/apiProtection.js
import { NextResponse } from "next/server";
import { userHasPermission } from "../permissions";

/**
 * Simple function to protect API routes with permission checking
 * Usage: const result = await protectRoute(resource, action, options);
 * if (result.error) return result.error;
 * const { session } = result;
 */
export async function protectRoute(resource, action, options = {}) {
  const {
    allowSelfAccess = false,
    targetUserIdParam = 'userId', // which param contains the target user ID
    minPrivilegeLevel = null,
    customCheck = null
  } = options;

  try {
    // Get session - import dynamically to avoid build-time execution
    const { getServerSession } = await import("next-auth/next");
    const { authOptions } = await import("@/app/api/auth/[...nextauth]/route");
    const session = await getServerSession(authOptions);
    
    // Debug logging for ngrok issues
    if (process.env.NODE_ENV === "development") {
      console.log("protectRoute debug:", {
        hasSession: !!session,
        userId: session?.user?.id,
        userAgent: process.env.NEXTAUTH_URL?.includes("ngrok") ? "ngrok" : "local"
      });
    }
    
    if (!session?.user?.id) {
      return {
        error: NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        )
      };
    }

    const userId = session.user.id;

    // Check minimum privilege level if specified
    if (minPrivilegeLevel !== null && (session.user.privilegeLevel || 0) < minPrivilegeLevel) {
      return {
        error: NextResponse.json(
          { 
            error: "Insufficient admin privileges",
            required: `Privilege level ${minPrivilegeLevel}`,
            current: session.user.privilegeLevel || 0
          },
          { status: 403 }
        )
      };
    }

    // TODO: Implement proper system admin concept
    // For now, disable super admin bypass to test permission system
    // if (session.user.privilegeLevel >= 3) {
    //   return { session };
    // }

    // Custom check
    if (customCheck) {
      const customResult = await customCheck(session);
      if (!customResult.allowed) {
        return {
          error: NextResponse.json(
            { error: customResult.message || "Access denied" },
            { status: 403 }
          )
        };
      }
      return { session };
    }

    // Check permission
    const hasPermission = await userHasPermission(userId, resource, action);
    
    if (!hasPermission) {
      return {
        error: NextResponse.json(
          { 
            error: "Insufficient permissions",
            required: `${resource}:${action}`,
            message: `You need permission to ${action} ${resource}`
          },
          { status: 403 }
        )
      };
    }

    return { session };
  } catch (error) {
    console.error("Route protection error:", error);
    return {
      error: NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      )
    };
  }
}

/**
 * Check if user can access specific user's data (for self-access scenarios)
 */
export function canAccessUserData(session, targetUserId, requiredPermission = null) {
  // User can always access their own data
  if (session.user.id === targetUserId) {
    return true;
  }

  // TODO: Implement proper system admin concept
  // For now, disable super admin bypass to test permission system  
  // if (session.user.privilegeLevel >= 3) {
  //   return true;
  // }

  // If a specific permission is required, that would be checked separately
  return false;
}

/**
 * Quick admin route protection (requires privilege level 1+)
 */
export async function protectAdminRoute(minLevel = 1) {
  const { getServerSession } = await import("next-auth/next");
  const { authOptions } = await import("@/app/api/auth/[...nextauth]/route");
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return {
      error: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    };
  }

  if ((session.user.privilegeLevel || 0) < minLevel) {
    return {
      error: NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    };
  }

  return { session };
}

/**
 * Validate request and extract common parameters
 */
export async function validateRequest(request, requiredParams = []) {
  try {
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams);
    
    // Check for missing required parameters
    const missing = requiredParams.filter(param => !searchParams[param]);
    if (missing.length > 0) {
      return {
        error: NextResponse.json(
          { error: `Missing required parameters: ${missing.join(', ')}` },
          { status: 400 }
        )
      };
    }

    return { searchParams };
  } catch (error) {
    return {
      error: NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      )
    };
  }
}

/**
 * Helper for JSON body validation
 */
export async function validateJsonBody(request, requiredFields = []) {
  try {
    const body = await request.json();
    
    const missing = requiredFields.filter(field => body[field] === undefined);
    if (missing.length > 0) {
      return {
        error: NextResponse.json(
          { error: `Missing required fields: ${missing.join(', ')}` },
          { status: 400 }
        )
      };
    }

    return { body };
  } catch (error) {
    return {
      error: NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      )
    };
  }
}