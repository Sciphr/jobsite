"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Users,
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldX,
  Mail,
  Phone,
  Calendar,
  MoreHorizontal,
  UserPlus,
  Crown,
  User,
  Briefcase,
  FileText,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  Upload,
  Settings,
} from "lucide-react";

export default function AdminUsers() {
  const { data: session } = useSession();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [privilegeFilter, setPrivilegeFilter] = useState("all");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter, privilegeFilter]);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase())
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

    // Privilege filter
    if (privilegeFilter !== "all") {
      const privilegeLevel = parseInt(privilegeFilter);
      filtered = filtered.filter(
        (user) => user.privilegeLevel === privilegeLevel
      );
    }

    setFilteredUsers(filtered);
  };

  const updateUserStatus = async (userId, isActive) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        setUsers((prev) =>
          prev.map((user) =>
            user.id === userId ? { ...user, isActive } : user
          )
        );
      }
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  };

  const updateUserRole = async (userId, role, privilegeLevel) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, privilegeLevel }),
      });

      if (response.ok) {
        setUsers((prev) =>
          prev.map((user) =>
            user.id === userId ? { ...user, role, privilegeLevel } : user
          )
        );
      }
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
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setUsers((prev) => prev.filter((user) => user.id !== userId));
        setSelectedUsers((prev) => prev.filter((id) => id !== userId));
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map((user) => user.id));
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

  const getRoleColor = (role) => {
    const colors = {
      user: "bg-gray-100 text-gray-800",
      hr: "bg-green-100 text-green-800",
      admin: "bg-blue-100 text-blue-800",
      super_admin: "bg-purple-100 text-purple-800",
    };
    return colors[role] || "bg-gray-100 text-gray-800";
  };

  const getRoleIcon = (role, privilegeLevel) => {
    if (privilegeLevel >= 3) return Crown;
    if (privilegeLevel >= 2) return ShieldCheck;
    if (privilegeLevel >= 1) return Shield;
    return User;
  };

  const getPrivilegeName = (level) => {
    const names = {
      0: "User",
      1: "HR",
      2: "Admin",
      3: "Super Admin",
    };
    return names[level] || "Unknown";
  };

  const roleOptions = [
    { value: "user", label: "User", level: 0 },
    { value: "hr", label: "HR", level: 1 },
    { value: "admin", label: "Admin", level: 2 },
    { value: "super_admin", label: "Super Admin", level: 3 },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white rounded-lg shadow border">
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users Management</h1>
          <p className="text-gray-600 mt-2">
            Manage user accounts and permissions
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchUsers}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium shadow-md hover:shadow-lg"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {users.length}
              </div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
            <Users className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {users.filter((u) => u.isActive).length}
              </div>
              <div className="text-sm text-gray-600">Active Users</div>
            </div>
            <Eye className="h-8 w-8 text-green-400" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {users.filter((u) => u.privilegeLevel > 0).length}
              </div>
              <div className="text-sm text-gray-600">Admin Users</div>
            </div>
            <ShieldCheck className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {
                  users.filter(
                    (u) =>
                      u.createdAt >
                      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                  ).length
                }
              </div>
              <div className="text-sm text-gray-600">New This Month</div>
            </div>
            <UserPlus className="h-8 w-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Privilege Filter */}
          <select
            value={privilegeFilter}
            onChange={(e) => setPrivilegeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Privileges</option>
            <option value="0">Users (0)</option>
            <option value="1">HR (1)</option>
            <option value="2">Admin (2)</option>
            <option value="3">Super Admin (3)</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-800 font-medium">
              {selectedUsers.length} user{selectedUsers.length !== 1 ? "s" : ""}{" "}
              selected
            </span>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                Activate
              </button>
              <button className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700">
                Deactivate
              </button>
              <button className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Users ({filteredUsers.length})
            </h2>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={
                  selectedUsers.length === filteredUsers.length &&
                  filteredUsers.length > 0
                }
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Select all</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredUsers.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-12 px-6 py-3 text-left">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role & Privileges
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => {
                  const RoleIcon = getRoleIcon(user.role, user.privilegeLevel);
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={(e) =>
                            handleSelectUser(user.id, e.target.checked)
                          }
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                            {user.firstName?.charAt(0)?.toUpperCase() ||
                              user.email?.charAt(0)?.toUpperCase() ||
                              "U"}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.firstName || user.lastName
                                ? `${user.firstName || ""} ${
                                    user.lastName || ""
                                  }`.trim()
                                : "No Name"}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center space-x-1">
                              <Mail className="h-3 w-3" />
                              <span>{user.email}</span>
                            </div>
                            {user.phone && (
                              <div className="text-sm text-gray-500 flex items-center space-x-1">
                                <Phone className="h-3 w-3" />
                                <span>{user.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <RoleIcon className="h-4 w-4 text-gray-400" />
                          <select
                            value={user.role}
                            onChange={(e) => {
                              const selectedRole = roleOptions.find(
                                (r) => r.value === e.target.value
                              );
                              updateUserRole(
                                user.id,
                                selectedRole.value,
                                selectedRole.level
                              );
                            }}
                            className={`text-xs border-0 rounded px-2 py-1 font-medium focus:ring-2 focus:ring-blue-500 ${getRoleColor(
                              user.role
                            )}`}
                          >
                            {roleOptions.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Level {user.privilegeLevel} -{" "}
                          {getPrivilegeName(user.privilegeLevel)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() =>
                              updateUserStatus(user.id, !user.isActive)
                            }
                            className={`p-1 rounded ${
                              user.isActive
                                ? "text-green-600 bg-green-100 hover:bg-green-200"
                                : "text-red-600 bg-red-100 hover:bg-red-200"
                            }`}
                          >
                            {user.isActive ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </button>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              user.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-900 flex items-center space-x-1">
                            <Briefcase className="h-3 w-3 text-gray-400" />
                            <span>{user._count?.createdJobs || 0} jobs</span>
                          </div>
                          <div className="text-sm text-gray-500 flex items-center space-x-1">
                            <FileText className="h-3 w-3 text-gray-400" />
                            <span>
                              {user._count?.applications || 0} applications
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 flex items-center space-x-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(user.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                            title="Edit user"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            className="p-1 text-gray-400 hover:text-purple-600 transition-colors duration-200"
                            title="User settings"
                          >
                            <Settings className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors duration-200"
                            title="Delete user"
                            disabled={user.id === session?.user?.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                            title="More actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No users found
              </h3>
              <p className="text-gray-500">
                {searchTerm ||
                roleFilter !== "all" ||
                statusFilter !== "all" ||
                privilegeFilter !== "all"
                  ? "Try adjusting your filters to see more results."
                  : "No users have been created yet."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
