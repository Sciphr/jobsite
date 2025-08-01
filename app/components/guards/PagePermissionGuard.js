// app/components/guards/PagePermissionGuard.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { usePermissions } from "@/app/hooks/usePermissions";

/**
 * Page-level permission guard component
 * Redirects users who don't have required permissions
 */
export default function PagePermissionGuard({ 
  children, 
  requiredPermissions = [], 
  requireAll = true,
  fallbackPath = "/admin/dashboard",
  minPrivilegeLevel = null,
  customCheck = null,
  loadingComponent = null,
  accessDeniedComponent = null
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { hasPermission, loading: permissionsLoading, isSuperAdmin } = usePermissions();
  const [accessGranted, setAccessGranted] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAccess() {
      // Wait for session and permissions to load
      if (status === "loading" || permissionsLoading) {
        return;
      }

      // Redirect to login if not authenticated
      if (status === "unauthenticated" || !session?.user?.id) {
        router.push("/auth/signin");
        return;
      }

      try {
        setChecking(true);

        // TODO: Implement proper system admin concept
        // For now, disable super admin bypass to test permission system
        // if (isSuperAdmin) {
        //   setAccessGranted(true);
        //   setChecking(false);
        //   return;
        // }

        // Check minimum privilege level
        if (minPrivilegeLevel !== null && (session.user.privilegeLevel || 0) < minPrivilegeLevel) {
          console.warn(`Access denied: Requires privilege level ${minPrivilegeLevel}, user has ${session.user.privilegeLevel || 0}`);
          setAccessGranted(false);
          setChecking(false);
          return;
        }

        // Custom check takes precedence
        if (customCheck) {
          try {
            const customResult = await customCheck(session, { hasPermission });
            setAccessGranted(customResult.allowed || false);
            if (!customResult.allowed && customResult.redirectTo) {
              router.push(customResult.redirectTo);
              return;
            }
          } catch (error) {
            console.error("Custom permission check failed:", error);
            setAccessGranted(false);
          }
          setChecking(false);
          return;
        }

        // Standard permission checking
        if (requiredPermissions.length > 0) {
          const permissionChecks = requiredPermissions.map(({ resource, action }) => 
            hasPermission(resource, action)
          );

          const hasAccess = requireAll 
            ? permissionChecks.every(Boolean)
            : permissionChecks.some(Boolean);

          if (!hasAccess) {
            const requiredPermsStr = requiredPermissions
              .map(p => `${p.resource}:${p.action}`)
              .join(requireAll ? " AND " : " OR ");
            
            console.warn(`Access denied: Requires ${requiredPermsStr}`);
            setAccessGranted(false);
            setChecking(false);
            return;
          }
        }

        // All checks passed
        setAccessGranted(true);
      } catch (error) {
        console.error("Error checking page permissions:", error);
        setAccessGranted(false);
      } finally {
        setChecking(false);
      }
    }

    checkAccess();
  }, [
    session, 
    status, 
    hasPermission, 
    permissionsLoading, 
    isSuperAdmin,
    requiredPermissions,
    requireAll,
    minPrivilegeLevel,
    router
  ]);

  // Show loading while checking
  if (status === "loading" || permissionsLoading || checking) {
    if (loadingComponent) return loadingComponent;
    
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (status === "unauthenticated") {
    return null; // Router.push was called above
  }

  // Show access denied if permissions insufficient
  if (accessGranted === false) {
    if (accessDeniedComponent) return accessDeniedComponent;

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md p-6 bg-red-50 border border-red-200 rounded-lg text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.924-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-red-900 mb-2">Access Denied</h3>
          <p className="text-sm text-red-800 mb-4">
            You don't have permission to access this page.
          </p>
          <button
            onClick={() => router.push(fallbackPath)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Render children if access is granted
  return accessGranted ? children : null;
}

/**
 * Higher-order component version of the permission guard
 */
export function withPagePermissions(Component, guardConfig = {}) {
  return function PermissionGuardedPage(props) {
    return (
      <PagePermissionGuard {...guardConfig}>
        <Component {...props} />
      </PagePermissionGuard>
    );
  };
}

/**
 * Specific guards for common admin scenarios
 */
export function AdminPageGuard({ children, minLevel = 1, ...props }) {
  return (
    <PagePermissionGuard
      minPrivilegeLevel={minLevel}
      fallbackPath="/auth/signin"
      {...props}
    >
      {children}
    </PagePermissionGuard>
  );
}

export function SuperAdminPageGuard({ children, ...props }) {
  return (
    <PagePermissionGuard
      minPrivilegeLevel={3}
      fallbackPath="/admin/dashboard"
      {...props}
    >
      {children}
    </PagePermissionGuard>
  );
}

export function ResourcePermissionGuard({ children, resource, actions = ["view"], requireAll = false, ...props }) {
  const requiredPermissions = actions.map(action => ({ resource, action }));
  
  return (
    <PagePermissionGuard
      requiredPermissions={requiredPermissions}
      requireAll={requireAll}
      {...props}
    >
      {children}
    </PagePermissionGuard>
  );
}