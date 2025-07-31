"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Save,
  ArrowLeft,
  User,
  Mail,
  Phone,
  Shield,
  AlertCircle,
  Eye,
  EyeOff,
  Calendar,
  CheckCircle,
  Settings,
} from "lucide-react";
import UserRoleManager from "./UserRoleManager";

export default function UserForm({ userId = null, initialData = null, refreshTrigger = 0, availableRoles = [], onRoleChange = null }) {
  const router = useRouter();
  const { data: session } = useSession();
  const isEdit = !!userId;

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "user",
    privilegeLevel: 0,
    isActive: true,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        firstName: initialData.firstName || "",
        lastName: initialData.lastName || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        password: "",
        confirmPassword: "",
        role: initialData.role || "user",
        privilegeLevel: initialData.privilegeLevel || 0,
        isActive: initialData.isActive ?? true,
      });
    }
  }, [initialData, refreshTrigger]);

  const roleOptions = [
    {
      value: "user",
      label: "User",
      privilegeLevel: 0,
      description: "Regular user access",
    },
    {
      value: "hr",
      label: "HR",
      privilegeLevel: 1,
      description: "Can view applications",
    },
    {
      value: "admin",
      label: "Admin",
      privilegeLevel: 2,
      description: "Can manage jobs and applications",
    },
    {
      value: "super_admin",
      label: "Super Admin",
      privilegeLevel: 3,
      description: "Full system access",
    },
  ];

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Auto-update privilege level when role changes
    if (field === "role") {
      const selectedRole = roleOptions.find((r) => r.value === value);
      if (selectedRole) {
        setFormData((prev) => ({
          ...prev,
          privilegeLevel: selectedRole.privilegeLevel,
        }));
      }
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: null,
      }));
    }

    // Mark field as touched
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));
  };

  const validateField = (field, value) => {
    switch (field) {
      case "firstName":
        return !value?.trim() ? "First name is required" : null;
      case "lastName":
        return !value?.trim() ? "Last name is required" : null;
      case "email":
        if (!value?.trim()) return "Email is required";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return !emailRegex.test(value) ? "Invalid email format" : null;
      case "phone":
        if (value && !/^[\d\s\-\+\(\)]+$/.test(value)) {
          return "Invalid phone number format";
        }
        return null;
      case "password":
        if (!isEdit && !value?.trim()) return "Password is required";
        if (value && value.length < 6)
          return "Password must be at least 6 characters";
        return null;
      case "confirmPassword":
        if (formData.password && value !== formData.password) {
          return "Passwords do not match";
        }
        return null;
      default:
        return null;
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = ["firstName", "lastName", "email"];

    if (!isEdit) {
      requiredFields.push("password");
    }

    // Validate required fields
    requiredFields.forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });

    // Validate optional fields if they have values
    ["phone", "confirmPassword"].forEach((field) => {
      if (formData[field]) {
        const error = validateField(field, formData[field]);
        if (error) newErrors[field] = error;
      }
    });

    // Check password confirmation if password is being set
    if (formData.password) {
      const confirmError = validateField(
        "confirmPassword",
        formData.confirmPassword
      );
      if (confirmError) newErrors.confirmPassword = confirmError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field]);
    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all fields as touched
    const allFields = Object.keys(formData);
    setTouched(
      allFields.reduce((acc, field) => ({ ...acc, [field]: true }), {})
    );

    if (!validateForm()) {
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        const element = document.querySelector(`[name="${firstErrorField}"]`);
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
        element?.focus();
      }
      return;
    }

    setSaving(true);

    try {
      const url = isEdit ? `/api/admin/users/${userId}` : "/api/admin/users";
      const method = isEdit ? "PATCH" : "POST";

      // Prepare data for submission
      const submitData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || null,
        isActive: formData.isActive,
      };

      // For new users, still include role for initial assignment
      if (!isEdit) {
        submitData.role = formData.role;
        submitData.privilegeLevel = formData.privilegeLevel;
      }

      // Only include password if it's provided
      if (formData.password) {
        submitData.password = formData.password;
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (response.ok) {
        // Show success briefly before redirecting
        setErrors({ submit: null });
        setTimeout(() => {
          router.push("/admin/users");
        }, 500);
      } else {
        setErrors({ submit: data.message || "An error occurred" });
      }
    } catch (error) {
      console.error("Error saving user:", error);
      setErrors({ submit: "An error occurred while saving the user" });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (
      window.confirm(
        "Are you sure you want to cancel? Any unsaved changes will be lost."
      )
    ) {
      router.push("/admin/users");
    }
  };

  // Check if current user can edit this user
  const canEdit = session?.user?.privilegeLevel >= 3;
  const isSelfEdit = userId === session?.user?.id;

  if (!canEdit) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <Shield className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-900 mb-2">
            Access Denied
          </h2>
          <p className="text-red-700">
            You don't have permission to edit users.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
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
            <h1 className="text-3xl font-bold text-gray-900">
              {isEdit ? "Edit User" : "Create New User"}
            </h1>
            <p className="text-gray-600 mt-2">
              {isEdit
                ? "Update user details and permissions"
                : "Add a new user to the system"}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <User className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Basic Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                onBlur={() => handleBlur("firstName")}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-600 text-gray-600 ${
                  errors.firstName ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter first name"
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.firstName}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                onBlur={() => handleBlur("lastName")}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-600 text-gray-600 ${
                  errors.lastName ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter last name"
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.lastName}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-600 text-gray-600 ${
                  errors.email ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter email address"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.email}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                onBlur={() => handleBlur("phone")}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-600 text-gray-600 ${
                  errors.phone ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter phone number"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.phone}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Password Section */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEdit ? "Change Password" : "Set Password"}
            </h2>
          </div>

          {isEdit && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-700">
                Leave password fields empty to keep the current password
                unchanged.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password {!isEdit && "*"}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  onBlur={() => handleBlur("password")}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-600 text-gray-600 ${
                    errors.password ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder={isEdit ? "Enter new password" : "Enter password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.password}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password {formData.password && "*"}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  onBlur={() => handleBlur("confirmPassword")}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-600 text-gray-600 ${
                    errors.confirmPassword
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  placeholder="Confirm password"
                  disabled={!formData.password}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={!formData.password}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.confirmPassword}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Role & Permissions / Account Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Roles */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <Settings className="h-5 w-5 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isEdit ? "User Roles" : "Initial Role"}
              </h2>
            </div>

            {isEdit ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Current Roles:</span>
                  <span className="text-xs text-gray-500">
                    {initialData?.user_roles?.length || 0} role{(initialData?.user_roles?.length || 0) !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {initialData && (
                  <UserRoleManager
                    user={initialData}
                    availableRoles={availableRoles}
                    onRoleChange={onRoleChange}
                    isLoading={false}
                    compact={true}
                  />
                )}
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-700">
                    Changes take effect immediately. Users automatically get "User" role if all roles are removed.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Initial User Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={(e) => handleInputChange("role", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-600 bg-white"
                >
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
                <p className="mt-1 text-sm text-gray-500">
                  {
                    roleOptions.find((r) => r.value === formData.role)
                      ?.description
                  }
                </p>
                <p className="mt-2 text-xs text-blue-600">
                  Additional roles can be assigned after creation.
                </p>
              </div>
            )}
          </div>

          {/* Right Column - Account Status */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Shield className="h-5 w-5 text-orange-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                Account Status
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    handleInputChange("isActive", e.target.checked)
                  }
                  disabled={isSelfEdit}
                  className={`rounded border-gray-300 text-purple-600 focus:ring-purple-500 ${
                    isSelfEdit ? "cursor-not-allowed" : ""
                  }`}
                />
                <label
                  htmlFor="isActive"
                  className="text-sm font-medium text-gray-700"
                >
                  Active User
                </label>
              </div>
              
              {isSelfEdit && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-xs text-orange-700">
                    You cannot deactivate your own account for security reasons.
                  </p>
                </div>
              )}
              
              <p className="text-sm text-gray-500">
                {formData.isActive 
                  ? "✓ User can log in and access the system"
                  : "⚠️ User cannot log in but data is preserved"
                }
              </p>

              {isEdit && initialData && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-500 space-y-1">
                    <p><strong>Member since:</strong> {new Date(initialData.createdAt).toLocaleDateString()}</p>
                    <p><strong>Last updated:</strong> {new Date(initialData.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4 py-6">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-400 transition-colors duration-200"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>{isEdit ? "Updating..." : "Creating..."}</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>{isEdit ? "Update User" : "Create User"}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
