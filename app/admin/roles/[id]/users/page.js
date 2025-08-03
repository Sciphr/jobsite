"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { usePermissions } from "@/app/hooks/usePermissions";
import { useInvalidateAdminData } from "@/app/hooks/useAdminData";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Users, Search, UserPlus, UserMinus, AlertCircle, Loader2, Shield } from "lucide-react";

export default function RoleUsersPage() {
  const { data: session } = useSession();
  const { can, loading: permissionsLoading } = usePermissions();
  const { invalidateRoles } = useInvalidateAdminData();
  const queryClient = useQueryClient();
  const params = useParams();
  const router = useRouter();
  const roleId = params.id;

  const [role, setRole] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("assigned"); // "assigned" or "available"

  const canAssignRoles = can.assignRoles && can.assignRoles();

  useEffect(() => {
    if (permissionsLoading) {
      return; // Wait for permissions to load
    }
    
    if (!canAssignRoles) {
      setError("You don't have permission to manage role assignments");
      setLoading(false);
      return;
    }
    
    fetchData();
  }, [roleId, canAssignRoles, permissionsLoading]);

  const fetchData = async () => {
    try {
      const [roleResponse, usersResponse] = await Promise.all([
        fetch(`/api/roles/${roleId}`),
        fetch('/api/admin/users')
      ]);

      if (!roleResponse.ok || !usersResponse.ok) {
        throw new Error("Failed to fetch data");
      }

      const roleData = await roleResponse.json();
      const usersData = await usersResponse.json();

      setRole(roleData.role);
      
      // The API returns users array directly, not wrapped in { users: [...] }
      const users = Array.isArray(usersData) ? usersData : (usersData.users || []);
      setAllUsers(users);

      // Get users assigned to this role
      const assigned = users.filter(user => 
        user.user_roles?.some(ur => ur.roles?.id === roleId)
      );
      
      // Get users not assigned to this role
      const available = users.filter(user => 
        !user.user_roles?.some(ur => ur.roles?.id === roleId)
      );

      setAssignedUsers(assigned);
      setAvailableUsers(available);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignUser = async (userId) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/roles/${roleId}/users/${userId}`, {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to assign user");
      }

      // Refresh data and force refetch roles cache
      await fetchData();
      console.log('🔄 Force refetching roles cache after user assignment');
      await queryClient.refetchQueries({ queryKey: ["admin", "roles"] });
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleUnassignUser = async (userId) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/roles/${roleId}/users/${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to unassign user");
      }

      // Refresh data and force refetch roles cache
      await fetchData();
      console.log('🔄 Force refetching roles cache after user unassignment');
      await queryClient.refetchQueries({ queryKey: ["admin", "roles"] });
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const filteredAssignedUsers = (assignedUsers || []).filter(user =>
    `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAvailableUsers = (availableUsers || []).filter(user =>
    `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="max-w-full mx-auto space-y-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Loading Role Users...
            </h2>
            <p className="text-gray-600">
              Please wait while we fetch the user assignments
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-full mx-auto space-y-8">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push("/admin/roles")}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
              title="Back to roles"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manage Role Users</h1>
              <p className="text-gray-600 mt-2">
                Assign and manage users for this role
              </p>
            </div>
          </div>
          
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm text-gray-500">
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="hover:text-gray-700 transition-colors duration-200"
            >
              Dashboard
            </button>
            <span>/</span>
            <button
              onClick={() => router.push("/admin/roles")}
              className="hover:text-gray-700 transition-colors duration-200"
            >
              Roles
            </button>
            <span>/</span>
            <span className="text-gray-900 font-medium">Manage Users</span>
          </nav>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-red-900 mb-2">
            Unable to Load Role
          </h2>
          <p className="text-red-700 mb-6 max-w-md mx-auto">{error}</p>
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => router.push("/admin/roles")}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
            >
              Back to Roles
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto space-y-8">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push("/admin/roles")}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            title="Back to roles"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Manage Users: {role?.name}
            </h1>
            <p className="text-gray-600 mt-2">
              Assign and remove users for this role
            </p>
          </div>
        </div>
        
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500">
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="hover:text-gray-700 transition-colors duration-200"
          >
            Dashboard
          </button>
          <span>/</span>
          <button
            onClick={() => router.push("/admin/roles")}
            className="hover:text-gray-700 transition-colors duration-200"
          >
            Roles
          </button>
          <span>/</span>
          <span className="text-gray-900 font-medium">Manage Users</span>
        </nav>
      </div>

      {/* Role Info Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-purple-100 rounded-xl">
            <Shield className="h-6 w-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-purple-900 mb-2">
              {role?.name} Role Management
            </h3>
            <p className="text-purple-700">
              {role?.description || "No description provided"}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
              <div>
                <strong>Status:</strong>{" "}
                <span className={role?.is_active ? "text-green-600" : "text-red-600"}>
                  {role?.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <div>
                <strong>Assigned Users:</strong> {assignedUsers.length}
              </div>
              <div>
                <strong>Available Users:</strong> {availableUsers.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 w-full md:w-80"
            />
          </div>

          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("assigned")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "assigned"
                  ? "bg-white text-purple-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Assigned ({assignedUsers.length})
            </button>
            <button
              onClick={() => setActiveTab("available")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "available"
                  ? "bg-white text-purple-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Available ({availableUsers.length})
            </button>
          </div>
        </div>

        {/* Users List */}
        <div className="space-y-4">
          {activeTab === "assigned" ? (
            filteredAssignedUsers.length > 0 ? (
              filteredAssignedUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </h4>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <p className="text-xs text-gray-500">
                        Privilege Level: {user.privilegeLevel || 0}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnassignUser(user.id)}
                    disabled={updating}
                    className="flex items-center space-x-2 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <UserMinus className="h-4 w-4" />
                    <span>Remove</span>
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No assigned users</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? "No users match your search." : "No users are currently assigned to this role."}
                </p>
              </div>
            )
          ) : (
            filteredAvailableUsers.length > 0 ? (
              filteredAvailableUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </h4>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <p className="text-xs text-gray-500">
                        Privilege Level: {user.privilegeLevel || 0}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAssignUser(user.id)}
                    disabled={updating}
                    className="flex items-center space-x-2 px-4 py-2 text-green-600 border border-green-300 rounded-lg hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Assign</span>
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No available users</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? "No users match your search." : "All users are already assigned to this role."}
                </p>
              </div>
            )
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center">
        <button
          onClick={() => router.push("/admin/roles")}
          className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 font-medium"
        >
          Done - Back to Roles
        </button>
      </div>
    </div>
  );
}