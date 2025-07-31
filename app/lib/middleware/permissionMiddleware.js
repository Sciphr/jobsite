// app/lib/middleware/permissionMiddleware.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { userHasPermission, getUserPermissions } from "../permissions";

/**
 * Higher-order function that creates middleware to check permissions for API routes
 * @param {string} resource - The resource being accessed (e.g., 'jobs', 'users')
 * @param {string} action - The action being performed (e.g., 'view', 'create', 'edit', 'delete')
 * @param {Object} options - Additional options
 * @param {boolean} options.requireAuth - Whether authentication is required (default: true)
 * @param {boolean} options.allowSelfAccess - Whether users can access their own data (default: false)
 * @param {Function} options.customCheck - Custom permission check function
 * @returns {Function} Middleware function
 */
export function requirePermission(resource, action, options = {}) {
  const {
    requireAuth = true,
    allowSelfAccess = false,
    customCheck = null
  } = options;

  return async function permissionMiddleware(request, context, next) {
    try {
      // Check authentication if required
      if (requireAuth) {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id) {
          return NextResponse.json(
            { error: "Authentication required" },
            { status: 401 }
          );
        }

        const userId = session.user.id;

        // If custom check is provided, use it
        if (customCheck) {
          const customResult = await customCheck(session, request, context);
          if (!customResult.allowed) {
            return NextResponse.json(
              { error: customResult.message || "Access denied" },
              { status: 403 }
            );
          }
        } else {
          // Standard permission check
          const hasPermission = await userHasPermission(userId, resource, action);
          
          if (!hasPermission) {
            // Check for self-access if allowed
            if (allowSelfAccess && context?.params) {
              const targetUserId = context.params.userId || context.params.id;
              if (targetUserId && targetUserId === userId) {
                // User is accessing their own data, allow it
                return next();
              }
            }

            return NextResponse.json(
              { 
                error: "Insufficient permissions",
                required: `${resource}:${action}`,
                message: `You need permission to ${action} ${resource}`
              },
              { status: 403 }
            );
          }
        }
      }

      // Permission check passed, continue to the actual handler
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
 * Middleware wrapper for API routes that need permission checking
 * @param {Function} handler - The actual API route handler
 * @param {string} resource - The resource being accessed
 * @param {string} action - The action being performed
 * @param {Object} options - Additional options
 * @returns {Function} Wrapped handler with permission checking
 */
export function withPermissions(handler, resource, action, options = {}) {
  return async function wrappedHandler(request, context) {
    const middleware = requirePermission(resource, action, options);
    
    // Create a next function that calls the original handler
    const next = () => handler(request, context);
    
    return middleware(request, context, next);
  };
}

/**
 * Check multiple permissions for a user
 * @param {string} userId - User ID
 * @param {Array} requiredPermissions - Array of {resource, action} objects
 * @param {boolean} requireAll - Whether all permissions are required (default: true)
 * @returns {Promise<Object>} Permission check result
 */
export async function checkMultiplePermissions(userId, requiredPermissions, requireAll = true) {
  try {
    const checks = await Promise.all(
      requiredPermissions.map(async ({ resource, action }) => ({
        resource,
        action,
        granted: await userHasPermission(userId, resource, action)
      }))
    );

    const granted = checks.filter(check => check.granted);
    const denied = checks.filter(check => !check.granted);

    const hasAccess = requireAll 
      ? denied.length === 0 
      : granted.length > 0;

    return {
      hasAccess,
      checks,
      granted,
      denied,
      summary: {
        total: checks.length,
        granted: granted.length,
        denied: denied.length
      }
    };
  } catch (error) {
    console.error("Error checking multiple permissions:", error);
    return {
      hasAccess: false,
      error: error.message
    };
  }
}

/**
 * Middleware specifically for admin routes
 * @param {number} minPrivilegeLevel - Minimum privilege level required (default: 1)
 * @returns {Function} Admin middleware function
 */
export function requireAdmin(minPrivilegeLevel = 1) {
  return async function adminMiddleware(request, context, next) {
    try {
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      const userPrivilegeLevel = session.user.privilegeLevel || 0;
      
      if (userPrivilegeLevel < minPrivilegeLevel) {
        return NextResponse.json(
          { 
            error: "Insufficient admin privileges",
            required: `Privilege level ${minPrivilegeLevel}`,
            current: userPrivilegeLevel
          },
          { status: 403 }
        );
      }

      return next();
    } catch (error) {
      console.error("Admin middleware error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

/**
 * Create a permission guard for protecting API endpoints
 * @param {Object} config - Permission configuration
 * @returns {Function} Permission guard function
 */
export function createPermissionGuard(config) {
  const {
    permissions = [],
    requireAll = true,
    allowSuperAdmin = true,
    customCheck = null,
    errorMessage = "Access denied"
  } = config;

  return async function permissionGuard(request, context, next) {
    try {
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      const userId = session.user.id;

      // Super admins bypass permission checks if allowed
      if (allowSuperAdmin && session.user.privilegeLevel >= 3) {
        return next();
      }

      // Custom check takes precedence
      if (customCheck) {
        const result = await customCheck(session, request, context);
        if (!result.allowed) {
          return NextResponse.json(
            { error: result.message || errorMessage },
            { status: 403 }
          );
        }
        return next();
      }

      // Standard permission checking
      if (permissions.length > 0) {
        const result = await checkMultiplePermissions(userId, permissions, requireAll);
        
        if (!result.hasAccess) {
          return NextResponse.json(
            { 
              error: errorMessage,
              requiredPermissions: permissions,
              deniedPermissions: result.denied,
              details: result.summary
            },
            { status: 403 }
          );
        }
      }

      return next();
    } catch (error) {
      console.error("Permission guard error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

/**
 * Helper function to get user session and basic validation
 * @param {Object} request - Next.js request object
 * @returns {Promise<Object>} Session object or error response
 */
export async function validateSession(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return {
        error: NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        )
      };
    }

    return { session };
  } catch (error) {
    console.error("Session validation error:", error);
    return {
      error: NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      )
    };
  }
}

/**
 * Enhanced permission check that includes context about why access was denied
 * @param {string} userId - User ID
 * @param {string} resource - Resource name
 * @param {string} action - Action name
 * @returns {Promise<Object>} Detailed permission result
 */
export async function checkPermissionWithContext(userId, resource, action) {
  try {
    const hasPermission = await userHasPermission(userId, resource, action);
    
    if (hasPermission) {
      return {
        allowed: true,
        resource,
        action,
        reason: "Permission granted"
      };
    }

    // Get user's actual permissions to provide helpful feedback
    const userPermissions = await getUserPermissions(userId);
    const resourcePermissions = userPermissions.filter(p => p.resource === resource);
    
    return {
      allowed: false,
      resource,
      action,
      reason: resourcePermissions.length === 0 
        ? `No permissions for resource '${resource}'`
        : `Missing '${action}' permission for '${resource}'`,
      availableActions: resourcePermissions.map(p => p.action),
      suggestion: resourcePermissions.length === 0
        ? `Contact an administrator to get access to ${resource}`
        : `You can ${resourcePermissions.map(p => p.action).join(', ')} ${resource}, but cannot ${action}`
    };
  } catch (error) {
    console.error("Error checking permission with context:", error);
    return {
      allowed: false,
      resource,
      action,
      reason: "Error checking permissions",
      error: error.message
    };
  }
}