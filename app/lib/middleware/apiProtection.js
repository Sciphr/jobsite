// app/lib/middleware/apiProtection.js
import { NextResponse } from "next/server";
import { userHasPermission } from "../permissions";
import { validateAPIKey, hasAPIPermission } from "../apiKeyManager";

/**
 * Protect API routes with both session and API key authentication support
 * Checks for Authorization header first, then falls back to session authentication
 * Usage: const result = await protectAPIRoute(request, resource, action, options);
 * if (result.error) return result.error;
 * const { session, apiKeyData } = result;
 */
export async function protectAPIRoute(request, resource, action, options = {}) {
  const {
    allowSessionAuth = true,
    allowAPIKeyAuth = true,
    minPrivilegeLevel = null,
    customCheck = null
  } = options;

  try {
    // Check for API key authentication first
    if (allowAPIKeyAuth) {
      const authHeader = request.headers.get('authorization');
      
      console.log('API Key Debug:', { 
        hasAuthHeader: !!authHeader, 
        startsWithBearer: authHeader?.startsWith('Bearer '),
        headerValue: authHeader?.substring(0, 20) + '...' // Only log first 20 chars for security
      });
      
      if (authHeader?.startsWith('Bearer ')) {
        const apiKey = authHeader.substring(7);
        console.log('Validating API key:', apiKey.substring(0, 20) + '...');
        
        const apiKeyValidation = await validateAPIKey(apiKey);
        console.log('API key validation result:', { 
          valid: apiKeyValidation.valid, 
          error: apiKeyValidation.error,
          userId: apiKeyValidation.userId 
        });
        
        if (apiKeyValidation.valid) {
          // Check if API key has required permission
          const hasPermission = hasAPIPermission(apiKeyValidation, resource, action);
          console.log('Permission check:', { resource, action, hasPermission, permissions: apiKeyValidation.permissions });
          
          if (!hasPermission) {
            return {
              error: NextResponse.json(
                { 
                  error: "Insufficient API key permissions",
                  required: `${resource}:${action}`,
                  message: `Your API key doesn't have permission to ${action} ${resource}`
                },
                { status: 403 }
              )
            };
          }
          
          return { 
            apiKeyData: apiKeyValidation,
            authType: 'api_key'
          };
        } else {
          console.log('API key validation failed:', apiKeyValidation.error);
        }
      }
    }

    // Fall back to session authentication if no valid API key
    if (allowSessionAuth) {
      return await protectRoute(resource, action, options);
    }

    // Neither authentication method worked
    return {
      error: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    };
    
  } catch (error) {
    console.error("API route protection error:", error);
    return {
      error: NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      )
    };
  }
}

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

    // Super admin bypass - privilege level 3+ has all permissions
    if (session.user.privilegeLevel >= 3) {
      return { session };
    }

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