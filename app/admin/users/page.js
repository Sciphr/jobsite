"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { useAnimationSettings } from "@/app/hooks/useAnimationSettings";
import { ResourcePermissionGuard } from "@/app/components/guards/PagePermissionGuard";
import Pagination from "../jobs/components/ui/Pagination";
import { 
  useUsers, 
  usePrefetchAdminData, 
  useUpdateUser, 
  useDeleteUser 
} from "@/app/hooks/useAdminData";
import { exportUsersToExcel, exportUsersToCSV } from "@/app/utils/usersExport";
import {
  Users,
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
  MoreHorizontal,
  Mail,
  Phone,
  Calendar,
  RefreshCw,
  Shield,
  ShieldCheck,
  UserCheck,
  UserX,
  Crown,
  User,
  FileDown,
  FileSpreadsheet,
  FileText,
  Loader2,
  Settings,
  X,
  Grid3X3,
  List,
  Move,
} from "lucide-react";
import UserRoleManager from "./components/UserRoleManager";
import SimpleDragDropFallback from "./components/SimpleDragDropFallback";

function AdminUsersContent() {
  const { data: session } = useSession();
  const { getStatCardClasses, getButtonClasses } = useThemeClasses();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState([]);
  const [roleBooleanOperator, setRoleBooleanOperator] = useState("OR"); // "AND" or "OR"
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleCountFilter, setRoleCountFilter] = useState("all");
  const [accountTypeFilter, setAccountTypeFilter] = useState("all");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [viewMode, setViewMode] = useState("list"); // "list" or "interactive"
  const { prefetchAll } = usePrefetchAdminData();
  const { data: users = [], isLoading, isError, error, refetch } = useUsers();
  const [refreshing, setRefreshing] = useState(false);
  
  // ✅ NEW: React Query mutations for optimistic updates
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  // Fetch available roles for role management
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await fetch('/api/roles');
        if (response.ok) {
          const data = await response.json();
          setAvailableRoles(data.roles || []);
        }
      } catch (error) {
        console.error('Error fetching roles:', error);
      }
    };

    fetchRoles();
  }, []);

  // ✅ Enhanced filtering with advanced options
  const filteredUsers = useMemo(() => {
    // Debug logging to understand the data structure
    console.log('filteredUsers useMemo - users:', users, 'type:', typeof users, 'isArray:', Array.isArray(users));
    
    // Ensure users is an array before filtering
    if (!users || !Array.isArray(users)) {
      console.log('filteredUsers - returning empty array because users is not array');
      return [];
    }
    
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Enhanced role filter with multiple selection and boolean operations
    if (roleFilter.length > 0) {
      filtered = filtered.filter((user) => {
        const userRoleNames = user.user_roles?.map(ur => ur.roles.name.toLowerCase().replace(' ', '_')) || [];
        
        if (roleBooleanOperator === "AND") {
          // ALL selected roles must be present
          return roleFilter.every(selectedRole => userRoleNames.includes(selectedRole));
        } else {
          // ANY of the selected roles must be present (OR)
          return roleFilter.some(selectedRole => userRoleNames.includes(selectedRole));
        }
      });
    }

    // Status filter
    if (statusFilter !== "all") {
      const isActive = statusFilter === "active";
      filtered = filtered.filter((user) => user.isActive === isActive);
    }

    // Role count filter
    if (roleCountFilter !== "all") {
      filtered = filtered.filter((user) => {
        const roleCount = user.user_roles?.length || 0;
        switch (roleCountFilter) {
          case "single":
            return roleCount === 1;
          case "multiple":
            return roleCount >= 2;
          case "none":
            return roleCount === 0;
          default:
            return true;
        }
      });
    }

    // Account type filter
    if (accountTypeFilter !== "all") {
      filtered = filtered.filter((user) => {
        switch (accountTypeFilter) {
          case "local":
            return user.account_type === "local" || !user.account_type;
          case "ldap":
            return user.account_type === "ldap";
          case "saml":
            return user.account_type === "saml";
          case "combined":
            return user.account_type === "combined";
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [users, searchTerm, roleFilter, roleBooleanOperator, statusFilter, roleCountFilter, accountTypeFilter]);

  // ✅ NEW: Client-side pagination
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentPage, itemsPerPage]);

  // Pagination metadata
  const pagination = useMemo(() => {
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    return {
      page: currentPage,
      pages: totalPages,
      total: filteredUsers.length,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1,
    };
  }, [filteredUsers.length, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, roleBooleanOperator, statusFilter, roleCountFilter, accountTypeFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error("Error refreshing users:", error);
    } finally {
      setRefreshing(false);
    }
  };


  // Handle role filter selection
  const handleRoleFilterChange = (roleId) => {
    setRoleFilter(prev => {
      if (prev.includes(roleId)) {
        // Remove role if already selected
        return prev.filter(id => id !== roleId);
      } else {
        // Add role if not selected
        return [...prev, roleId];
      }
    });
  };

  // Clear all role filters
  const clearRoleFilters = () => {
    setRoleFilter([]);
  };

  // Role dropdown state
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.role-dropdown-container')) {
        setIsRoleDropdownOpen(false);
      }
    };

    if (isRoleDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isRoleDropdownOpen]);

  const handleRoleChange = async (userId, roleId, action) => {
    try {
      const url = `/api/roles/${roleId}/users/${userId}`;
      const method = action === 'add' ? 'POST' : 'DELETE';
      
      const response = await fetch(url, { method });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} role`);
      }

      // Refresh users data to show updated roles
      await refetch();
    } catch (error) {
      console.error('Error managing role:', error);
    }
  };


  // Bulk role assignment handler
  const handleBulkRoleAssignment = async (roleId, action) => {
    if (selectedUsers.length === 0) return;

    const roleName = availableRoles.find(r => r.id === roleId)?.name || 'Unknown Role';
    const actionText = action === 'add' ? 'assign' : 'remove';
    const actionPastTense = action === 'add' ? 'assigned' : 'removed';
    
    const confirmMessage = `Are you sure you want to ${actionText} the "${roleName}" role ${action === 'add' ? 'to' : 'from'} ${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''}?`;
    
    if (!confirm(confirmMessage)) return;

    const results = {
      success: 0,
      failed: 0,
      alreadyHad: 0,
      didntHave: 0,
      errors: []
    };

    try {
      // Process each user
      for (const userId of selectedUsers) {
        try {
          const url = `/api/roles/${roleId}/users/${userId}`;
          const method = action === 'add' ? 'POST' : 'DELETE';
          
          const response = await fetch(url, { method });
          
          if (response.ok) {
            results.success++;
          } else {
            const errorData = await response.json();
            if (errorData.error?.includes('already assigned') || errorData.error?.includes('already has')) {
              results.alreadyHad++;
            } else if (errorData.error?.includes('not assigned') || errorData.error?.includes('not found')) {
              results.didntHave++;
            } else {
              results.failed++;
              results.errors.push(`User ${userId}: ${errorData.error}`);
            }
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`User ${userId}: ${error.message}`);
        }
      }

      // Show results summary
      let message = '';
      if (results.success > 0) {
        message += `✅ ${results.success} user${results.success !== 1 ? 's' : ''} successfully ${actionPastTense}. `;
      }
      if (results.alreadyHad > 0) {
        message += `ℹ️ ${results.alreadyHad} user${results.alreadyHad !== 1 ? 's' : ''} already had the role. `;
      }
      if (results.didntHave > 0) {
        message += `ℹ️ ${results.didntHave} user${results.didntHave !== 1 ? 's' : ''} didn't have the role. `;
      }
      if (results.failed > 0) {
        message += `❌ ${results.failed} operation${results.failed !== 1 ? 's' : ''} failed.`;
      }

      alert(message || 'No changes were made.');

      // Refresh the user list
      if (results.success > 0) {
        await refetch();
        setSelectedUsers([]); // Clear selection
      }

    } catch (error) {
      console.error('Bulk role assignment error:', error);
      alert('An error occurred during bulk role assignment. Please try again.');
    }
  };

  // Role templates handler  
  const handleBulkRoleTemplate = async (templateType) => {
    if (selectedUsers.length === 0) return;

    // Define role templates
    const templates = {
      new_employee: {
        name: 'New Employee',
        roles: ['User']
      },
      manager: {
        name: 'Team Manager', 
        roles: ['User', 'HR']
      },
      admin: {
        name: 'Administrator',
        roles: ['User', 'Admin']
      },
      super_admin: {
        name: 'Super Administrator',
        roles: ['User', 'HR', 'Admin', 'Super Admin']
      }
    };

    const template = templates[templateType];
    if (!template) return;

    const confirmMessage = `Are you sure you want to apply the "${template.name}" template to ${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''}?\n\nThis will assign the following roles:\n• ${template.roles.join('\n• ')}`;
    
    if (!confirm(confirmMessage)) return;

    let totalSuccess = 0;
    let totalFailed = 0;

    try {
      // For each user, assign all roles in the template
      for (const userId of selectedUsers) {
        for (const roleName of template.roles) {
          // Find the role ID by name
          const role = availableRoles.find(r => r.name === roleName);
          if (!role) continue;

          try {
            const response = await fetch(`/api/roles/${role.id}/users/${userId}`, {
              method: 'POST'
            });
            
            if (response.ok) {
              totalSuccess++;
            } else {
              const errorData = await response.json();
              // Don't count "already assigned" as failures
              if (!errorData.error?.includes('already assigned') && !errorData.error?.includes('already has')) {
                totalFailed++;
              }
            }
          } catch (error) {
            totalFailed++;
          }
        }
      }

      // Show results
      let message = `Template "${template.name}" applied!\n`;
      if (totalSuccess > 0) {
        message += `✅ ${totalSuccess} role assignments completed successfully.\n`;
      }
      if (totalFailed > 0) {
        message += `❌ ${totalFailed} role assignments failed.`;
      }

      alert(message);

      // Refresh the user list
      if (totalSuccess > 0) {
        await refetch();
        setSelectedUsers([]); // Clear selection
      }

    } catch (error) {
      console.error('Template assignment error:', error);
      alert('An error occurred during template assignment. Please try again.');
    }
  };

  // ✅ NEW: Optimistic update functions using React Query
  const updateUserStatus = async (userId, isActive) => {
    try {
      await updateUserMutation.mutateAsync({
        userId,
        userData: { isActive },
      });
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  };

  const updateUserRole = async (userId, role, privilegeLevel) => {
    try {
      await updateUserMutation.mutateAsync({
        userId,
        userData: { role, privilegeLevel },
      });
    } catch (error) {
      console.error("Error updating user role:", error);
    }
  };

  const deleteUser = async (userId) => {
    if (
      !confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await deleteUserMutation.mutateAsync(userId);
      setSelectedUsers((prev) => prev.filter((id) => id !== userId));
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  // ✅ NEW: Export functionality
  const handleExport = (format) => {
    const filters = {
      searchTerm,
      roleFilter: roleFilter.length > 0 ? roleFilter : null,
      roleBooleanOperator,
      statusFilter: statusFilter === 'all' ? null : statusFilter
    };

    if (format === 'excel') {
      exportUsersToExcel(filteredUsers, filters);
    } else if (format === 'csv') {
      exportUsersToCSV(filteredUsers, filters);
    }
  };

  // ✅ NEW: Bulk actions handlers
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedUsers(paginatedUsers.map((user) => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId, checked) => {
    if (checked) {
      setSelectedUsers((prev) => [...prev, userId]);
    } else {
      setSelectedUsers((prev) => prev.filter((id) => id !== userId));
    }
  };

  const handleBulkRoleUpdate = async (newRole, privilegeLevel) => {
    if (selectedUsers.length === 0) return;

    const roleLabel = roleOptions.find(r => r.value === newRole)?.label || newRole;
    const confirmMessage = `Are you sure you want to change ${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''} to ${roleLabel} role?`;
    
    if (!confirm(confirmMessage)) return;

    try {
      // Update each selected user
      const updatePromises = selectedUsers.map(userId =>
        updateUserMutation.mutateAsync({
          userId,
          userData: { role: newRole, privilegeLevel },
        })
      );

      await Promise.all(updatePromises);
      
      // Clear selection after successful update
      setSelectedUsers([]);
    } catch (error) {
      console.error(`Error updating users to ${newRole}:`, error);
      alert(`Failed to update some users. Please try again.`);
    }
  };

  const handleBulkStatusUpdate = async (isActive) => {
    if (selectedUsers.length === 0) return;

    const action = isActive ? 'activate' : 'deactivate';
    const confirmMessage = `Are you sure you want to ${action} ${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''}?`;
    
    if (!confirm(confirmMessage)) return;

    try {
      // Update each selected user
      const updatePromises = selectedUsers.map(userId =>
        updateUserMutation.mutateAsync({
          userId,
          userData: { isActive },
        })
      );

      await Promise.all(updatePromises);
      
      // Clear selection after successful update
      setSelectedUsers([]);
    } catch (error) {
      console.error(`Error ${action}ing users:`, error);
      alert(`Failed to ${action} some users. Please try again.`);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) return;

    const confirmMessage = `Are you sure you want to delete ${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''}? This action cannot be undone.`;
    
    if (!confirm(confirmMessage)) return;

    try {
      // Delete each selected user
      const deletePromises = selectedUsers.map(userId =>
        deleteUserMutation.mutateAsync(userId)
      );

      await Promise.all(deletePromises);
      
      // Clear selection after successful deletion
      setSelectedUsers([]);
    } catch (error) {
      console.error('Error deleting users:', error);
      alert('Failed to delete some users. Please try again.');
    }
  };

  const getRoleIcon = (role) => {
    const icons = {
      user: User,
      hr: UserCheck,
      admin: Shield,
      super_admin: Crown,
    };
    return icons[role] || User;
  };

  const getRoleColor = (role) => {
    const colors = {
      user: "text-gray-600 bg-gray-100",
      hr: "text-blue-600 bg-blue-100",
      admin: "text-green-600 bg-green-100",
      super_admin: "text-purple-600 bg-purple-100",
    };
    return colors[role] || "text-gray-600 bg-gray-100";
  };

  const roleOptions = [
    { value: "user", label: "User", privilegeLevel: 0 },
    { value: "hr", label: "HR", privilegeLevel: 1 },
    { value: "admin", label: "Admin", privilegeLevel: 2 },
    { value: "super_admin", label: "Super Admin", privilegeLevel: 3 },
  ];

  const statusOptions = ["active", "inactive"];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="admin-card p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold admin-text">Users Management</h1>
          <p className="admin-text-light mt-2 text-sm sm:text-base">
            Manage user accounts and permissions
          </p>
          
          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 mt-3">
            <span className="text-xs admin-text-light mr-2">View:</span>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 ${
                viewMode === "list"
                  ? "bg-purple-100 text-purple-700 border border-purple-200"
                  : "admin-text-light hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <List className="h-3 w-3" />
              <span>List View</span>
            </button>
            <button
              onClick={() => setViewMode("interactive")}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 ${
                viewMode === "interactive"
                  ? "bg-purple-100 text-purple-700 border border-purple-200"
                  : "admin-text-light hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <Settings className="h-3 w-3" />
              <span>Visual Mode</span>
            </button>
          </div>
        </div>
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
          {/* ✅ NEW: Export Dropdown */}
          <div className="relative group">
            <button
              className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 shadow-sm ${getButtonClasses("secondary")}`}
            >
              <FileDown className="h-4 w-4" />
              <span>Export</span>
            </button>
            <div className="absolute right-0 top-10 w-48 admin-card rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 border">
              <div className="p-2">
                <button
                  onClick={() => handleExport('excel')}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-left text-sm admin-text hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                >
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  <span>Export to Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-left text-sm admin-text hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                >
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span>Export to CSV</span>
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 shadow-sm ${getButtonClasses("primary")} ${refreshing ? "opacity-50" : ""}`}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
          <Link
            href="/admin/users/create"
            className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 font-medium shadow-md hover:shadow-lg ${getButtonClasses("accent")}`}
          >
            <Plus className="h-4 w-4" />
            <span>Add User</span>
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {roleOptions.map((role, index) => {
          // Count users with this role in new multiple roles system
          const count = (users && Array.isArray(users) ? users : []).filter((user) => {
            // Check both old role field and new user_roles
            if (user.role === role.value) return true;
            if (user.user_roles?.some(ur => ur.roles.name.toLowerCase().replace(' ', '_') === role.value)) return true;
            return false;
          }).length;
          const RoleIcon = getRoleIcon(role.value);
          const statClasses = getStatCardClasses(index);

          return (
            <div
              key={role.value}
              className={`stat-card admin-card p-6 rounded-lg shadow ${statClasses.border} ${statClasses.hover} hover:shadow-md transition-all duration-200 cursor-pointer`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold admin-text">{count}</div>
                  <div className="text-sm admin-text-light font-medium">
                    {role.label}s
                  </div>
                </div>
                <div className={`stat-icon p-3 rounded-lg ${statClasses.bg}`}>
                  <RoleIcon className={`h-6 w-6 ${statClasses.icon}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Enhanced Filters - Only show in list view */}
      {viewMode === "list" && (
        <div className="admin-card p-4 sm:p-6 rounded-lg shadow">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium admin-text">Filter & Search</h3>
            <button
              onClick={() => {
                setSearchTerm('');
                setRoleFilter([]);
                setRoleBooleanOperator('OR');
                setStatusFilter('all');
                setRoleCountFilter('all');
                setAccountTypeFilter('all');
              }}
              className="text-xs text-purple-600 hover:text-purple-800 font-medium"
            >
              Clear All Filters
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Enhanced Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users, emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-600 dark:placeholder-gray-400 admin-text bg-white dark:bg-gray-700"
              />
            </div>

            {/* Custom Multi-Select Role Filter */}
            <div className="relative role-dropdown-container">
              <button
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 admin-text bg-white dark:bg-gray-700 text-left flex items-center justify-between"
              >
                <span>
                  {roleFilter.length === 0 
                    ? "All Roles"
                    : roleFilter.length === 1
                    ? availableRoles.find(r => r.name.toLowerCase().replace(' ', '_') === roleFilter[0])?.name || "Unknown Role"
                    : `${roleFilter.length} roles selected (${roleBooleanOperator})`
                  }
                </span>
                <svg className={`h-4 w-4 transition-transform duration-200 ${isRoleDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isRoleDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                  
                  {/* Clear All Option */}
                  <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                    <button
                      onClick={() => {
                        setRoleFilter([]);
                        setIsRoleDropdownOpen(false);
                      }}
                      className="w-full text-left px-2 py-1 text-sm admin-text hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                    >
                      All Roles
                    </button>
                  </div>

                  {/* Role Options */}
                  <div className="p-2">
                    {availableRoles.map((role) => {
                      const roleId = role.name.toLowerCase().replace(' ', '_');
                      const isSelected = roleFilter.includes(roleId);
                      
                      return (
                        <label key={role.id} className="flex items-center px-2 py-1 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 rounded">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleRoleFilterChange(roleId)}
                            className="mr-3 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className={`${isSelected ? 'font-medium text-purple-700' : 'admin-text'}`}>
                            {role.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  {/* Boolean Logic Controls - Only show if multiple selected */}
                  {roleFilter.length > 1 && (
                    <div className="p-2 border-t border-gray-200 dark:border-gray-600">
                      <div className="text-xs admin-text-light mb-2">Match logic:</div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setRoleBooleanOperator("OR")}
                          className={`flex-1 px-2 py-1 text-xs rounded transition-colors duration-200 ${
                            roleBooleanOperator === "OR" 
                              ? "bg-blue-100 text-blue-800 border border-blue-300" 
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          ANY (OR)
                        </button>
                        <button
                          onClick={() => setRoleBooleanOperator("AND")}
                          className={`flex-1 px-2 py-1 text-xs rounded transition-colors duration-200 ${
                            roleBooleanOperator === "AND" 
                              ? "bg-blue-100 text-blue-800 border border-blue-300" 
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          ALL (AND)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Clear/Close Actions */}
                  <div className="p-2 border-t border-gray-200 dark:border-gray-600 flex justify-between">
                    {roleFilter.length > 0 && (
                      <button
                        onClick={clearRoleFilters}
                        className="text-xs text-red-600 hover:text-red-800 transition-colors duration-200"
                      >
                        Clear All
                      </button>
                    )}
                    <button
                      onClick={() => setIsRoleDropdownOpen(false)}
                      className="text-xs text-purple-600 hover:text-purple-800 transition-colors duration-200 ml-auto"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 admin-text bg-white dark:bg-gray-700"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Role Count Filter */}  
            <select
              value={roleCountFilter}
              onChange={(e) => setRoleCountFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 admin-text bg-white dark:bg-gray-700"
            >
              <option value="all">Any Role Count</option>
              <option value="single">Single Role (1)</option>
              <option value="multiple">Multiple Roles (2+)</option>
              <option value="none">No Roles (0)</option>
            </select>

            {/* Account Type Filter */}
            <select
              value={accountTypeFilter}
              onChange={(e) => setAccountTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 admin-text bg-white dark:bg-gray-700"
            >
              <option value="all">All Account Types</option>
              <option value="local">Local Accounts</option>
              <option value="ldap">LDAP Accounts</option>
              <option value="saml">SAML Accounts</option>
              <option value="combined">Combined (LDAP + SAML)</option>
            </select>
          </div>

          {/* Filter Results Summary */}
          <div className="flex items-center justify-end text-sm admin-text-light">
            <span>
              Showing {filteredUsers.length} of {users && Array.isArray(users) ? users.length : 0} users
              {(searchTerm || roleFilter.length > 0 || statusFilter !== 'all' || roleCountFilter !== 'all' || accountTypeFilter !== 'all') && 
                <span className="ml-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                  Filtered
                </span>
              }
            </span>
          </div>
        </div>
        </div>
      )}

      {/* ✅ NEW: Bulk Actions - Only show in list view */}
      {viewMode === "list" && selectedUsers.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex flex-col space-y-3 sm:flex-row items-start sm:items-center justify-between">
            <span className="text-blue-800 dark:text-blue-200 font-medium">
              {selectedUsers.length} user{selectedUsers.length !== 1 ? "s" : ""} selected
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {/* Bulk Role Actions */}
              <div className="relative group">
                <button 
                  disabled={updateUserMutation.isLoading || deleteUserMutation.isLoading}
                  className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                >
                  {updateUserMutation.isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : null}
                  <span>Assign Roles</span>
                </button>
                {/* Invisible bridge to prevent dropdown from disappearing */}
                <div className="absolute right-0 top-6 w-48 h-4 invisible group-hover:visible z-10"></div>
                <div className="absolute right-0 top-9 w-48 admin-card rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 border">
                  <div className="p-2">
                    <div className="text-xs font-medium admin-text-light uppercase tracking-wider px-3 py-2 border-b border-gray-200">
                      Add Roles to Selected Users
                    </div>
                    {availableRoles.map((role) => (
                      <button
                        key={role.id}
                        onClick={() => handleBulkRoleAssignment(role.id, 'add')}
                        disabled={updateUserMutation.isLoading || deleteUserMutation.isLoading}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-left text-sm admin-text hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="h-3 w-3 text-green-600" />
                        <span>Add {role.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Remove Roles Dropdown */}
              <div className="relative group">
                <button 
                  disabled={updateUserMutation.isLoading || deleteUserMutation.isLoading}
                  className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                >
                  {updateUserMutation.isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : null}
                  <span>Remove Roles</span>
                </button>
                <div className="absolute right-0 top-6 w-48 h-4 invisible group-hover:visible z-10"></div>
                <div className="absolute right-0 top-9 w-48 admin-card rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 border">
                  <div className="p-2">
                    <div className="text-xs font-medium admin-text-light uppercase tracking-wider px-3 py-2 border-b border-gray-200">
                      Remove Roles from Selected Users
                    </div>
                    {availableRoles.map((role) => (
                      <button
                        key={role.id}
                        onClick={() => handleBulkRoleAssignment(role.id, 'remove')}
                        disabled={updateUserMutation.isLoading || deleteUserMutation.isLoading}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-left text-sm admin-text hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <X className="h-3 w-3 text-red-600" />
                        <span>Remove {role.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Role Templates Quick Actions */}
              <div className="relative group">
                <button 
                  disabled={updateUserMutation.isLoading || deleteUserMutation.isLoading}
                  className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                >
                  {updateUserMutation.isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : null}
                  <span>Quick Assign</span>
                </button>
                <div className="absolute right-0 top-6 w-56 h-4 invisible group-hover:visible z-10"></div>
                <div className="absolute right-0 top-9 w-56 admin-card rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 border">
                  <div className="p-2">
                    <div className="text-xs font-medium admin-text-light uppercase tracking-wider px-3 py-2 border-b border-gray-200">
                      Role Templates
                    </div>
                    
                    <button
                      onClick={() => handleBulkRoleTemplate('new_employee')}
                      disabled={updateUserMutation.isLoading || deleteUserMutation.isLoading}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-left text-sm admin-text hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <User className="h-3 w-3 text-blue-600" />
                      <div>
                        <div className="font-medium">New Employee</div>
                        <div className="text-xs text-gray-500">Assigns basic User role</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleBulkRoleTemplate('manager')}
                      disabled={updateUserMutation.isLoading || deleteUserMutation.isLoading}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-left text-sm admin-text hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <UserCheck className="h-3 w-3 text-green-600" />
                      <div>
                        <div className="font-medium">Team Manager</div>
                        <div className="text-xs text-gray-500">User + HR roles</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleBulkRoleTemplate('admin')}
                      disabled={updateUserMutation.isLoading || deleteUserMutation.isLoading}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-left text-sm admin-text hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Shield className="h-3 w-3 text-orange-600" />
                      <div>
                        <div className="font-medium">Administrator</div>
                        <div className="text-xs text-gray-500">User + Admin roles</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleBulkRoleTemplate('super_admin')}
                      disabled={updateUserMutation.isLoading || deleteUserMutation.isLoading}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-left text-sm admin-text hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Crown className="h-3 w-3 text-purple-600" />
                      <div>
                        <div className="font-medium">Super Administrator</div>
                        <div className="text-xs text-gray-500">All available roles</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => handleBulkStatusUpdate(true)}
                disabled={updateUserMutation.isLoading || deleteUserMutation.isLoading}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
              >
                {updateUserMutation.isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : null}
                <span>Activate</span>
              </button>
              <button 
                onClick={() => handleBulkStatusUpdate(false)}
                disabled={updateUserMutation.isLoading || deleteUserMutation.isLoading}
                className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
              >
                {updateUserMutation.isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : null}
                <span>Deactivate</span>
              </button>
              <button 
                onClick={handleBulkDelete}
                disabled={updateUserMutation.isLoading || deleteUserMutation.isLoading}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
              >
                {deleteUserMutation.isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : null}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conditional Content Based on View Mode */}
      {viewMode === "list" ? (
        <>
          {/* Users Table */}
          <div className="admin-card rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium admin-text-light uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={paginatedUsers.length > 0 && paginatedUsers.every(user => selectedUsers.includes(user.id))}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium admin-text-light uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium admin-text-light uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium admin-text-light uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium admin-text-light uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium admin-text-light uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium admin-text-light uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="admin-card divide-y divide-gray-200">
              {paginatedUsers.map((user) => {
                const RoleIcon = getRoleIcon(user.role);
                const roleColor = getRoleColor(user.role);

                return (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div
                            className={`h-10 w-10 rounded-full flex items-center justify-center ${getButtonClasses("accent")}`}
                          >
                            <span className="text-sm font-medium text-white">
                              {user.firstName?.[0] ||
                                user.email[0].toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium admin-text">
                            {user.firstName && user.lastName
                              ? `${user.firstName} ${user.lastName}`
                              : user.email}
                          </div>
                          <div className="text-sm admin-text-light flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {user.email}
                          </div>
                          {user.phone && (
                            <div className="text-sm admin-text-light flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {user.phone}
                            </div>
                          )}
                          {/* Account Type Indicators */}
                          {user.account_type && user.account_type !== 'local' && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {user.account_type === 'ldap' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                                  LDAP Account
                                </span>
                              )}
                              {user.account_type === 'saml' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                                  SAML Account
                                </span>
                              )}
                              {user.account_type === 'combined' && (
                                <>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                                    LDAP
                                  </span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                                    SAML
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <UserRoleManager
                        user={user}
                        availableRoles={availableRoles}
                        onRoleChange={handleRoleChange}
                        isLoading={updateUserMutation.isLoading}
                        compact={true}
                      />
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() =>
                          updateUserStatus(user.id, !user.isActive)
                        }
                        disabled={user.id === session?.user?.id || updateUserMutation.isLoading}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors duration-200 ${
                          user.isActive
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : "bg-red-100 text-red-800 hover:bg-red-200"
                        } ${
                          user.id === session?.user?.id || updateUserMutation.isLoading
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        {updateUserMutation.isLoading ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Updating...
                          </>
                        ) : user.isActive ? (
                          <>
                            <UserCheck className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <UserX className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </button>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm admin-text-light">
                      <div className="space-y-1">
                        <div>Jobs: {user._count?.createdJobs || 0}</div>
                        <div>
                          Applications: {user._count?.applications || 0}
                        </div>
                        <div>Saved: {user._count?.savedJobs || 0}</div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm admin-text-light">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-1 sm:space-x-2">
                        <Link
                          href={`/admin/users/${user.id}/roles`}
                          className="text-blue-600 hover:text-blue-900 p-2 sm:p-2 hover:bg-blue-50 rounded transition-colors duration-200 touch-action-manipulation"
                          title="Manage roles"
                        >
                          <Settings className="h-4 w-4" />
                        </Link>
                        
                        {user.account_type !== 'ldap' && user.account_type !== 'saml' && user.account_type !== 'combined' ? (
                          <Link
                            href={`/admin/users/${user.id}/edit`}
                            className="text-purple-600 hover:text-purple-900 p-2 sm:p-2 hover:bg-purple-50 rounded transition-colors duration-200 touch-action-manipulation"
                            title="Edit user"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Link>
                        ) : (
                          <div 
                            className="text-gray-400 p-2 sm:p-2 cursor-not-allowed"
                            title={`${user.account_type === 'combined' ? 'External account' : user.account_type === 'ldap' ? 'LDAP' : 'SAML'} users cannot be edited`}
                          >
                            <Edit3 className="h-4 w-4" />
                          </div>
                        )}

                        {user.id !== session?.user?.id && (
                          <button
                            onClick={() => deleteUser(user.id)}
                            disabled={deleteUserMutation.isLoading}
                            className={`text-red-600 hover:text-red-900 p-2 sm:p-2 hover:bg-red-50 rounded transition-colors duration-200 touch-action-manipulation ${deleteUserMutation.isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="Delete user"
                          >
                            {deleteUserMutation.isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ NEW: Pagination */}
      {filteredUsers.length > itemsPerPage && (
        <Pagination
          currentPage={currentPage}
          totalPages={pagination.pages}
          totalItems={filteredUsers.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          className="mt-8"
        />
      )}

      {/* Empty State */}
      {paginatedUsers.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium admin-text mb-2">
            No users found
          </h3>
          <p className="admin-text-light mb-6">
            {searchTerm || roleFilter.length > 0 || statusFilter !== "all"
              ? "Try adjusting your filters to see more results."
              : "Get started by adding your first user."}
          </p>
          {!searchTerm && roleFilter.length === 0 && statusFilter === "all" && (
            <Link
              href="/admin/users/create"
              className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${getButtonClasses("accent")}`}
            >
              <Plus className="h-4 w-4" />
              <span>Add Your First User</span>
            </Link>
          )}
        </div>
      )}
        </>
      ) : (
        /* Visual Role Assignment View */
        <div>
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              <strong>✨ Visual Role Assignment:</strong> Perfect for multiple roles per user. Select users and roles to assign or remove roles with clear visual feedback.
            </p>
          </div>
          <SimpleDragDropFallback
            users={filteredUsers}
            roles={availableRoles}
            onRoleChange={handleRoleChange}
            isLoading={isLoading}
          />
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              💡 <strong>Why this works better than drag-and-drop:</strong> With multiple roles per user, it's unclear what dragging means. 
              This interface makes every action explicit - select a user, select a role, then choose assign or remove.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}

export default function AdminUsers() {
  return (
    <ResourcePermissionGuard 
      resource="users" 
      actions={["view"]}
      fallbackPath="/admin/dashboard"
    >
      <AdminUsersContent />
    </ResourcePermissionGuard>
  );
}
