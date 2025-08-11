"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import UserForm from "../../components/UserForm";
import { User, AlertCircle, Shield, ArrowLeft, Loader2, Settings } from "lucide-react";
import { useUser } from "@/app/hooks/useAdminData";
import UserRoleManager from "../../components/UserRoleManager";

export default function EditUserPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const userId = params.id;

  const {
    data: userData,
    isLoading: loading,
    isError,
    error: queryError,
  } = useUser(userId);
  const [error, setError] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (isError) {
      setError(queryError?.message || "Failed to load user data");
    }
  }, [isError, queryError]);

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

  useEffect(() => {
    // Check authentication and authorization
    if (status === "loading") return; // Still loading session

    if (!session) {
      router.push("/auth/signin?callbackUrl=/admin/users");
      return;
    }

    // Check if user has privilege level 3 (Super Admin) to edit users
    if (!session.user.privilegeLevel || session.user.privilegeLevel < 3) {
      setError(
        "You don't have permission to edit users. Super Admin access required."
      );
      return;
    }
  }, [session, status, userId, router]);

  // Handle role changes
  const handleRoleChange = async (userId, roleId, action) => {
    try {
      const url = `/api/roles/${roleId}/users/${userId}`;
      const method = action === 'add' ? 'POST' : 'DELETE';
      
      const response = await fetch(url, { method });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} role`);
      }

      // Trigger a refresh of user data
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error managing role:', error);
      throw error; // Re-throw for UserRoleManager to handle
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
              <h1 className="text-3xl font-bold text-gray-900">Edit User</h1>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center max-w-2xl mx-auto">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-red-900 mb-2">
            Unable to Load User
          </h2>
          <p className="text-red-700 mb-6">{error}</p>
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

  // Render the user form with data
  return (
    <div className="max-w-full mx-auto space-y-8">
      {/* Header with Back Button - At the top */}
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
            <h1 className="text-3xl font-bold text-gray-900">
              Edit User Profile
            </h1>
            <p className="text-gray-600 mt-2">
              Update {userData?.firstName} {userData?.lastName}'s account information
            </p>
          </div>
        </div>
        
        {/* Breadcrumb in header */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500">
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="hover:text-gray-700 transition-colors duration-200"
          >
            Dashboard
          </button>
          <span>/</span>
          <button
            onClick={() => router.push("/admin/users")}
            className="hover:text-gray-700 transition-colors duration-200"
          >
            Users
          </button>
          <span>/</span>
          <span className="text-gray-900 font-medium">Edit</span>
        </nav>
      </div>

      {/* Self-Edit Warning - Full width warning if editing own account */}
      {userData?.id === session?.user?.id && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-orange-100 rounded-xl">
              <Shield className="h-6 w-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-orange-900 mb-2">
                Editing Your Own Account
              </h3>
              <p className="text-orange-700">
                You're editing your own user account. Some restrictions apply:
                you cannot change your own role or deactivate your own account
                for security reasons.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Form on left/center, User info on right */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* User Form - Takes up 3/4 of the width on large screens */}
        <div className="xl:col-span-3">
          <UserForm 
            userId={userId} 
            initialData={userData} 
            refreshTrigger={refreshTrigger}
            availableRoles={availableRoles}
            onRoleChange={handleRoleChange}
          />
        </div>

        {/* User Info Sidebar - Takes up 1/4 of the width on large screens */}
        <div className="xl:col-span-1 space-y-6">
          {/* User Profile Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-10 w-10 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                {userData?.firstName} {userData?.lastName}
              </h3>
              <p className="text-gray-600 mt-1">{userData?.email}</p>
              <div className="flex items-center justify-center space-x-2 mt-3">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  userData?.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {userData?.isActive ? 'Active' : 'Inactive'}
                </div>
                {userData?.account_type === 'ldap' && (
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    LDAP
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Account Type:</span>
                <span className="font-medium">
                  {userData?.account_type === 'ldap' ? 'LDAP Account' : 'Local Account'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Member Since:</span>
                <span className="font-medium">{new Date(userData?.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Updated:</span>
                <span className="font-medium">{new Date(userData?.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Privilege Level:</span>
                <span className="font-medium">Level {userData?.privilegeLevel || 0}</span>
              </div>
              {userData?.account_type === 'ldap' && userData?.ldap_synced_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600">LDAP Last Sync:</span>
                  <span className="font-medium">{new Date(userData.ldap_synced_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4 mt-6">
              <h4 className="font-medium text-gray-900 mb-3">Current Roles</h4>
              <div className="space-y-2">
                {userData?.user_roles && userData.user_roles.length > 0 ? (
                  userData.user_roles.map(ur => (
                    <span key={ur.roles.id} className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                      {ur.roles.name}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 text-xs italic">No roles assigned</span>
                )}
              </div>
              <button
                onClick={() => router.push(`/admin/users/${userId}/roles`)}
                className="w-full mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Manage Roles
              </button>
            </div>
          </div>

          {/* User Activity Stats */}
          {userData?._count && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Activity Overview
              </h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-blue-900">Jobs Created</p>
                    <p className="text-2xl font-bold text-blue-600">{userData._count.createdJobs || 0}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-green-900">Applications</p>
                    <p className="text-2xl font-bold text-green-600">{userData._count.applications || 0}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-purple-900">Saved Jobs</p>
                    <p className="text-2xl font-bold text-purple-600">{userData._count.savedJobs || 0}</p>
                  </div>
                </div>
              </div>

              {/* Warning for users with activity */}
              {(userData._count.createdJobs > 0 || userData._count.applications > 0) && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-yellow-700">
                      <p className="font-medium mb-1">Caution</p>
                      <p>User has system activity. Changes may affect their jobs and applications.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Danger Zone */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-red-900 mb-4">
              Danger Zone
            </h4>
            {userData?.id !== session?.user?.id ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Permanently delete this user and all associated data.
                </p>
                {(userData?._count?.createdJobs > 0 || userData?._count?.applications > 0) && (
                  <p className="text-xs text-red-600 font-medium">
                    ⚠️ Has {userData._count.createdJobs} jobs and {userData._count.applications} applications
                  </p>
                )}
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        `Are you sure you want to delete ${userData?.firstName} ${userData?.lastName}? This will permanently delete their account and all associated data. This action cannot be undone.`
                      )
                    ) {
                      handleDeleteUser();
                    }
                  }}
                  className="w-full px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors duration-200"
                >
                  Delete User Account
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Protected Account</p>
                  <p className="text-xs text-gray-500">Cannot delete your own account</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Function to handle user deletion
  async function handleDeleteUser() {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/admin/users?message=User deleted successfully");
      } else {
        const data = await response.json();
        alert(`Error deleting user: ${data.message}`);
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("An error occurred while deleting the user");
    }
  }
}
