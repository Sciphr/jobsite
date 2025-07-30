// app/components/examples/PermissionExamples.jsx
"use client";

import { usePermissions, PermissionGuard } from "@/app/hooks/usePermissions";

/**
 * Example: Job Management Component with Permission Checks
 */
export function JobManagementExample({ job }) {
  const { can, hasPermission, RESOURCES, ACTIONS } = usePermissions();

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{job.title}</h3>
          <p className="text-sm text-gray-500">{job.department}</p>
        </div>
        
        <div className="flex space-x-2">
          {/* Show edit button only if user can edit jobs */}
          {can.edit(RESOURCES.JOBS) && (
            <button className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm">
              Edit Job
            </button>
          )}
          
          {/* Show publish/unpublish only if user has publish permission */}
          {can.publishJobs() && (
            <button className="px-3 py-1 bg-green-600 text-white rounded-md text-sm">
              {job.status === 'Active' ? 'Unpublish' : 'Publish'}
            </button>
          )}
          
          {/* Show feature toggle only if user can feature jobs */}
          {can.featureJobs() && (
            <button className="px-3 py-1 bg-yellow-600 text-white rounded-md text-sm">
              {job.featured ? 'Unfeature' : 'Feature'}
            </button>
          )}
          
          {/* Show delete only if user can delete jobs */}
          {can.delete(RESOURCES.JOBS) && (
            <button className="px-3 py-1 bg-red-600 text-white rounded-md text-sm">
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Conditionally show applications section */}
      <PermissionGuard resource={RESOURCES.APPLICATIONS} action={ACTIONS.VIEW}>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-2">Applications</h4>
          <div className="flex space-x-4 text-sm text-gray-600">
            <span>{job.applicationCount} total applications</span>
            
            {/* Show export link only if user can export applications */}
            <PermissionGuard resource={RESOURCES.APPLICATIONS} action={ACTIONS.EXPORT}>
              <button className="text-blue-600 hover:text-blue-800">
                Export Applications
              </button>
            </PermissionGuard>
          </div>
        </div>
      </PermissionGuard>
    </div>
  );
}

/**
 * Example: Navigation Menu with Permission-based Items
 */
export function NavigationExample() {
  const { hasAnyPermissionFor, can, RESOURCES } = usePermissions();

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/admin/dashboard',
      show: true // Always show dashboard
    },
    {
      name: 'Jobs',
      href: '/admin/jobs',
      show: hasAnyPermissionFor(RESOURCES.JOBS)
    },
    {
      name: 'Applications',
      href: '/admin/applications',
      show: hasAnyPermissionFor(RESOURCES.APPLICATIONS)
    },
    {
      name: 'Users',
      href: '/admin/users',
      show: hasAnyPermissionFor(RESOURCES.USERS)
    },
    {
      name: 'Analytics',
      href: '/admin/analytics',
      show: can.view(RESOURCES.ANALYTICS)
    },
    {
      name: 'Settings',
      href: '/admin/settings',
      show: hasAnyPermissionFor(RESOURCES.SETTINGS)
    },
    {
      name: 'Role Management',
      href: '/admin/roles',
      show: can.manageRoles()
    }
  ];

  return (
    <nav className="space-y-1">
      {navigationItems
        .filter(item => item.show)
        .map(item => (
          <a
            key={item.name}
            href={item.href}
            className="flex items-center px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
          >
            {item.name}
          </a>
        ))}
    </nav>
  );
}

/**
 * Example: User Profile with Role Information
 */
export function UserProfileExample() {
  const { userRole, isSuperAdmin, permissions, loading } = usePermissions();

  if (loading) {
    return <div>Loading user information...</div>;
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <div 
            className="h-12 w-12 rounded-full flex items-center justify-center text-white font-medium"
            style={{ backgroundColor: userRole.color }}
          >
            {userRole.name.charAt(0)}
          </div>
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900">
            Your Role: {userRole.name}
          </h3>
          <p className="text-sm text-gray-500">{userRole.description}</p>
          
          {isSuperAdmin && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-2">
              Super Administrator
            </span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          Your Permissions ({permissions.length})
        </h4>
        <div className="text-xs text-gray-600">
          You have access to {permissions.length} different actions across the system.
        </div>
      </div>
    </div>
  );
}

/**
 * Example: Settings Page Section with Granular Permissions
 */
export function SettingsPageExample() {
  const { can, RESOURCES } = usePermissions();

  return (
    <div className="space-y-6">
      {/* System Settings - Only Super Admins */}
      <PermissionGuard resource={RESOURCES.SETTINGS} action="edit_system">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-red-900 mb-2">System Settings</h3>
          <p className="text-sm text-red-700 mb-4">
            Critical system configuration that affects all users.
          </p>
          <button className="px-4 py-2 bg-red-600 text-white rounded-md text-sm">
            Edit System Settings
          </button>
        </div>
      </PermissionGuard>

      {/* Branding Settings - Admins and above */}
      <PermissionGuard resource={RESOURCES.SETTINGS} action="edit_branding">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-blue-900 mb-2">Branding & Appearance</h3>
          <p className="text-sm text-blue-700 mb-4">
            Customize the look and feel of your job board.
          </p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm">
            Edit Branding
          </button>
        </div>
      </PermissionGuard>

      {/* Integration Settings */}
      <PermissionGuard resource={RESOURCES.SETTINGS} action="integrations">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-green-900 mb-2">Integrations</h3>
          <p className="text-sm text-green-700 mb-4">
            Connect with third-party services like calendars and video conferencing.
          </p>
          <button className="px-4 py-2 bg-green-600 text-white rounded-md text-sm">
            Manage Integrations
          </button>
        </div>
      </PermissionGuard>

      {/* Always show personal settings */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Personal Settings</h3>
        <p className="text-sm text-gray-700 mb-4">
          Your personal preferences and account settings.
        </p>
        <button className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm">
          Edit Personal Settings
        </button>
      </div>
    </div>
  );
}