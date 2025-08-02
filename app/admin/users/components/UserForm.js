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
      <div className="max-w-7xl mx-auto space-y-10">
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
    <div className="max-w-7xl mx-auto space-y-10">
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
      <form id="user-form" onSubmit={handleSubmit} className="space-y-12">
        {/* Basic Information - Full Width */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10">
          <div className="flex items-center space-x-4 mb-8">
            <div className="p-3 bg-purple-100 rounded-xl">
              <User className="h-6 w-6 text-purple-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900">
              Basic Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-10">
            <div>
              <label className="block text-lg font-medium text-gray-700 mb-3">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                onBlur={() => handleBlur("firstName")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400 text-gray-700 text-lg ${
                  errors.firstName ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter first name"
              />
              {errors.firstName && (
                <p className="mt-2 text-base text-red-600 flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>{errors.firstName}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-lg font-medium text-gray-700 mb-3">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                onBlur={() => handleBlur("lastName")}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400 text-gray-700 text-lg ${
                  errors.lastName ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter last name"
              />
              {errors.lastName && (
                <p className="mt-2 text-base text-red-600 flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>{errors.lastName}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-lg font-medium text-gray-700 mb-3">
                Email Address *
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  onBlur={() => handleBlur("email")}
                  className={`w-full px-4 py-3 pl-12 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400 text-gray-700 text-lg ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter email address"
                />
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
              {errors.email && (
                <p className="mt-2 text-base text-red-600 flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>{errors.email}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-lg font-medium text-gray-700 mb-3">
                Phone Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  onBlur={() => handleBlur("phone")}
                  className={`w-full px-4 py-3 pl-12 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400 text-gray-700 text-lg ${
                    errors.phone ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter phone number"
                />
                <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
              {errors.phone && (
                <p className="mt-2 text-base text-red-600 flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>{errors.phone}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Password Section - Full Width */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10">
          <div className="flex items-center space-x-4 mb-8">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900">
              {isEdit ? "Password Management" : "Set User Password"}
            </h2>
          </div>

          {isEdit && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-10">
              <p className="text-lg text-blue-700">
                Leave password fields empty to keep the current password unchanged.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
            <div>
              <label className="block text-lg font-medium text-gray-700 mb-3">
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
                  className={`w-full px-4 py-3 pr-12 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400 text-gray-700 text-lg ${
                    errors.password ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder={isEdit ? "Enter new password" : "Enter password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-2 text-base text-red-600 flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>{errors.password}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-lg font-medium text-gray-700 mb-3">
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
                  className={`w-full px-4 py-3 pr-12 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400 text-gray-700 text-lg ${
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
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  disabled={!formData.password}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-2 text-base text-red-600 flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>{errors.confirmPassword}</span>
                </p>
              )}
            </div>

            <div className="flex items-center justify-center">
              <div className="bg-gray-50 rounded-xl p-6 text-center">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-base text-gray-600">
                  Password must be at least 6 characters long
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Role Assignment Section - Only for new users */}
        {!isEdit && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10">
            <div className="flex items-center space-x-4 mb-8">
              <div className="p-3 bg-green-100 rounded-xl">
                <Settings className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Initial Role Assignment
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-3">
                  Initial User Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={(e) => handleInputChange("role", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-700 bg-white text-lg"
                >
                  {roleOptions.map((role) => (
                    <option
                      key={role.value}
                      value={role.value}
                      className="text-gray-700"
                    >
                      {role.label}
                    </option>
                  ))}
                </select>
                <p className="mt-3 text-base text-gray-600">
                  {
                    roleOptions.find((r) => r.value === formData.role)
                      ?.description
                  }
                </p>
                <p className="mt-4 text-base text-blue-600">
                  Additional roles can be assigned after creation.
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Role Information</h3>
                <div className="space-y-3">
                  {roleOptions.map((role) => (
                    <div key={role.value} className={`p-3 rounded-lg border ${
                      formData.role === role.value 
                        ? 'border-purple-300 bg-purple-50' 
                        : 'border-gray-200 bg-white'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{role.label}</span>
                        <span className="text-sm text-gray-500">Level {role.privilegeLevel}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account Status Section - Full Width */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10">
          <div className="flex items-center space-x-4 mb-8">
            <div className="p-3 bg-orange-100 rounded-xl">
              <Shield className="h-6 w-6 text-orange-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900">
              Account Status & Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    handleInputChange("isActive", e.target.checked)
                  }
                  disabled={isSelfEdit}
                  className={`w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 ${
                    isSelfEdit ? "cursor-not-allowed" : ""
                  }`}
                />
                <label
                  htmlFor="isActive"
                  className="text-lg font-medium text-gray-700"
                >
                  Active User Account
                </label>
              </div>
              
              {isSelfEdit && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <p className="text-base text-orange-700">
                    You cannot deactivate your own account for security reasons.
                  </p>
                </div>
              )}
              
              <div className={`p-4 rounded-xl ${
                formData.isActive 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`text-base font-medium ${
                  formData.isActive ? 'text-green-700' : 'text-red-700'
                }`}>
                  {formData.isActive 
                    ? "✓ User can log in and access the system"
                    : "⚠️ User cannot log in but data is preserved"
                  }
                </p>
              </div>
            </div>

            {isEdit && initialData && (
              <>
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Account Timeline
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-base font-medium text-gray-700">Member Since</p>
                        <p className="text-sm text-gray-600">{new Date(initialData.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-base font-medium text-gray-700">Last Updated</p>
                        <p className="text-sm text-gray-600">{new Date(initialData.updatedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
              </>
            )}
          </div>
        </div>

        {/* Error Display - Spans both columns */}
        {errors.submit && (
          <div className="xl:col-span-2 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          </div>
        )}
      </form>

      {/* Form Actions - Outside form to span full width */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {isEdit ? "Save Changes" : "Create User Account"}
            </h3>
            <p className="text-gray-600">
              {isEdit 
                ? "Review your changes and save the updated user information."
                : "Complete the user creation process by saving the new account."
              }
            </p>
          </div>
          
          <div className="flex items-center space-x-6">
            <button
              type="button"
              onClick={handleCancel}
              className="px-8 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors duration-200 font-medium text-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="user-form"
              disabled={saving}
              className="flex items-center space-x-3 px-10 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:bg-purple-400 transition-colors duration-200 font-medium text-lg shadow-lg"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>{isEdit ? "Updating User..." : "Creating User..."}</span>
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  <span>{isEdit ? "Update User Profile" : "Create New User"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
