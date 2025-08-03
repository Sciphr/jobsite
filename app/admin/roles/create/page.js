"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { usePermissions } from "@/app/hooks/usePermissions";
import { useInvalidateAdminData } from "@/app/hooks/useAdminData";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Shield, AlertCircle, Plus } from "lucide-react";
import PermissionSelector from "../components/PermissionSelector";

export default function CreateRolePage() {
  const { data: session } = useSession();
  const { can, loading: permissionsLoading } = usePermissions();
  const { invalidateRoles } = useInvalidateAdminData();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "blue",
    is_active: true,
    permissions: new Set()
  });

  const canCreateRoles = can.createRoles && can.createRoles();

  if (permissionsLoading) {
    return (
      <div className="max-w-full mx-auto space-y-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!canCreateRoles) {
    return (
      <div className="max-w-full mx-auto space-y-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-red-900 mb-2">
            Access Denied
          </h2>
          <p className="text-red-700 mb-6 max-w-md mx-auto">
            You don't have permission to create roles
          </p>
          <button
            onClick={() => router.push("/admin/roles")}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
          >
            Back to Roles
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (!formData.name.trim()) {
      setError("Role name is required");
      setSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          permissions: Array.from(formData.permissions)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create role");
      }

      // Force refetch roles cache to show the new role immediately
      console.log('🔄 Force refetching roles cache after role creation');
      await queryClient.refetchQueries({ queryKey: ["admin", "roles"] });
      router.push("/admin/roles");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePermissionsChange = (selectedPermissions) => {
    setFormData(prev => ({
      ...prev,
      permissions: selectedPermissions
    }));
  };

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
              Create New Role
            </h1>
            <p className="text-gray-600 mt-2">
              Define a new role with specific permissions and access levels
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
          <span className="text-gray-900 font-medium">Create</span>
        </nav>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10">
          <div className="flex items-center space-x-4 mb-8">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Plus className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900">
              Role Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-lg font-medium text-gray-700 mb-3">
                Role Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400 text-gray-700 text-lg"
                placeholder="Enter role name"
                required
              />
            </div>

            <div>
              <label className="block text-lg font-medium text-gray-700 mb-3">
                Color Theme
              </label>
              <select
                value={formData.color}
                onChange={(e) => handleInputChange("color", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-700 bg-white text-lg"
              >
                <option value="blue">Blue</option>
                <option value="green">Green</option>
                <option value="purple">Purple</option>
                <option value="red">Red</option>
                <option value="yellow">Yellow</option>
                <option value="indigo">Indigo</option>
                <option value="pink">Pink</option>
                <option value="gray">Gray</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-lg font-medium text-gray-700 mb-3">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400 text-gray-700 text-lg"
                placeholder="Describe this role's purpose and responsibilities..."
              />
            </div>

            <div className="flex items-center space-x-4">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => handleInputChange("is_active", e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="is_active" className="text-lg font-medium text-gray-700">
                Active Role
              </label>
            </div>

            <div className="bg-blue-50 rounded-xl p-6">
              <h3 className="text-lg font-medium text-blue-900 mb-2">
                Role Guidelines
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Choose a clear, descriptive name</li>
                <li>• Select permissions carefully based on responsibilities</li>
                <li>• Consider the principle of least privilege</li>
                <li>• You can assign users to this role after creation</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Permissions Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10">
          <div className="flex items-center space-x-4 mb-8">
            <div className="p-3 bg-green-100 rounded-xl">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900">
              Role Permissions
            </h2>
          </div>

          <div className="mb-6 p-6 bg-yellow-50 border border-yellow-200 rounded-xl">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="text-lg font-medium text-yellow-900 mb-2">
                  Permission Guidelines
                </h3>
                <p className="text-yellow-700">
                  Select only the permissions that users with this role need to perform their job functions. 
                  You can always modify permissions later if needed.
                </p>
              </div>
            </div>
          </div>

          <PermissionSelector
            selectedPermissions={formData.permissions}
            onPermissionsChange={handlePermissionsChange}
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Create Role
              </h3>
              <p className="text-gray-600">
                Review your settings and create the new role.
              </p>
            </div>
            
            <div className="flex items-center space-x-6">
              <button
                type="button"
                onClick={() => router.push("/admin/roles")}
                className="px-8 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors duration-200 font-medium text-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center space-x-3 px-10 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:bg-purple-400 transition-colors duration-200 font-medium text-lg shadow-lg"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Creating Role...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Create Role</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}