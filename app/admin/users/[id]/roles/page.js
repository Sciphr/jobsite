"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useUser } from "@/app/hooks/useAdminData";
import UserRoleManager from "../../components/UserRoleManager";
import { User, AlertCircle, ArrowLeft, Loader2, Settings, Shield } from "lucide-react";

export default function UserRolesPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const userId = params.id;

  const {
    data: userData,
    isLoading: loading,
    isError,
    error: queryError,
    refetch
  } = useUser(userId);
  
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isError) {
      setError(queryError?.message || "Failed to load user data");
    }
  }, [isError, queryError]);

  // Fetch available roles
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

  useEffect(() => {
    // Check authentication and authorization
    if (status === "loading") return; // Still loading session

    if (!session) {
      router.push("/auth/signin?callbackUrl=/admin/users");
      return;
    }

    // Check if user has privilege level 3 (Super Admin) to manage roles
    if (!session.user.privilegeLevel || session.user.privilegeLevel < 3) {
      setError(
        "You don't have permission to manage user roles. Super Admin access required."
      );
      return;
    }
  }, [session, status, userId, router]);

  const handleRoleChange = async (userId, roleId, action) => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const url = `/api/roles/${roleId}/users/${userId}`;
      const method = action === 'add' ? 'POST' : 'DELETE';
      
      const response = await fetch(url, { method });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} role`);
      }

      const result = await response.json();
      
      // Show success message, especially for fallback scenarios
      if (result.fallbackApplied) {
        setSuccessMessage(`${result.message} - This ensures the user maintains system access.`);
        setTimeout(() => setSuccessMessage(null), 8000);
      }

      // Refresh user data
      await refetch();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Show loading state while checking session or fetching data
  if (status === "loading" || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Loading User Data...
            </h2>
            <p className="text-gray-600">
              Please wait while we fetch the user information
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-600">
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="hover:text-gray-900 transition-colors duration-200"
          >
            Dashboard
          </button>
          <span>/</span>
          <button
            onClick={() => router.push("/admin/users")}
            className="hover:text-gray-900 transition-colors duration-200"
          >
            Users
          </button>
          <span>/</span>
          <span className="text-gray-900 font-medium">Role Management</span>
        </nav>

        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-red-900 mb-2">
            Unable to Load User
          </h2>
          <p className="text-red-700 mb-6 max-w-md mx-auto">{error}</p>
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => router.push("/admin/users")}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
            >
              Back to Users
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
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-gray-600">
        <button
          onClick={() => router.push("/admin/dashboard")}
          className="hover:text-gray-900 transition-colors duration-200"
        >
          Dashboard
        </button>
        <span>/</span>
        <button
          onClick={() => router.push("/admin/users")}
          className="hover:text-gray-900 transition-colors duration-200"
        >
          Users
        </button>
        <span>/</span>
        <span className="text-gray-900 font-medium">
          Manage Roles: {userData?.firstName || userData?.email}
        </span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push("/admin/users")}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            title="Back to users"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Role Management</h1>
            <p className="text-gray-600 mt-1">
              Assign or remove roles for {userData?.firstName || userData?.email}
            </p>
          </div>
        </div>
      </div>

      {/* User Info Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-purple-100 rounded-full">
            <Settings className="h-6 w-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-purple-900 mb-2">
              Role Assignment for {userData?.firstName} {userData?.lastName}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-purple-700">
              <div>
                <strong>Email:</strong> {userData?.email}
              </div>
              <div>
                <strong>Current Status:</strong>{" "}
                <span className={userData?.isActive ? "text-green-600" : "text-red-600"}>
                  {userData?.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div>
                <strong>Current Roles:</strong>{" "}
                {userData?.user_roles && userData.user_roles.length > 0 
                  ? userData.user_roles.map(ur => ur.roles.name).join(", ")
                  : "No roles assigned"
                }
              </div>
              <div>
                <strong>Privilege Level:</strong>{" "}
                {userData?.privilegeLevel !== undefined ? `Level ${userData.privilegeLevel}` : "Not set"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message Display */}
      {successMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Shield className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Automatic Role Assignment</h3>
              <p className="text-sm text-blue-700 mt-1">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Role Management Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Available Roles
          </h2>
          <p className="text-gray-600">
            Select the roles you want to assign to this user. Changes take effect immediately.
          </p>
        </div>

        <UserRoleManager
          user={userData}
          availableRoles={availableRoles}
          onRoleChange={handleRoleChange}
          isLoading={saving}
          compact={false}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center">
        <button
          onClick={() => router.push("/admin/users")}
          className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 font-medium"
        >
          Done - Back to Users
        </button>
      </div>
    </div>
  );
}