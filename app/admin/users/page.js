"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
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
} from "lucide-react";

export default function AdminUsers() {
  const { data: session } = useSession();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter]);

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

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error refreshing users:", error);
    } finally {
      setRefreshing(false);
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow border">
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
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors duration-200 shadow-sm"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
          <Link
            href="/admin/users/create"
            className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors duration-200 font-medium shadow-md hover:shadow-lg"
          >
            <Plus className="h-4 w-4" />
            <span>Add User</span>
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {roleOptions.map((role, index) => {
          const count = users.filter((user) => user.role === role.value).length;
          const RoleIcon = getRoleIcon(role.value);
          const roleColor = getRoleColor(role.value);

          return (
            <div
              key={role.value}
              className={`bg-white p-6 rounded-lg shadow border-2 border-${
                role.value === "user"
                  ? "gray"
                  : role.value === "hr"
                  ? "blue"
                  : role.value === "admin"
                  ? "green"
                  : "purple"
              }-200 hover:border-${
                role.value === "user"
                  ? "gray"
                  : role.value === "hr"
                  ? "blue"
                  : role.value === "admin"
                  ? "green"
                  : "purple"
              }-400 hover:shadow-md transition-all duration-200`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {count}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">
                    {role.label}s
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${roleColor.split(" ")[1]}`}>
                  <RoleIcon className={`h-6 w-6 ${roleColor.split(" ")[0]}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-600 text-gray-700"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-600"
          >
            <option value="all" className="text-gray-600">
              All Roles
            </option>
            {roleOptions.map((role) => (
              <option
                key={role.value}
                value={role.value}
                className="text-gray-600"
              >
                {role.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-600"
          >
            <option value="all" className="text-gray-600">
              All Status
            </option>
            <option value="active" className="text-gray-600">
              Active
            </option>
            <option value="inactive" className="text-gray-600">
              Inactive
            </option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => {
                const RoleIcon = getRoleIcon(user.role);
                const roleColor = getRoleColor(user.role);

                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-purple-600">
                              {user.firstName?.[0] ||
                                user.email[0].toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName && user.lastName
                              ? `${user.firstName} ${user.lastName}`
                              : user.email}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {user.email}
                          </div>
                          {user.phone && (
                            <div className="text-sm text-gray-500 flex items-center">
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
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border-0 focus:ring-2 focus:ring-purple-500 ${roleColor}`}
                        disabled={user.id === session?.user?.id}
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
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() =>
                          updateUserStatus(user.id, !user.isActive)
                        }
                        disabled={user.id === session?.user?.id}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors duration-200 ${
                          user.isActive
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : "bg-red-100 text-red-800 hover:bg-red-200"
                        } ${
                          user.id === session?.user?.id
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        {user.isActive ? (
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

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="space-y-1">
                        <div>Jobs: {user._count?.createdJobs || 0}</div>
                        <div>
                          Applications: {user._count?.applications || 0}
                        </div>
                        <div>Saved: {user._count?.savedJobs || 0}</div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          href={`/admin/users/${user.id}/edit`}
                          className="text-purple-600 hover:text-purple-900 p-2 hover:bg-purple-50 rounded transition-colors duration-200"
                          title="Edit user"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Link>

                        {user.id !== session?.user?.id && (
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded transition-colors duration-200"
                            title="Delete user"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Empty State */}
      {filteredUsers.length === 0 && !loading && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No users found
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || roleFilter !== "all" || statusFilter !== "all"
              ? "Try adjusting your filters to see more results."
              : "Get started by adding your first user."}
          </p>
          {!searchTerm && roleFilter === "all" && statusFilter === "all" && (
            <Link
              href="/admin/users/create"
              className="inline-flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors duration-200"
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
