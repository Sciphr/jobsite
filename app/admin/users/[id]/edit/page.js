"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import UserForm from "../../components/UserForm";
import { User, AlertCircle, Shield, ArrowLeft, Loader2 } from "lucide-react";

export default function EditUserPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const userId = params.id;

  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      setLoading(false);
      return;
    }

    fetchUserData();
  }, [session, status, userId, router]);

  const fetchUserData = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      } else if (response.status === 404) {
        setError("User not found");
      } else if (response.status === 401) {
        setError("You don't have permission to view this user");
      } else {
        setError("Failed to load user data");
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      setError("An error occurred while loading the user");
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking session or fetching data
  if (status === "loading" || loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
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
      <div className="max-w-2xl mx-auto space-y-8">
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
              onClick={fetchUserData}
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
          Edit {userData?.firstName} {userData?.lastName}
        </span>
      </nav>

      {/* User Info Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="p-1 bg-purple-100 rounded-full mt-0.5">
            <User className="h-4 w-4 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-purple-900 mb-1">
              Editing User Profile
            </h3>
            <div className="text-sm text-purple-700 space-y-1">
              <p>
                <strong>Current Role:</strong>{" "}
                {userData?.role?.replace("_", " ")}
                (Level {userData?.privilegeLevel})
              </p>
              <p>
                <strong>Status:</strong>{" "}
                {userData?.isActive ? "Active" : "Inactive"}
              </p>
              <p>
                <strong>Member Since:</strong>{" "}
                {new Date(userData?.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* User Activity Summary */}
      {userData?._count && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            User Activity
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                {userData._count.createdJobs || 0}
              </div>
              <div className="text-sm text-blue-700 font-medium">
                Jobs Created
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">
                {userData._count.applications || 0}
              </div>
              <div className="text-sm text-green-700 font-medium">
                Applications
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-600">
                {userData._count.savedJobs || 0}
              </div>
              <div className="text-sm text-purple-700 font-medium">
                Saved Jobs
              </div>
            </div>
          </div>

          {/* Warning for users with activity */}
          {(userData._count.createdJobs > 0 ||
            userData._count.applications > 0) && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-700">
                  <p className="font-medium mb-1">Important:</p>
                  <p>
                    This user has activity in the system. Be careful when
                    modifying their role or deactivating their account as it may
                    affect their created jobs and applications.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Self-Edit Warning */}
      {userData?.id === session?.user?.id && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="p-1 bg-orange-100 rounded-full mt-0.5">
              <Shield className="h-4 w-4 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-orange-900 mb-1">
                Editing Your Own Account
              </h3>
              <p className="text-sm text-orange-700">
                You're editing your own user account. Some restrictions apply:
                you cannot change your own role or deactivate your own account
                for security reasons.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* User Form */}
      <UserForm userId={userId} initialData={userData} />

      {/* Additional Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Danger Zone
        </h3>
        <div className="space-y-4">
          {userData?.id !== session?.user?.id && (
            <div className="p-4 border border-red-200 rounded-lg bg-red-50">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-red-900 mb-1">
                    Delete User Account
                  </h4>
                  <p className="text-sm text-red-700">
                    Permanently delete this user and all associated data. This
                    action cannot be undone.
                  </p>
                  {(userData?._count?.createdJobs > 0 ||
                    userData?._count?.applications > 0) && (
                    <p className="text-sm text-red-600 font-medium mt-2">
                      ⚠️ This user has {userData._count.createdJobs} jobs and{" "}
                      {userData._count.applications} applications.
                    </p>
                  )}
                </div>
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
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors duration-200"
                >
                  Delete User
                </button>
              </div>
            </div>
          )}

          {userData?.id === session?.user?.id && (
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-gray-500" />
                <div>
                  <h4 className="font-medium text-gray-900">
                    Account Protection
                  </h4>
                  <p className="text-sm text-gray-600">
                    You cannot delete your own account. Contact another super
                    admin if needed.
                  </p>
                </div>
              </div>
            </div>
          )}
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
