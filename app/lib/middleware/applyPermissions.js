// app/lib/middleware/applyPermissions.js
/**
 * Utility to apply permissions to existing API route handlers
 * This helps migrate existing endpoints to use permission-based access control
 */

import { protectRoute, protectAdminRoute } from "./apiProtection";

/**
 * Map of API endpoints to their required permissions
 * Format: { path: { method: { resource, action, options } } }
 */
export const API_PERMISSION_MAP = {
  // Users management
  "/api/admin/users": {
    GET: { resource: "users", action: "view" },
    POST: { resource: "users", action: "create" },
  },
  "/api/admin/users/[id]": {
    GET: { resource: "users", action: "view", options: { allowSelfAccess: true } },
    PATCH: { resource: "users", action: "edit", options: { allowSelfAccess: true } },
    DELETE: { resource: "users", action: "delete" },
  },

  // Jobs management
  "/api/admin/jobs": {
    GET: { resource: "jobs", action: "view" },
    POST: { resource: "jobs", action: "create" },
  },
  "/api/admin/jobs/[id]": {
    GET: { resource: "jobs", action: "view" },
    PATCH: { resource: "jobs", action: "edit" },
    DELETE: { resource: "jobs", action: "delete" },
  },

  // Applications management
  "/api/admin/applications": {
    GET: { resource: "applications", action: "view" },
  },
  "/api/admin/applications/[id]": {
    GET: { resource: "applications", action: "view" },
    PATCH: { resource: "applications", action: "edit" },
    DELETE: { resource: "applications", action: "delete" },
  },

  // Roles management
  "/api/roles": {
    GET: { resource: "roles", action: "view" },
    POST: { resource: "roles", action: "create" },
  },
  "/api/roles/[id]": {
    GET: { resource: "roles", action: "view" },
    PATCH: { resource: "roles", action: "edit" },
    DELETE: { resource: "roles", action: "delete" },
  },

  // Analytics
  "/api/admin/analytics": {
    GET: { resource: "analytics", action: "view" },
  },

  // Settings
  "/api/admin/settings": {
    GET: { resource: "settings", action: "view" },
    PATCH: { resource: "settings", action: "edit_system" },
  },

  // Weekly Digest
  "/api/admin/weekly-digest/send": {
    POST: { resource: "weekly_digest", action: "send" },
  },
  "/api/admin/weekly-digest/preview": {
    POST: { resource: "weekly_digest", action: "view" },
  },

  // Audit Logs
  "/api/admin/audit-logs": {
    GET: { resource: "audit_logs", action: "view" },
  },
};

/**
 * Generate permission check code for a given endpoint
 * Useful for updating existing routes
 */
export function generatePermissionCode(path, method) {
  const permissionConfig = API_PERMISSION_MAP[path]?.[method];
  
  if (!permissionConfig) {
    return `// No specific permission required for ${method} ${path}`;
  }

  const { resource, action, options = {} } = permissionConfig;
  
  return `// Check if user has permission to ${action} ${resource}
const authResult = await protectRoute("${resource}", "${action}"${options ? `, ${JSON.stringify(options)}` : ''});
if (authResult.error) return authResult.error;

const { session } = authResult;`;
}

/**
 * Batch update utility - generates code for multiple endpoints
 */
export function generateBatchPermissionUpdates() {
  const updates = [];
  
  Object.entries(API_PERMISSION_MAP).forEach(([path, methods]) => {
    Object.entries(methods).forEach(([method, config]) => {
      updates.push({
        path,
        method,
        code: generatePermissionCode(path, method),
        config
      });
    });
  });
  
  return updates;
}

/**
 * Helper to check if an API path needs permission protection
 */
export function needsPermissionCheck(path, method) {
  return !!API_PERMISSION_MAP[path]?.[method];
}

/**
 * Get the required permission for a given endpoint
 */
export function getRequiredPermission(path, method) {
  return API_PERMISSION_MAP[path]?.[method];
}

/**
 * Quick helper for common admin route patterns
 */
export const ADMIN_ROUTE_PATTERNS = {
  // Routes that require admin privileges (level 1+)
  BASIC_ADMIN: [
    "/api/admin/dashboard-stats",
    "/api/admin/applications",
    "/api/admin/weekly-digest/preview",
  ],
  
  // Routes that require higher admin privileges (level 2+)
  ADVANCED_ADMIN: [
    "/api/admin/jobs",
    "/api/admin/analytics",
    "/api/admin/audit-logs",
  ],
  
  // Routes that require super admin privileges (level 3+)
  SUPER_ADMIN: [
    "/api/admin/users",
    "/api/admin/settings",
    "/api/roles",
  ],
};

/**
 * Generate permission middleware based on route patterns
 */
export function getRoutePermissionLevel(path) {
  if (ADMIN_ROUTE_PATTERNS.SUPER_ADMIN.some(pattern => path.includes(pattern))) {
    return 3;
  }
  if (ADMIN_ROUTE_PATTERNS.ADVANCED_ADMIN.some(pattern => path.includes(pattern))) {
    return 2;
  }
  if (ADMIN_ROUTE_PATTERNS.BASIC_ADMIN.some(pattern => path.includes(pattern))) {
    return 1;
  }
  return 0;
}

/**
 * Example of how to update an existing API route with permissions
 */
export const MIGRATION_EXAMPLES = {
  // Before: Hard-coded privilege level check
  before: `
export async function GET(req) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.privilegeLevel < 2) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }
  
  // ... rest of handler
}`,

  // After: Permission-based check
  after: `
import { protectRoute } from "../../../lib/middleware/apiProtection";

export async function GET(req) {
  // Check if user has permission to view jobs
  const authResult = await protectRoute("jobs", "view");
  if (authResult.error) return authResult.error;
  
  const { session } = authResult;
  
  // ... rest of handler
}`,
};

/**
 * Console helper to print permission status for debugging
 */
export function logPermissionStatus(userId, permissions) {
  console.log(`🔐 Permission Status for User ${userId}:`);
  
  Object.entries(API_PERMISSION_MAP).forEach(([path, methods]) => {
    console.log(`\n📁 ${path}:`);
    Object.entries(methods).forEach(([method, config]) => {
      const { resource, action } = config;
      const permissionKey = `${resource}:${action}`;
      const hasPermission = permissions.includes(permissionKey);
      const status = hasPermission ? "✅ ALLOWED" : "❌ DENIED";
      console.log(`  ${method}: ${status} (${permissionKey})`);
    });
  });
}