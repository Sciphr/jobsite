// app/lib/permissions.js
import { appPrisma } from "./prisma";

/**
 * Get all permissions for a user by their ID
 * @param {string} userId - The user's ID
 * @returns {Promise<Array>} Array of user's permissions
 */
export async function getUserPermissions(userId) {
  try {
    const user = await appPrisma.users.findUnique({
      where: { id: userId },
      include: {
        userRole: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.userRole) {
      return [];
    }

    // Extract permissions from the role
    const permissions = user.userRole.rolePermissions.map((rp) => ({
      id: rp.permission.id,
      resource: rp.permission.resource,
      action: rp.permission.action,
      description: rp.permission.description,
      category: rp.permission.category,
    }));

    return permissions;
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    return [];
  }
}

/**
 * Check if a user has a specific permission
 * @param {string} userId - The user's ID
 * @param {string} resource - The resource (e.g., 'jobs', 'applications')
 * @param {string} action - The action (e.g., 'view', 'create', 'edit', 'delete')
 * @returns {Promise<boolean>} Whether the user has the permission
 */
export async function userHasPermission(userId, resource, action) {
  try {
    const count = await appPrisma.rolePermission.count({
      where: {
        role: {
          users: {
            some: {
              id: userId,
            },
          },
        },
        permission: {
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
 * Check multiple permissions at once
 * @param {string} userId - The user's ID
 * @param {Array} permissionChecks - Array of {resource, action} objects
 * @returns {Promise<Object>} Object with permission results
 */
export async function userHasPermissions(userId, permissionChecks) {
  try {
    const results = {};

    for (const check of permissionChecks) {
      const key = `${check.resource}:${check.action}`;
      results[key] = await userHasPermission(
        userId,
        check.resource,
        check.action
      );
    }

    return results;
  } catch (error) {
    console.error("Error checking multiple permissions:", error);
    return {};
  }
}

/**
 * Get user's role information
 * @param {string} userId - The user's ID
 * @returns {Promise<Object|null>} User's role information
 */
export async function getUserRole(userId) {
  try {
    const user = await appPrisma.users.findUnique({
      where: { id: userId },
      include: {
        userRole: true,
      },
    });

    return user?.userRole || null;
  } catch (error) {
    console.error("Error fetching user role:", error);
    return null;
  }
}

/**
 * Check if user has any permission for a resource (useful for showing/hiding sections)
 * @param {string} userId - The user's ID
 * @param {string} resource - The resource to check
 * @returns {Promise<boolean>} Whether user has any permission for the resource
 */
export async function userHasAnyPermissionForResource(userId, resource) {
  try {
    const count = await appPrisma.rolePermission.count({
      where: {
        role: {
          users: {
            some: {
              id: userId,
            },
          },
        },
        permission: {
          resource: resource,
        },
      },
    });

    return count > 0;
  } catch (error) {
    console.error("Error checking resource permissions:", error);
    return false;
  }
}

/**
 * Constants for resources and actions
 */
export const RESOURCES = {
  JOBS: "jobs",
  APPLICATIONS: "applications",
  USERS: "users",
  INTERVIEWS: "interviews",
  ANALYTICS: "analytics",
  SETTINGS: "settings",
  EMAILS: "emails",
  WEEKLY_DIGEST: "weekly_digest",
  AUDIT_LOGS: "audit_logs",
  ROLES: "roles",
};

export const ACTIONS = {
  VIEW: "view",
  CREATE: "create",
  EDIT: "edit",
  DELETE: "delete",
  PUBLISH: "publish",
  FEATURE: "feature",
  CLONE: "clone",
  EXPORT: "export",
  STATUS_CHANGE: "status_change",
  ASSIGN: "assign",
  NOTES: "notes",
  BULK_ACTIONS: "bulk_actions",
  IMPERSONATE: "impersonate",
  ROLES: "roles",
  RESCHEDULE: "reschedule",
  CALENDAR: "calendar",
  ADVANCED: "advanced",
  EDIT_SYSTEM: "edit_system",
  EDIT_BRANDING: "edit_branding",
  EDIT_NOTIFICATIONS: "edit_notifications",
  INTEGRATIONS: "integrations",
  SEND: "send",
  TEMPLATES: "templates",
  AUTOMATION: "automation",
};

/**
 * Helper function to create permission keys
 */
export const createPermissionKey = (resource, action) =>
  `${resource}:${action}`;

/**
 * Batch permission checker for better performance
 * @param {string} userId - The user's ID
 * @param {Array} permissions - Array of permission objects {resource, action}
 * @returns {Promise<Set>} Set of permission keys the user has
 */
export async function getUserPermissionSet(userId) {
  try {
    const permissions = await getUserPermissions(userId);
    const permissionSet = new Set();

    permissions.forEach((permission) => {
      permissionSet.add(
        createPermissionKey(permission.resource, permission.action)
      );
    });

    return permissionSet;
  } catch (error) {
    console.error("Error creating permission set:", error);
    return new Set();
  }
}
