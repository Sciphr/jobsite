import { useState, useEffect } from "react";

// Category metadata (icons and descriptions)
const CATEGORY_METADATA = {
  Jobs: {
    icon: "💼",
    description: "Control access to job postings and job-related features",
  },
  Applications: {
    icon: "📋",
    description: "Manage job applications and candidate interactions",
  },
  Users: {
    icon: "👥",
    description: "Control user accounts and profile management",
  },
  Interviews: {
    icon: "🎯",
    description: "Schedule and manage interviews",
  },
  Analytics: {
    icon: "📊",
    description: "Access data insights and generate reports",
  },
  Settings: {
    icon: "⚙️",
    description: "Configure system and application settings",
  },
  Emails: {
    icon: "📧",
    description: "Control email communications and templates",
  },
  "Weekly Digest": {
    icon: "📅",
    description: "Manage weekly summary reports",
  },
  "Audit Logs": {
    icon: "🔒",
    description: "Monitor system security and user activity",
  },
  Roles: {
    icon: "🛡️",
    description: "Control roles and permissions system",
  },
};

// Fallback data in case API fails
const FALLBACK_CATEGORIES = {
  System: {
    icon: "⚙️",
    description: "Loading permissions from database...",
    permissions: [],
  },
};

export default function PermissionSelector({
  selectedPermissions,
  onPermissionChange,
}) {
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectAll, setSelectAll] = useState(false);
  const [permissionCategories, setPermissionCategories] =
    useState(FALLBACK_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Validate props
  useEffect(() => {
    if (typeof onPermissionChange !== "function") {
      console.error(
        "PermissionSelector: onPermissionChange prop must be a function, received:",
        typeof onPermissionChange,
        onPermissionChange
      );
      setError(
        "Invalid onPermissionChange prop - component may not work correctly"
      );
    }
  }, [onPermissionChange]);

  // Fetch permissions from API
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/admin/permissions");

        if (!response.ok) {
          throw new Error("Failed to fetch permissions");
        }

        const data = await response.json();

        // Transform API data into component format
        const transformedCategories = {};

        Object.entries(data.grouped).forEach(([categoryName, permissions]) => {
          // Get metadata for category or use defaults
          const metadata = CATEGORY_METADATA[categoryName] || {
            icon: "📋",
            description: "System permissions",
          };

          transformedCategories[categoryName] = {
            ...metadata,
            permissions: permissions.map((perm) => ({
              resource: perm.resource,
              action: perm.action,
              name: formatPermissionName(perm.resource, perm.action),
              desc: perm.description,
              key: perm.key,
              id: perm.id,
              isSystemPermission: perm.isSystemPermission,
            })),
          };
        });

        setPermissionCategories(transformedCategories);
        setError(null);
      } catch (err) {
        console.error("Error fetching permissions:", err);
        setError(err.message);
        // Keep fallback categories on error
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  // Helper function to format permission names
  const formatPermissionName = (resource, action) => {
    const actionMap = {
      view: "View",
      create: "Create",
      edit: "Edit",
      delete: "Delete",
      export: "Export",
      publish: "Publish",
      feature: "Feature",
      send: "Send",
      templates: "Manage Templates",
      automation: "Manage Automation",
      bulk_actions: "Bulk Actions",
      status_change: "Change Status",
      assign: "Assign",
      notes: "Add Notes",
      impersonate: "Impersonate",
      roles: "Manage Roles",
      reschedule: "Reschedule",
      calendar: "Manage Calendar",
      advanced: "Advanced",
      edit_system: "Edit System Settings",
      edit_branding: "Edit Branding",
      edit_notifications: "Edit Notifications",
      integrations: "Manage Integrations",
      approve_hire: "Approve Hire",
    };

    const resourceMap = {
      jobs: "Jobs",
      applications: "Applications",
      users: "Users",
      interviews: "Interviews",
      analytics: "Analytics",
      settings: "Settings",
      emails: "Emails",
      weekly_digest: "Weekly Digest",
      audit_logs: "Audit Logs",
      roles: "Roles",
    };

    const actionName =
      actionMap[action] || action.charAt(0).toUpperCase() + action.slice(1);
    const resourceName =
      resourceMap[resource] ||
      resource.charAt(0).toUpperCase() + resource.slice(1);

    return `${actionName} ${resourceName}`;
  };

  // Calculate total permissions
  const totalPermissions = Object.values(permissionCategories).reduce(
    (sum, category) => sum + category.permissions.length,
    0
  );

  // Filter permissions based on search
  const filteredCategories = Object.entries(permissionCategories).reduce(
    (acc, [categoryName, categoryData]) => {
      if (!searchTerm) return { ...acc, [categoryName]: categoryData };

      const filteredPermissions = categoryData.permissions.filter(
        (perm) =>
          perm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          perm.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
          categoryName.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (filteredPermissions.length > 0) {
        acc[categoryName] = {
          ...categoryData,
          permissions: filteredPermissions,
        };
      }
      return acc;
    },
    {}
  );

  // Handle category expansion
  const toggleCategory = (categoryName) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  // Handle individual permission toggle
  const togglePermission = (resource, action) => {
    if (typeof onPermissionChange !== "function") {
      console.error(
        "onPermissionChange is not a function:",
        onPermissionChange
      );
      return;
    }

    const permissionKey = `${resource}:${action}`;
    const newSelected = new Set(selectedPermissions);

    if (newSelected.has(permissionKey)) {
      newSelected.delete(permissionKey);
    } else {
      newSelected.add(permissionKey);
    }

    onPermissionChange(newSelected);
  };

  // Handle category select all
  const toggleCategoryPermissions = (categoryData) => {
    if (typeof onPermissionChange !== "function") {
      console.error(
        "onPermissionChange is not a function:",
        onPermissionChange
      );
      return;
    }

    const newSelected = new Set(selectedPermissions);
    const categoryPermissions = categoryData.permissions.map(
      (p) => `${p.resource}:${p.action}`
    );

    // Check if all permissions in this category are selected
    const allSelected = categoryPermissions.every((perm) =>
      newSelected.has(perm)
    );

    if (allSelected) {
      // Remove all category permissions
      categoryPermissions.forEach((perm) => newSelected.delete(perm));
    } else {
      // Add all category permissions
      categoryPermissions.forEach((perm) => newSelected.add(perm));
    }

    onPermissionChange(newSelected);
  };

  // Handle select all toggle
  const toggleSelectAll = () => {
    if (typeof onPermissionChange !== "function") {
      console.error(
        "onPermissionChange is not a function:",
        onPermissionChange
      );
      return;
    }

    if (selectAll) {
      onPermissionChange(new Set());
    } else {
      const allPermissions = new Set();
      Object.values(permissionCategories).forEach((category) => {
        category.permissions.forEach((perm) => {
          allPermissions.add(`${perm.resource}:${perm.action}`);
        });
      });
      onPermissionChange(allPermissions);
    }
    setSelectAll(!selectAll);
  };

  // Update select all state when permissions change
  useEffect(() => {
    setSelectAll(selectedPermissions.size === totalPermissions);
  }, [selectedPermissions.size, totalPermissions]);

  // Auto-expand categories when searching
  useEffect(() => {
    if (searchTerm) {
      setExpandedCategories(new Set(Object.keys(filteredCategories)));
    }
  }, [searchTerm, filteredCategories]);

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading permissions...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-red-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-red-800">
                Failed to load permissions
              </h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Stats */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Select Permissions
            </h3>
            <p className="text-sm text-gray-600">
              Choose which actions this role can perform. Selected:{" "}
              <span className="font-semibold">{selectedPermissions.size}</span>{" "}
              of {totalPermissions}
            </p>
          </div>

          <button
            type="button"
            onClick={toggleSelectAll}
            className={`px-3 py-1 text-sm rounded-md border ${
              selectAll
                ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
            }`}
          >
            {selectAll ? "Deselect All" : "Select All"}
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-4 w-4 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search permissions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Permission Categories */}
      <div className="space-y-4">
        {Object.entries(filteredCategories).map(
          ([categoryName, categoryData]) => {
            const isExpanded = expandedCategories.has(categoryName);
            const categoryPermissions = categoryData.permissions.map(
              (p) => `${p.resource}:${p.action}`
            );
            const selectedInCategory = categoryPermissions.filter((perm) =>
              selectedPermissions.has(perm)
            ).length;
            const allSelected =
              selectedInCategory === categoryPermissions.length;
            const someSelected = selectedInCategory > 0;

            return (
              <div
                key={categoryName}
                className="border border-gray-200 rounded-lg"
              >
                {/* Category Header */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => toggleCategory(categoryName)}
                      className="flex items-center space-x-3 text-left"
                    >
                      <span className="text-lg">{categoryData.icon}</span>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-gray-900">
                            {categoryName}
                          </h4>
                          <span className="text-xs text-gray-500">
                            ({selectedInCategory}/{categoryPermissions.length})
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">
                          {categoryData.description}
                        </p>
                      </div>
                      <svg
                        className={`h-5 w-5 text-gray-400 transform transition-transform ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>

                    <div className="flex items-center space-x-2">
                      {/* Progress indicator */}
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            selectedInCategory === 0
                              ? "bg-gray-300"
                              : allSelected
                                ? "bg-green-500"
                                : "bg-blue-500"
                          }`}
                          style={{
                            width: `${Math.min(100, (selectedInCategory / categoryPermissions.length) * 100)}%`,
                          }}
                        ></div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleCategoryPermissions(categoryData)}
                        className={`px-2 py-1 text-xs rounded ${
                          allSelected
                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                            : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                        }`}
                      >
                        {allSelected ? "None" : "All"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Category Permissions */}
                {isExpanded && (
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {categoryData.permissions.map((permission) => {
                        const permissionKey = `${permission.resource}:${permission.action}`;
                        const isSelected =
                          selectedPermissions.has(permissionKey);

                        return (
                          <div
                            key={permissionKey}
                            className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                              isSelected
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                            onClick={() =>
                              togglePermission(
                                permission.resource,
                                permission.action
                              )
                            }
                          >
                            <div className="flex items-start space-x-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() =>
                                  togglePermission(
                                    permission.resource,
                                    permission.action
                                  )
                                }
                                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h5 className="text-sm font-medium text-gray-900">
                                    {permission.name}
                                  </h5>
                                  <span className="text-xs text-gray-400 font-mono">
                                    {permission.resource}:{permission.action}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-gray-600">
                                  {permission.desc}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          }
        )}
      </div>

      {Object.keys(filteredCategories).length === 0 && searchTerm && (
        <div className="text-center py-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No permissions found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search term to find the permissions you're
            looking for.
          </p>
        </div>
      )}

      {/* Selection Summary */}
      {selectedPermissions.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-blue-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-900">
                {selectedPermissions.size} permission
                {selectedPermissions.size !== 1 ? "s" : ""} selected
              </h4>
              <p className="text-sm text-blue-700">
                This role will have access to the selected capabilities across
                the system.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
