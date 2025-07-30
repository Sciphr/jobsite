import { useState, useEffect } from "react";

// Permission categories and descriptions
const PERMISSION_CATEGORIES = {
  "Jobs Management": {
    icon: "💼",
    description: "Control access to job postings and job-related features",
    permissions: [
      { resource: "jobs", action: "view", name: "View Jobs", desc: "See job listings and details" },
      { resource: "jobs", action: "create", name: "Create Jobs", desc: "Post new job openings" },
      { resource: "jobs", action: "edit", name: "Edit Jobs", desc: "Modify existing job postings" },
      { resource: "jobs", action: "delete", name: "Delete Jobs", desc: "Remove job postings" },
      { resource: "jobs", action: "publish", name: "Publish Jobs", desc: "Control job visibility to applicants" },
      { resource: "jobs", action: "feature", name: "Feature Jobs", desc: "Mark jobs as featured" },
      { resource: "jobs", action: "export", name: "Export Jobs", desc: "Download job data" },
    ]
  },
  "Applications": {
    icon: "📋",
    description: "Manage job applications and candidate interactions",
    permissions: [
      { resource: "applications", action: "view", name: "View Applications", desc: "See submitted applications" },
      { resource: "applications", action: "edit", name: "Edit Applications", desc: "Modify application details" },
      { resource: "applications", action: "delete", name: "Delete Applications", desc: "Remove applications" },
      { resource: "applications", action: "export", name: "Export Applications", desc: "Download application data" },
      { resource: "applications", action: "bulk_actions", name: "Bulk Actions", desc: "Perform mass operations on applications" },
    ]
  },
  "User Management": {
    icon: "👥",
    description: "Control user accounts and profile management",
    permissions: [
      { resource: "users", action: "view", name: "View Users", desc: "See user profiles and information" },
      { resource: "users", action: "create", name: "Create Users", desc: "Add new user accounts" },
      { resource: "users", action: "edit", name: "Edit Users", desc: "Modify user profiles" },
      { resource: "users", action: "delete", name: "Delete Users", desc: "Remove user accounts" },
      { resource: "users", action: "export", name: "Export Users", desc: "Download user data" },
      { resource: "users", action: "bulk_actions", name: "User Bulk Actions", desc: "Perform mass operations on users" },
    ]
  },
  "Interviews": {
    icon: "🎯",
    description: "Schedule and manage interviews",
    permissions: [
      { resource: "interviews", action: "view", name: "View Interviews", desc: "See scheduled interviews" },
      { resource: "interviews", action: "create", name: "Schedule Interviews", desc: "Create new interview appointments" },
      { resource: "interviews", action: "edit", name: "Edit Interviews", desc: "Modify interview details" },
      { resource: "interviews", action: "delete", name: "Cancel Interviews", desc: "Remove scheduled interviews" },
      { resource: "interviews", action: "export", name: "Export Interviews", desc: "Download interview data" },
    ]
  },
  "Analytics & Reports": {
    icon: "📊",
    description: "Access data insights and generate reports",
    permissions: [
      { resource: "analytics", action: "view", name: "View Analytics", desc: "Access dashboard analytics" },
      { resource: "analytics", action: "export", name: "Export Analytics", desc: "Download analytics reports" },
      { resource: "reports", action: "view", name: "View Reports", desc: "Access system reports" },
      { resource: "reports", action: "create", name: "Create Reports", desc: "Generate custom reports" },
      { resource: "reports", action: "export", name: "Export Reports", desc: "Download report data" },
    ]
  },
  "Settings": {
    icon: "⚙️",
    description: "Configure system and application settings",
    permissions: [
      { resource: "settings", action: "view", name: "View Settings", desc: "See system configuration" },
      { resource: "settings", action: "edit_branding", name: "Edit Branding", desc: "Modify logos, colors, and appearance" },
      { resource: "settings", action: "edit_system", name: "Edit System Settings", desc: "Modify critical system configuration" },
      { resource: "settings", action: "integrations", name: "Manage Integrations", desc: "Configure third-party services" },
    ]
  },
  "Email Management": {
    icon: "📧",
    description: "Control email communications and templates",
    permissions: [
      { resource: "emails", action: "view", name: "View Emails", desc: "See email history and templates" },
      { resource: "emails", action: "send", name: "Send Emails", desc: "Compose and send emails" },
      { resource: "emails", action: "templates", name: "Manage Templates", desc: "Create and edit email templates" },
      { resource: "emails", action: "bulk_send", name: "Bulk Email", desc: "Send emails to multiple recipients" },
    ]
  },
  "Weekly Digest": {
    icon: "📅",
    description: "Manage weekly summary reports",
    permissions: [
      { resource: "weekly_digest", action: "view", name: "View Digest", desc: "See weekly digest reports" },
      { resource: "weekly_digest", action: "send", name: "Send Digest", desc: "Distribute weekly reports" },
      { resource: "weekly_digest", action: "configure", name: "Configure Digest", desc: "Set up digest preferences" },
    ]
  },
  "Security & Auditing": {
    icon: "🔒",
    description: "Monitor system security and user activity",
    permissions: [
      { resource: "audit_logs", action: "view", name: "View Audit Logs", desc: "See system activity logs" },
      { resource: "audit_logs", action: "export", name: "Export Audit Logs", desc: "Download audit data" },
      { resource: "security", action: "manage", name: "Manage Security", desc: "Configure security settings" },
    ]
  },
  "Role Management": {
    icon: "🛡️",
    description: "Control roles and permissions system",
    permissions: [
      { resource: "roles", action: "view", name: "View Roles", desc: "See role configurations" },
      { resource: "roles", action: "create", name: "Create Roles", desc: "Add new roles" },
      { resource: "roles", action: "edit", name: "Edit Roles", desc: "Modify role permissions" },
      { resource: "roles", action: "delete", name: "Delete Roles", desc: "Remove roles (non-system)" },
      { resource: "roles", action: "assign", name: "Assign Roles", desc: "Change user role assignments" },
    ]
  }
};

export default function PermissionSelector({ selectedPermissions, onPermissionChange }) {
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectAll, setSelectAll] = useState(false);

  // Calculate total permissions
  const totalPermissions = Object.values(PERMISSION_CATEGORIES)
    .reduce((sum, category) => sum + category.permissions.length, 0);

  // Filter permissions based on search
  const filteredCategories = Object.entries(PERMISSION_CATEGORIES).reduce((acc, [categoryName, categoryData]) => {
    if (!searchTerm) return { ...acc, [categoryName]: categoryData };
    
    const filteredPermissions = categoryData.permissions.filter(
      perm => 
        perm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        perm.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        categoryName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filteredPermissions.length > 0) {
      acc[categoryName] = {
        ...categoryData,
        permissions: filteredPermissions
      };
    }
    return acc;
  }, {});

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
    const newSelected = new Set(selectedPermissions);
    const categoryPermissions = categoryData.permissions.map(p => `${p.resource}:${p.action}`);
    
    // Check if all permissions in this category are selected
    const allSelected = categoryPermissions.every(perm => newSelected.has(perm));
    
    if (allSelected) {
      // Remove all category permissions
      categoryPermissions.forEach(perm => newSelected.delete(perm));
    } else {
      // Add all category permissions
      categoryPermissions.forEach(perm => newSelected.add(perm));
    }
    
    onPermissionChange(newSelected);
  };

  // Handle select all toggle
  const toggleSelectAll = () => {
    if (selectAll) {
      onPermissionChange(new Set());
    } else {
      const allPermissions = new Set();
      Object.values(PERMISSION_CATEGORIES).forEach(category => {
        category.permissions.forEach(perm => {
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

  return (
    <div className="space-y-6">
      {/* Header with Search and Stats */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Select Permissions</h3>
            <p className="text-sm text-gray-600">
              Choose which actions this role can perform. 
              Selected: <span className="font-semibold">{selectedPermissions.size}</span> of {totalPermissions}
            </p>
          </div>
          
          <button
            type="button"
            onClick={toggleSelectAll}
            className={`px-3 py-1 text-sm rounded-md border ${
              selectAll 
                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' 
                : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
            }`}
          >
            {selectAll ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
        {Object.entries(filteredCategories).map(([categoryName, categoryData]) => {
          const isExpanded = expandedCategories.has(categoryName);
          const categoryPermissions = categoryData.permissions.map(p => `${p.resource}:${p.action}`);
          const selectedInCategory = categoryPermissions.filter(perm => selectedPermissions.has(perm)).length;
          const allSelected = selectedInCategory === categoryPermissions.length;
          const someSelected = selectedInCategory > 0;

          return (
            <div key={categoryName} className="border border-gray-200 rounded-lg">
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
                        <h4 className="text-sm font-medium text-gray-900">{categoryName}</h4>
                        <span className="text-xs text-gray-500">
                          ({selectedInCategory}/{categoryPermissions.length})
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{categoryData.description}</p>
                    </div>
                    <svg 
                      className={`h-5 w-5 text-gray-400 transform transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`} 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>

                  <div className="flex items-center space-x-2">
                    {/* Progress indicator */}
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          selectedInCategory === 0 ? 'bg-gray-300' :
                          allSelected ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${(selectedInCategory / categoryPermissions.length) * 100}%` }}
                      ></div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleCategoryPermissions(categoryData)}
                      className={`px-2 py-1 text-xs rounded ${
                        allSelected 
                          ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      {allSelected ? 'None' : 'All'}
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
                      const isSelected = selectedPermissions.has(permissionKey);

                      return (
                        <div
                          key={permissionKey}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                          onClick={() => togglePermission(permission.resource, permission.action)}
                        >
                          <div className="flex items-start space-x-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => togglePermission(permission.resource, permission.action)}
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
        })}
      </div>

      {Object.keys(filteredCategories).length === 0 && searchTerm && (
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No permissions found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search term to find the permissions you're looking for.
          </p>
        </div>
      )}

      {/* Selection Summary */}
      {selectedPermissions.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-900">
                {selectedPermissions.size} permission{selectedPermissions.size !== 1 ? 's' : ''} selected
              </h4>
              <p className="text-sm text-blue-700">
                This role will have access to the selected capabilities across the system.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}