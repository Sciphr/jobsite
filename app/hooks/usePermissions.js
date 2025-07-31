// app/hooks/usePermissions.js
"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { RESOURCES, ACTIONS, createPermissionKey } from "@/app/lib/permissions";

/**
 * Custom hook for checking user permissions in React components
 * @returns {Object} Permission checking functions and user permissions
 */
export function usePermissions() {
  const { data: session } = useSession();
  const [permissions, setPermissions] = useState(new Set());
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load permissions from session when available, fallback to API
  useEffect(() => {
    async function loadPermissions() {
      if (!session?.user?.id) {
        setPermissions(new Set());
        setUserRole(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Check if permissions are available in session (from NextAuth)
        if (session.user.permissions && session.user.permissions.length > 0) {
          console.log("📦 Using permissions from session cache");
          const permissionSet = new Set(session.user.permissions);
          setPermissions(permissionSet);
          
          // Set primary role from session
          const primaryRole = session.user.roles && session.user.roles.length > 0 
            ? session.user.roles[0] 
            : null;
          setUserRole(primaryRole);
          
          setLoading(false);
          return;
        }

        // Fallback to API if permissions not in session
        console.log("🔄 Fetching permissions from API (session cache miss)");
        const [permissionsResponse, roleResponse] = await Promise.all([
          fetch(`/api/permissions/user/${session.user.id}`),
          fetch(`/api/permissions/user/${session.user.id}/role`)
        ]);

        if (permissionsResponse.ok) {
          const permissionsData = await permissionsResponse.json();
          const permissionSet = new Set();
          
          permissionsData.permissions.forEach(permission => {
            permissionSet.add(createPermissionKey(permission.resource, permission.action));
          });
          
          setPermissions(permissionSet);
        }

        if (roleResponse.ok) {
          const roleData = await roleResponse.json();
          setUserRole(roleData.role);
        }
      } catch (error) {
        console.error("Error loading permissions:", error);
        setPermissions(new Set());
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    }

    loadPermissions();
  }, [session?.user?.id, session?.user?.permissions, session?.user?.permissionsLastUpdated]);

  // Core permission checking function
  const hasPermission = useMemo(() => {
    return (resource, action) => {
      return permissions.has(createPermissionKey(resource, action));
    };
  }, [permissions]);

  // Convenience functions for common actions
  const can = useMemo(() => ({
    view: (resource) => hasPermission(resource, ACTIONS.VIEW),
    create: (resource) => hasPermission(resource, ACTIONS.CREATE),
    edit: (resource) => hasPermission(resource, ACTIONS.EDIT),
    delete: (resource) => hasPermission(resource, ACTIONS.DELETE),
    export: (resource) => hasPermission(resource, ACTIONS.EXPORT),
    
    // Job-specific permissions
    publishJobs: () => hasPermission(RESOURCES.JOBS, ACTIONS.PUBLISH),
    featureJobs: () => hasPermission(RESOURCES.JOBS, ACTIONS.FEATURE),
    cloneJobs: () => hasPermission(RESOURCES.JOBS, ACTIONS.CLONE),
    
    // Application-specific permissions
    changeApplicationStatus: () => hasPermission(RESOURCES.APPLICATIONS, ACTIONS.STATUS_CHANGE),
    assignApplications: () => hasPermission(RESOURCES.APPLICATIONS, ACTIONS.ASSIGN),
    addApplicationNotes: () => hasPermission(RESOURCES.APPLICATIONS, ACTIONS.NOTES),
    bulkEditApplications: () => hasPermission(RESOURCES.APPLICATIONS, ACTIONS.BULK_ACTIONS),
    
    // User-specific permissions
    impersonateUsers: () => hasPermission(RESOURCES.USERS, ACTIONS.IMPERSONATE),
    manageUserRoles: () => hasPermission(RESOURCES.USERS, ACTIONS.ROLES),
    
    // Interview-specific permissions
    rescheduleInterviews: () => hasPermission(RESOURCES.INTERVIEWS, ACTIONS.RESCHEDULE),
    manageInterviewCalendar: () => hasPermission(RESOURCES.INTERVIEWS, ACTIONS.CALENDAR),
    addInterviewNotes: () => hasPermission(RESOURCES.INTERVIEWS, ACTIONS.NOTES),
    
    // Analytics permissions
    viewAdvancedAnalytics: () => hasPermission(RESOURCES.ANALYTICS, ACTIONS.ADVANCED),
    
    // Settings permissions
    editSystemSettings: () => hasPermission(RESOURCES.SETTINGS, ACTIONS.EDIT_SYSTEM),
    editBrandingSettings: () => hasPermission(RESOURCES.SETTINGS, ACTIONS.EDIT_BRANDING),
    editNotificationSettings: () => hasPermission(RESOURCES.SETTINGS, ACTIONS.EDIT_NOTIFICATIONS),
    manageIntegrations: () => hasPermission(RESOURCES.SETTINGS, ACTIONS.INTEGRATIONS),
    
    // Email permissions
    sendEmails: () => hasPermission(RESOURCES.EMAILS, ACTIONS.SEND),
    manageEmailTemplates: () => hasPermission(RESOURCES.EMAILS, ACTIONS.TEMPLATES),
    manageEmailAutomation: () => hasPermission(RESOURCES.EMAILS, ACTIONS.AUTOMATION),
    
    // Weekly digest permissions
    editWeeklyDigest: () => hasPermission(RESOURCES.WEEKLY_DIGEST, ACTIONS.EDIT),
    sendWeeklyDigest: () => hasPermission(RESOURCES.WEEKLY_DIGEST, ACTIONS.SEND),
    
    // Role management permissions
    manageRoles: () => hasPermission(RESOURCES.ROLES, ACTIONS.VIEW),
    createRoles: () => hasPermission(RESOURCES.ROLES, ACTIONS.CREATE),
    editRoles: () => hasPermission(RESOURCES.ROLES, ACTIONS.EDIT),
    deleteRoles: () => hasPermission(RESOURCES.ROLES, ACTIONS.DELETE),
    assignRoles: () => hasPermission(RESOURCES.ROLES, ACTIONS.ASSIGN),
    
    // Audit log permissions
    viewAuditLogs: () => hasPermission(RESOURCES.AUDIT_LOGS, ACTIONS.VIEW),
    exportAuditLogs: () => hasPermission(RESOURCES.AUDIT_LOGS, ACTIONS.EXPORT)
  }), [hasPermission]);

  // Check if user has any permission for a resource
  const hasAnyPermissionFor = useMemo(() => {
    return (resource) => {
      const resourcePermissions = Array.from(permissions).filter(permission => 
        permission.startsWith(`${resource}:`)
      );
      return resourcePermissions.length > 0;
    };
  }, [permissions]);

  // Check multiple permissions at once
  const hasPermissions = useMemo(() => {
    return (permissionChecks) => {
      const results = {};
      permissionChecks.forEach(({ resource, action, key }) => {
        const permissionKey = key || `${resource}_${action}`;
        results[permissionKey] = hasPermission(resource, action);
      });
      return results;
    };
  }, [hasPermission]);

  // Check if user is Super Admin (has all permissions)
  const isSuperAdmin = useMemo(() => {
    return userRole?.name === 'Super Admin';
  }, [userRole]);


  // Get user's role information
  const roleInfo = useMemo(() => ({
    name: userRole?.name || 'No Role',
    description: userRole?.description || '',
    color: userRole?.color || '#6b7280',
    isSystemRole: userRole?.isSystemRole || false
  }), [userRole]);

  return {
    // Core functions
    hasPermission,
    hasAnyPermissionFor,
    hasPermissions,
    
    // Convenience functions
    can,
    
    // User info
    userRole: roleInfo,
    isSuperAdmin,
    
    // State
    permissions: Array.from(permissions),
    loading,
    
    // Raw data
    permissionSet: permissions,
    
    // Constants for easy access
    RESOURCES,
    ACTIONS
  };
}

/**
 * Higher-order component to wrap components that need permission checking
 */
export function withPermissions(WrappedComponent, requiredPermission) {
  return function PermissionWrappedComponent(props) {
    const { hasPermission, loading } = usePermissions();
    
    if (loading) {
      return <div>Loading permissions...</div>;
    }
    
    if (requiredPermission && !hasPermission(requiredPermission.resource, requiredPermission.action)) {
      return <div>Access denied. Insufficient permissions.</div>;
    }
    
    return <WrappedComponent {...props} />;
  };
}

/**
 * Component to conditionally render based on permissions
 */
export function PermissionGuard({ 
  resource, 
  action, 
  children, 
  fallback = null,
  requireAll = true,
  permissions = [] 
}) {
  const { hasPermission } = usePermissions();
  
  let hasAccess = false;
  
  if (resource && action) {
    // Single permission check
    hasAccess = hasPermission(resource, action);
  } else if (permissions.length > 0) {
    // Multiple permissions check
    if (requireAll) {
      hasAccess = permissions.every(p => hasPermission(p.resource, p.action));
    } else {
      hasAccess = permissions.some(p => hasPermission(p.resource, p.action));
    }
  }
  
  return hasAccess ? children : fallback;
}