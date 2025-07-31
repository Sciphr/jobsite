// app/components/guards/ComponentPermissionGuard.js
"use client";

import { usePermissions } from "@/app/hooks/usePermissions";
import { useSession } from "next-auth/react";

/**
 * Component-level permission guard
 * Conditionally renders UI elements based on user permissions
 */
export default function ComponentPermissionGuard({ 
  children, 
  requiredPermissions = [], 
  requireAll = true,
  resource = null,
  action = null,
  minPrivilegeLevel = null,
  customCheck = null,
  fallback = null,
  allowSuperAdmin = true,
  allowSelfAccess = false,
  targetUserId = null,
  hideOnNoPermission = true
}) {
  const { data: session } = useSession();
  const { hasPermission, isSuperAdmin, loading } = usePermissions();

  // Don't render anything while loading unless specified
  if (loading && hideOnNoPermission) {
    return null;
  }

  // Quick privilege level check
  if (minPrivilegeLevel !== null && (session?.user?.privilegeLevel || 0) < minPrivilegeLevel) {
    return fallback;
  }

  // Super admin bypass
  if (allowSuperAdmin && isSuperAdmin) {
    return children;
  }

  // Self-access check
  if (allowSelfAccess && targetUserId && session?.user?.id === targetUserId) {
    return children;
  }

  // Custom check
  if (customCheck) {
    try {
      const result = customCheck(session, { hasPermission });
      return result ? children : fallback;
    } catch (error) {
      console.error("Custom permission check failed:", error);
      return fallback;
    }
  }

  // Single resource:action check
  if (resource && action) {
    return hasPermission(resource, action) ? children : fallback;
  }

  // Multiple permissions check
  if (requiredPermissions.length > 0) {
    const checks = requiredPermissions.map(({ resource, action }) => 
      hasPermission(resource, action)
    );

    const hasAccess = requireAll 
      ? checks.every(Boolean)
      : checks.some(Boolean);

    return hasAccess ? children : fallback;
  }

  // Default: render children if no specific permissions required
  return children;
}

/**
 * Specific component guards for common scenarios
 */
export function CanView({ resource, children, fallback = null }) {
  return (
    <ComponentPermissionGuard resource={resource} action="view" fallback={fallback}>
      {children}
    </ComponentPermissionGuard>
  );
}

export function CanCreate({ resource, children, fallback = null }) {
  return (
    <ComponentPermissionGuard resource={resource} action="create" fallback={fallback}>
      {children}
    </ComponentPermissionGuard>
  );
}

export function CanEdit({ resource, children, fallback = null }) {
  return (
    <ComponentPermissionGuard resource={resource} action="edit" fallback={fallback}>
      {children}
    </ComponentPermissionGuard>
  );
}

export function CanDelete({ resource, children, fallback = null }) {
  return (
    <ComponentPermissionGuard resource={resource} action="delete" fallback={fallback}>
      {children}
    </ComponentPermissionGuard>
  );
}

export function AdminOnly({ children, minLevel = 1, fallback = null }) {
  return (
    <ComponentPermissionGuard minPrivilegeLevel={minLevel} fallback={fallback}>
      {children}
    </ComponentPermissionGuard>
  );
}

export function SuperAdminOnly({ children, fallback = null }) {
  return (
    <ComponentPermissionGuard minPrivilegeLevel={3} fallback={fallback}>
      {children}
    </ComponentPermissionGuard>
  );
}

/**
 * Permission-aware button component
 */
export function PermissionButton({ 
  resource, 
  action, 
  children, 
  onClick,
  disabled = false,
  className = "",
  disabledClassName = "opacity-50 cursor-not-allowed",
  hideWhenNoPermission = false,
  ...props 
}) {
  const { hasPermission } = usePermissions();
  const hasAccess = hasPermission(resource, action);

  if (hideWhenNoPermission && !hasAccess) {
    return null;
  }

  return (
    <button
      onClick={hasAccess && !disabled ? onClick : undefined}
      disabled={!hasAccess || disabled}
      className={`${className} ${!hasAccess || disabled ? disabledClassName : ""}`}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Permission-aware link component
 */
export function PermissionLink({ 
  resource, 
  action, 
  children, 
  href,
  className = "",
  disabledClassName = "opacity-50 cursor-not-allowed pointer-events-none",
  hideWhenNoPermission = false,
  ...props 
}) {
  const { hasPermission } = usePermissions();
  const hasAccess = hasPermission(resource, action);

  if (hideWhenNoPermission && !hasAccess) {
    return null;
  }

  return (
    <a
      href={hasAccess ? href : undefined}
      className={`${className} ${!hasAccess ? disabledClassName : ""}`}
      {...props}
    >
      {children}
    </a>
  );
}

/**
 * Conditional rendering based on multiple permissions
 */
export function HasAnyPermission({ permissions, children, fallback = null }) {
  return (
    <ComponentPermissionGuard 
      requiredPermissions={permissions} 
      requireAll={false} 
      fallback={fallback}
    >
      {children}
    </ComponentPermissionGuard>
  );
}

export function HasAllPermissions({ permissions, children, fallback = null }) {
  return (
    <ComponentPermissionGuard 
      requiredPermissions={permissions} 
      requireAll={true} 
      fallback={fallback}
    >
      {children}
    </ComponentPermissionGuard>
  );
}

/**
 * Hook for getting permission-aware props
 */
export function usePermissionProps(resource, action) {
  const { hasPermission } = usePermissions();
  const hasAccess = hasPermission(resource, action);

  return {
    hasPermission: hasAccess,
    disabled: !hasAccess,
    className: !hasAccess ? "opacity-50 cursor-not-allowed" : "",
    "aria-disabled": !hasAccess,
    tabIndex: !hasAccess ? -1 : undefined,
  };
}