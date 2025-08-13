// lib/auth.js
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";

export const PRIVILEGE_LEVELS = {
  USER: 0,
  HR: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

export const ROLES = {
  USER: "user",
  HR: "hr",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
};

/**
 * Check if user has required privilege level
 */
export function hasPrivilege(userPrivilegeLevel, requiredLevel) {
  return userPrivilegeLevel >= requiredLevel;
}

/**
 * Check if user has required role
 */
export function hasRole(userRole, requiredRole) {
  return userRole === requiredRole;
}

/**
 * Middleware to check admin access
 */
export async function requireAdmin(
  req,
  minPrivilegeLevel = PRIVILEGE_LEVELS.HR
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return {
      error: "Unauthorized",
      status: 401,
    };
  }

  const userPrivilegeLevel = session.user.privilegeLevel || 0;
  const userRole = session.user.role || "user";

  if (!hasPrivilege(userPrivilegeLevel, minPrivilegeLevel)) {
    return {
      error: "Insufficient privileges",
      status: 403,
    };
  }

  return {
    user: session.user,
    privilegeLevel: userPrivilegeLevel,
    role: userRole,
  };
}

/**
 * Higher-order function to wrap API routes with admin checks
 */
export function withAdminAuth(
  handler,
  minPrivilegeLevel = PRIVILEGE_LEVELS.HR
) {
  return async function (req, ...args) {
    const authResult = await requireAdmin(req, minPrivilegeLevel);

    if (authResult.error) {
      // Debug log for now
      console.log("❌ Auth failed - User:", authResult.user?.email, "Required level:", minPrivilegeLevel, "User level:", authResult.user?.privilegeLevel, "Error:", authResult.error);
      return new Response(JSON.stringify({ message: authResult.error }), {
        status: authResult.status,
      });
    }

    // Add user info to request for handler to use
    req.user = authResult.user;
    req.privilegeLevel = authResult.privilegeLevel;
    req.role = authResult.role;

    return handler(req, ...args);
  };
}

/**
 * Client-side hook to check user privileges
 */
export function useAdminAuth() {
  const { data: session } = useSession();

  const isAdmin = session?.user?.privilegeLevel >= PRIVILEGE_LEVELS.HR;
  const isSuperAdmin =
    session?.user?.privilegeLevel >= PRIVILEGE_LEVELS.SUPER_ADMIN;
  const canManageJobs = session?.user?.privilegeLevel >= PRIVILEGE_LEVELS.ADMIN;
  const canViewApplications =
    session?.user?.privilegeLevel >= PRIVILEGE_LEVELS.HR;

  return {
    isAdmin,
    isSuperAdmin,
    canManageJobs,
    canViewApplications,
    privilegeLevel: session?.user?.privilegeLevel || 0,
    role: session?.user?.role || "user",
  };
}
