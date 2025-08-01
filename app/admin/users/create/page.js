"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import UserForm from "../components/UserForm";
import { ResourcePermissionGuard } from "@/app/components/guards/PagePermissionGuard";
import { User, AlertCircle, Shield, ArrowLeft, Loader2 } from "lucide-react";

function CreateUserPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check authentication and authorization
    if (status === "loading") return; // Still loading session

    if (!session) {
      router.push("/auth/signin?callbackUrl=/admin/users/create");
      return;
    }

    // Check if user has privilege level 3 (Super Admin) to create users
    if (!session.user.privilegeLevel || session.user.privilegeLevel < 3) {
      setError(
        "You don't have permission to create users. Super Admin access required."
      );
      return;
    }

    setLoading(false);
  }, [session, status, router]);

  // Show loading state while checking session
  if (status === "loading" || loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Loading...
            </h2>
            <p className="text-gray-600">
              Checking your permissions to create users
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if user doesn't have permission
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
              <h1 className="text-3xl font-bold text-gray-900">
                Create New User
              </h1>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <Shield className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-red-900 mb-2">
            Access Denied
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
              onClick={() => router.push("/admin/dashboard")}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render the user form for authorized users
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
        <span className="text-gray-900 font-medium">Create</span>
      </nav>

      {/* Info Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="p-1 bg-purple-100 rounded-full mt-0.5">
            <User className="h-4 w-4 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-purple-900 mb-1">
              Creating a new user account
            </h3>
            <p className="text-sm text-purple-700">
              Fill out all required fields below. The user will be able to sign
              in immediately with the credentials you provide.
            </p>
          </div>
        </div>
      </div>

      {/* User Form */}
      <UserForm />

      {/* Help Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Role Descriptions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">User Roles</h4>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>
                <strong>User (Level 0):</strong> Regular user access - can apply
                to jobs and manage their profile
              </li>
              <li>
                <strong>HR (Level 1):</strong> Can view and manage job
                applications
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Admin Roles</h4>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>
                <strong>Admin (Level 2):</strong> Can create and manage jobs,
                plus all HR permissions
              </li>
              <li>
                <strong>Super Admin (Level 3):</strong> Full system access
                including user management
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Security Best Practices
        </h3>
        <div className="text-sm text-blue-700 space-y-2">
          <p>• Use strong passwords with at least 6 characters</p>
          <p>• Only assign admin roles to trusted users</p>
          <p>• Regularly review user access and deactivate unused accounts</p>
          <p>
            • Users will be required to change their password on first login
            (future feature)
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CreateUserPage() {
  return (
    <ResourcePermissionGuard 
      resource="users" 
      actions={["create"]}
      fallbackPath="/admin/dashboard"
    >
      <CreateUserPageContent />
    </ResourcePermissionGuard>
  );
}
