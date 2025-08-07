// app/lib/permissions.js
import { appPrisma } from "./prisma";

// Constants for permission checking
export const RESOURCES = {
  JOBS: "jobs",
  APPLICATIONS: "applications", 
  USERS: "users",
  ROLES: "roles",
  INTERVIEWS: "interviews",
  ANALYTICS: "analytics",
  SETTINGS: "settings",
  AUDIT_LOGS: "audit_logs",
  EMAIL_CAMPAIGNS: "email_campaigns",
  WEEKLY_DIGEST: "weekly_digest"
};

export const ACTIONS = {
  VIEW: "view",
  CREATE: "create", 
  EDIT: "edit",
  DELETE: "delete",
  PUBLISH: "publish",
  EXPORT: "export",
  ASSIGN: "assign",
  BULK_ACTIONS: "bulk_actions",
  FEATURE: "feature",
  APPROVE_HIRE: "approve_hire"
};

/**
 * Create a permission key from resource and action
 * @param {string} resource - The resource name
 * @param {string} action - The action name  
 * @returns {string} Permission key in format "resource:action"
 */
export function createPermissionKey(resource, action) {
  return `${resource}:${action}`;
}

/**
 * Get all permissions for a user by their ID (supports multiple roles)
 * @param {string} userId - The user's ID
 * @returns {Promise<Array>} Array of user's permissions
 */
export async function getUserPermissions(userId) {
  try {
    const user = await appPrisma.users.findUnique({
      where: { id: userId },
      include: {
        user_roles: {
          where: { is_active: true },
          include: {
            roles: {
              include: {
                role_permissions: {
                  include: {
                    permissions: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return [];
    }

    // Super admins have all permissions
    if (user.privilegeLevel >= 3) {
      // Get all available permissions for super admins
      const allPermissions = await appPrisma.permissions.findMany({
        select: {
          id: true,
          resource: true,
          action: true,
          description: true,
          category: true,
        },
      });
      return allPermissions;
    }

    if (!user.user_roles || user.user_roles.length === 0) {
      return [];
    }

    // Collect permissions from all active roles (remove duplicates)
    const permissionsMap = new Map();
    
    user.user_roles.forEach((userRole) => {
      if (userRole.roles && userRole.roles.role_permissions) {
        userRole.roles.role_permissions.forEach((rp) => {
          const permission = rp.permissions;
          const key = `${permission.resource}:${permission.action}`;
          
          if (!permissionsMap.has(key)) {
            permissionsMap.set(key, {
              id: permission.id,
              resource: permission.resource,
              action: permission.action,
              description: permission.description,
              category: permission.category,
            });
          }
        });
      }
    });

    return Array.from(permissionsMap.values());
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    return [];
  }
}

/**
 * Check if a user has a specific permission (supports multiple roles)
 * @param {string} userId - The user's ID
 * @param {string} resource - The resource (e.g., 'jobs', 'applications')
 * @param {string} action - The action (e.g., 'view', 'create', 'edit', 'delete')
 * @returns {Promise<boolean>} Whether the user has the permission
 */
export async function userHasPermission(userId, resource, action) {
  try {
    // First check if user is super admin (privilege level 3 or higher)
    const user = await appPrisma.users.findUnique({
      where: { id: userId },
      select: { privilegeLevel: true },
    });

    // Super admins have all permissions
    if (user && user.privilegeLevel >= 3) {
      return true;
    }

    // Check if user has the permission through any of their active roles
    const count = await appPrisma.role_permissions.count({
      where: {
        roles: {
          user_roles: {
            some: {
              user_id: userId,
              is_active: true,
            },
          },
        },
        permissions: {
          resource: resource,
          action: action,
        },
      },
    });

    return count > 0;
  } catch (error) {
    console.error("Error checking user permission:", error);
    return false;
  }
}

/**
 * Get detailed permission information for a user (for debugging/admin purposes)
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} Detailed permission info
 */
export async function getUserPermissionDetails(userId) {
  try {
    const user = await appPrisma.users.findUnique({
      where: { id: userId },
      include: {
        user_roles: {
          where: { is_active: true },
          include: {
            roles: {
              select: {
                id: true,
                name: true,
                description: true,
                is_system_role: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    const permissions = await getUserPermissions(userId);
    
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        privilegeLevel: user.privilegeLevel,
      },
      roles: user.user_roles.map(ur => ur.roles),
      permissions: permissions,
      isSuperAdmin: user.privilegeLevel >= 3,
    };
  } catch (error) {
    console.error("Error fetching user permission details:", error);
    return null;
  }
}

/**
 * Check if a user can manage roles (convenience function)
 * @param {string} userId - The user's ID
 * @returns {Promise<boolean>} Whether the user can manage roles
 */
export async function canManageRoles(userId) {
  return await userHasPermission(userId, "roles", "edit");
}

/**
 * Check if a user can manage users (convenience function)
 * @param {string} userId - The user's ID
 * @returns {Promise<boolean>} Whether the user can manage users
 */
export async function canManageUsers(userId) {
  return await userHasPermission(userId, "users", "edit");
}

/**
 * Get user's roles (for backward compatibility with single role systems)
 * @param {string} userId - The user's ID
 * @returns {Promise<Object|null>} User's primary role or null
 * @deprecated Use getUserRoles() for multiple roles support
 */
export async function getUserRole(userId) {
  try {
    const user = await appPrisma.users.findUnique({
      where: { id: userId },
      include: {
        user_roles: {
          where: { is_active: true },
          include: {
            roles: {
              select: {
                id: true,
                name: true,
                color: true,
                description: true,
                is_system_role: true,
              },
            },
          },
          orderBy: { assigned_at: "asc" }, // Return the first assigned role as "primary"
        },
      },
    });

    if (!user || !user.user_roles || user.user_roles.length === 0) {
      return null;
    }

    // Return the first role as the "primary" role for backward compatibility
    return user.user_roles[0].roles;
  } catch (error) {
    console.error("Error fetching user role:", error);
    return null;
  }
}

/**
 * Get all user's roles (recommended for multiple roles support)
 * @param {string} userId - The user's ID
 * @returns {Promise<Array>} Array of user's roles
 */
export async function getUserRoles(userId) {
  try {
    const user = await appPrisma.users.findUnique({
      where: { id: userId },
      include: {
        user_roles: {
          where: { is_active: true },
          include: {
            roles: {
              select: {
                id: true,
                name: true,
                color: true,
                description: true,
                is_system_role: true,
              },
            },
          },
          orderBy: { assigned_at: "asc" },
        },
      },
    });

    if (!user || !user.user_roles) {
      return [];
    }

    return user.user_roles.map(ur => ur.roles);
  } catch (error) {
    console.error("Error fetching user roles:", error);
    return [];
  }
}

/**
 * Ensure user has the default "User" role if they have no other roles
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} Result with success status and message
 */
export async function ensureUserHasDefaultRole(userId) {
  try {
    // Find the default "User" system role
    const defaultRole = await appPrisma.roles.findFirst({
      where: {
        name: "User",
        is_system_role: true,
        is_active: true,
      },
    });

    if (!defaultRole) {
      throw new Error("Default 'User' role not found. System roles may not be properly configured.");
    }

    // Check if user already has this role (active)
    const existingActiveAssignment = await appPrisma.user_roles.findFirst({
      where: {
        user_id: userId,
        role_id: defaultRole.id,
        is_active: true,
      },
    });

    if (existingActiveAssignment) {
      return {
        success: true,
        message: "User already has default role",
        roleAssigned: false,
      };
    }

    // Check if there's an inactive assignment we can reactivate
    const existingInactiveAssignment = await appPrisma.user_roles.findFirst({
      where: {
        user_id: userId,
        role_id: defaultRole.id,
        is_active: false,
      },
    });

    if (existingInactiveAssignment) {
      // Reactivate existing inactive assignment
      await appPrisma.user_roles.update({
        where: { id: existingInactiveAssignment.id },
        data: {
          is_active: true,
          assigned_at: new Date(),
        },
      });
    } else {
      // Create new assignment if none exists
      await appPrisma.user_roles.create({
        data: {
          user_id: userId,
          role_id: defaultRole.id,
          is_active: true,
          assigned_at: new Date(),
        },
      });
    }

    return {
      success: true,
      message: `User automatically assigned to default '${defaultRole.name}' role`,
      roleAssigned: true,
      defaultRole,
    };
  } catch (error) {
    console.error("Error ensuring user has default role:", error);
    return {
      success: false,
      message: error.message,
      roleAssigned: false,
    };
  }
}

/**
 * Check if removing a role would leave user with no roles
 * @param {string} userId - The user's ID
 * @param {string} roleIdToRemove - The role ID being removed
 * @returns {Promise<boolean>} True if this would be the user's last role
 */
export async function wouldBeLastRole(userId, roleIdToRemove) {
  try {
    const activeRoles = await appPrisma.user_roles.count({
      where: {
        user_id: userId,
        is_active: true,
        role_id: { not: roleIdToRemove },
      },
    });

    return activeRoles === 0;
  } catch (error) {
    console.error("Error checking if would be last role:", error);
    return false;
  }
}

/**
 * Middleware function to ensure a user has at least one role
 * @param {string} userId - The user's ID
 * @returns {Promise<boolean>} True if user has at least one role (after ensuring)
 */
export async function ensureUserHasAtLeastOneRole(userId) {
  try {
    // Check if user has any active roles
    const activeRoleCount = await appPrisma.user_roles.count({
      where: {
        user_id: userId,
        is_active: true,
      },
    });

    if (activeRoleCount === 0) {
      console.log(`🔧 User ${userId} has no roles, applying default role fallback`);
      const result = await ensureUserHasDefaultRole(userId);
      return result.success;
    }

    return true;
  } catch (error) {
    console.error("Error ensuring user has at least one role:", error);
    return false;
  }
}

/**
 * Get all users with their roles and permissions (admin function)
 * @returns {Promise<Array>} Array of users with role information
 */
export async function getAllUsersWithRoles() {
  try {
    const users = await appPrisma.users.findMany({
      include: {
        user_roles: {
          where: { is_active: true },
          include: {
            roles: {
              select: {
                id: true,
                name: true,
                color: true,
                is_system_role: true,
              },
            },
          },
        },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }, { email: "asc" }],
    });

    return users.map(user => ({
      ...user,
      roleNames: user.user_roles.map(ur => ur.roles.name),
      primaryRole: user.user_roles[0]?.roles || null,
    }));
  } catch (error) {
    console.error("Error fetching users with roles:", error);
    return [];
  }
}