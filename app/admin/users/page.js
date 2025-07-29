"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { useAnimationSettings } from "@/app/hooks/useAnimationSettings";
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
} from "lucide-react";

export default function AdminUsers() {
  const { data: session } = useSession();
  const { getStatCardClasses, getButtonClasses } = useThemeClasses();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const { prefetchAll } = usePrefetchAdminData();
  const { data: users = [], isLoading, isError, error, refetch } = useUsers();
  const [refreshing, setRefreshing] = useState(false);
  
  // ✅ NEW: React Query mutations for optimistic updates
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  // ✅ REPLACE WITH THIS:
  const filteredUsers = useMemo(() => {
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

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      const isActive = statusFilter === "active";
      filtered = filtered.filter((user) => user.isActive === isActive);
    }

    return filtered;
  }, [users, searchTerm, roleFilter, statusFilter]); // ✅ Depend on actual data, not .length

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
  }, [searchTerm, roleFilter, statusFilter]);

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
      roleFilter: roleFilter === 'all' ? null : roleFilter,
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
          const count = users.filter((user) => user.role === role.value).length;
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

      {/* Filters */}
      <div className="admin-card p-4 sm:p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-600 dark:placeholder-gray-400 admin-text bg-white dark:bg-gray-700"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 admin-text bg-white dark:bg-gray-700"
          >
            <option value="all">All Roles</option>
            {roleOptions.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 admin-text"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* ✅ NEW: Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex flex-col space-y-3 sm:flex-row items-start sm:items-center justify-between">
            <span className="text-blue-800 dark:text-blue-200 font-medium">
              {selectedUsers.length} user{selectedUsers.length !== 1 ? "s" : ""} selected
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {/* Role Change Dropdown */}
              <div className="relative group">
                <button 
                  disabled={updateUserMutation.isLoading || deleteUserMutation.isLoading}
                  className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                >
                  {updateUserMutation.isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : null}
                  <span>Change Role</span>
                </button>
                {/* Invisible bridge to prevent dropdown from disappearing */}
                <div className="absolute right-0 top-6 w-40 h-4 invisible group-hover:visible z-10"></div>
                <div className="absolute right-0 top-9 w-40 admin-card rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 border">
                  <div className="p-2">
                    {roleOptions.map((role) => (
                      <button
                        key={role.value}
                        onClick={() => handleBulkRoleUpdate(role.value, role.privilegeLevel)}
                        disabled={updateUserMutation.isLoading || deleteUserMutation.isLoading}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-left text-sm admin-text hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span>{role.label}</span>
                      </button>
                    ))}
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
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.role}
                        onChange={(e) => {
                          const selectedRole = roleOptions.find(
                            (r) => r.value === e.target.value
                          );
                          updateUserRole(
                            user.id,
                            e.target.value,
                            selectedRole.privilegeLevel
                          );
                        }}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border-0 focus:ring-2 focus:ring-purple-500 ${roleColor} dark:border-gray-600 ${updateUserMutation.isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={user.id === session?.user?.id || updateUserMutation.isLoading}
                      >
                        {roleOptions.map((role) => (
                          <option
                            key={role.value}
                            value={role.value}
                            className="text-gray-800 bg-white"
                          >
                            {role.label}
                          </option>
                        ))}
                      </select>
                      {updateUserMutation.isLoading && (
                        <Loader2 className="inline-block ml-2 h-3 w-3 animate-spin text-gray-400" />
                      )}
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
                          href={`/admin/users/${user.id}/edit`}
                          className="text-purple-600 hover:text-purple-900 p-2 sm:p-2 hover:bg-purple-50 rounded transition-colors duration-200 touch-action-manipulation"
                          title="Edit user"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Link>

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
            {searchTerm || roleFilter !== "all" || statusFilter !== "all"
              ? "Try adjusting your filters to see more results."
              : "Get started by adding your first user."}
          </p>
          {!searchTerm && roleFilter === "all" && statusFilter === "all" && (
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
    </div>
  );
}
