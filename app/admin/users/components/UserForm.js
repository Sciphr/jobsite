"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useThemeClasses } from "../../../contexts/AdminThemeContext";
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
  const { getButtonClasses, getStatCardClasses } = useThemeClasses();
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
        <div className="admin-card border admin-border rounded-lg p-8 text-center">
          <Shield className="h-12 w-12 theme-danger mx-auto mb-4" />
          <h2 className="text-xl font-semibold admin-text mb-2">
            Access Denied
          </h2>
          <p className="admin-text-light">
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
            className="p-2 admin-text-light hover:admin-text transition-colors duration-200"
            title="Back to users"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold admin-text">
              {isEdit ? "Edit User" : "Create New User"}
            </h1>
            <p className="admin-text-light mt-2">
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
        <div className="admin-card rounded-xl shadow-sm border p-10">
          <div className="flex items-center space-x-4 mb-8">
            <div className="p-3 theme-stat-1-bg rounded-xl">
              <User className="h-6 w-6 theme-stat-1" />
            </div>
            <h2 className="text-2xl font-semibold admin-text">
              Basic Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-10">
            <div>
              <label className="block text-lg font-medium admin-text mb-3">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                onBlur={() => handleBlur("firstName")}
                className={`w-full px-4 py-3 admin-border border rounded-xl focus:ring-2 theme-primary-bg focus:ring-opacity-50 admin-text placeholder-gray-400 text-lg ${
                  errors.firstName ? "theme-danger-bg border-opacity-50" : "admin-border"
                }`}
                placeholder="Enter first name"
              />
              {errors.firstName && (
                <p className="mt-2 text-base theme-danger flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>{errors.firstName}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-lg font-medium admin-text mb-3">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                onBlur={() => handleBlur("lastName")}
                className={`w-full px-4 py-3 admin-border border rounded-xl focus:ring-2 theme-primary-bg focus:ring-opacity-50 admin-text placeholder-gray-400 text-lg ${
                  errors.lastName ? "theme-danger-bg border-opacity-50" : "admin-border"
                }`}
                placeholder="Enter last name"
              />
              {errors.lastName && (
                <p className="mt-2 text-base theme-danger flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>{errors.lastName}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-lg font-medium admin-text mb-3">
                Email Address *
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  onBlur={() => handleBlur("email")}
                  className={`w-full px-4 py-3 pl-12 admin-border border rounded-xl focus:ring-2 theme-primary-bg focus:ring-opacity-50 admin-text placeholder-gray-400 text-lg ${
                    errors.email ? "theme-danger-bg border-opacity-50" : "admin-border"
                  }`}
                  placeholder="Enter email address"
                />
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 admin-text-light" />
              </div>
              {errors.email && (
                <p className="mt-2 text-base theme-danger flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>{errors.email}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-lg font-medium admin-text mb-3">
                Phone Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  onBlur={() => handleBlur("phone")}
                  className={`w-full px-4 py-3 pl-12 admin-border border rounded-xl focus:ring-2 theme-primary-bg focus:ring-opacity-50 admin-text placeholder-gray-400 text-lg ${
                    errors.phone ? "theme-danger-bg border-opacity-50" : "admin-border"
                  }`}
                  placeholder="Enter phone number"
                />
                <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 admin-text-light" />
              </div>
              {errors.phone && (
                <p className="mt-2 text-base theme-danger flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>{errors.phone}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Password Section - Full Width */}
        <div className="admin-card rounded-xl shadow-sm border p-10">
          <div className="flex items-center space-x-4 mb-8">
            <div className="p-3 theme-stat-2-bg rounded-xl">
              <Shield className="h-6 w-6 theme-stat-2" />
            </div>
            <h2 className="text-2xl font-semibold admin-text">
              {isEdit ? "Password Management" : "Set User Password"}
            </h2>
          </div>

          {isEdit && (
            <div className="theme-stat-2-bg bg-opacity-20 border theme-stat-2-border rounded-xl p-6 mb-10">
              <p className="text-lg theme-stat-2">
                Leave password fields empty to keep the current password unchanged.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
            <div>
              <label className="block text-lg font-medium admin-text mb-3">
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
                  className={`w-full px-4 py-3 pr-12 admin-border border rounded-xl focus:ring-2 theme-primary-bg focus:ring-opacity-50 admin-text placeholder-gray-400 text-lg ${
                    errors.password ? "theme-danger-bg border-opacity-50" : "admin-border"
                  }`}
                  placeholder={isEdit ? "Enter new password" : "Enter password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 admin-text-light" />
                  ) : (
                    <Eye className="h-5 w-5 admin-text-light" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-2 text-base theme-danger flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>{errors.password}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-lg font-medium admin-text mb-3">
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
                  className={`w-full px-4 py-3 pr-12 admin-border border rounded-xl focus:ring-2 theme-primary-bg focus:ring-opacity-50 admin-text placeholder-gray-400 text-lg ${
                    errors.confirmPassword
                      ? "theme-danger-bg border-opacity-50"
                      : "admin-border"
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
                    <EyeOff className="h-5 w-5 admin-text-light" />
                  ) : (
                    <Eye className="h-5 w-5 admin-text-light" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-2 text-base theme-danger flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>{errors.confirmPassword}</span>
                </p>
              )}
            </div>

            <div className="flex items-center justify-center">
              <div className="admin-card bg-opacity-50 rounded-xl p-6 text-center">
                <Shield className="h-12 w-12 admin-text-light mx-auto mb-3" />
                <p className="text-base admin-text-light">
                  Password must be at least 6 characters long
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Role Assignment Section - Only for new users */}
        {!isEdit && (
          <div className="admin-card rounded-xl shadow-sm border p-10">
            <div className="flex items-center space-x-4 mb-8">
              <div className="p-3 theme-stat-3-bg rounded-xl">
                <Settings className="h-6 w-6 theme-stat-3" />
              </div>
              <h2 className="text-2xl font-semibold admin-text">
                Initial Role Assignment
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <label className="block text-lg font-medium admin-text mb-3">
                  Initial User Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={(e) => handleInputChange("role", e.target.value)}
                  className="w-full px-4 py-3 admin-border border rounded-xl focus:ring-2 theme-primary-bg focus:ring-opacity-50 admin-text admin-card text-lg"
                >
                  {roleOptions.map((role) => (
                    <option
                      key={role.value}
                      value={role.value}
                      className="admin-text"
                    >
                      {role.label}
                    </option>
                  ))}
                </select>
                <p className="mt-3 text-base admin-text-light">
                  {
                    roleOptions.find((r) => r.value === formData.role)
                      ?.description
                  }
                </p>
                <p className="mt-4 text-base theme-primary">
                  Additional roles can be assigned after creation.
                </p>
              </div>
              
              <div className="admin-card bg-opacity-50 rounded-xl p-6">
                <h3 className="text-lg font-medium admin-text mb-4">Role Information</h3>
                <div className="space-y-3">
                  {roleOptions.map((role) => (
                    <div key={role.value} className={`p-3 rounded-lg border ${
                      formData.role === role.value 
                        ? 'theme-primary-text theme-primary-bg bg-opacity-10 border-opacity-50' 
                        : 'admin-border admin-card'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium admin-text">{role.label}</span>
                        <span className="text-sm admin-text-light">Level {role.privilegeLevel}</span>
                      </div>
                      <p className="text-sm admin-text-light mt-1">{role.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account Status Section - Full Width */}
        <div className="admin-card rounded-xl shadow-sm border p-10">
          <div className="flex items-center space-x-4 mb-8">
            <div className="p-3 theme-stat-4-bg rounded-xl">
              <Shield className="h-6 w-6 theme-stat-4" />
            </div>
            <h2 className="text-2xl font-semibold admin-text">
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
                  className={`w-5 h-5 rounded admin-border theme-primary focus:ring-2 theme-primary-bg focus:ring-opacity-50 ${
                    isSelfEdit ? "cursor-not-allowed" : ""
                  }`}
                />
                <label
                  htmlFor="isActive"
                  className="text-lg font-medium admin-text"
                >
                  Active User Account
                </label>
              </div>
              
              {isSelfEdit && (
                <div className="theme-warning-bg bg-opacity-20 border theme-warning-bg border-opacity-50 rounded-xl p-4">
                  <p className="text-base theme-warning">
                    You cannot deactivate your own account for security reasons.
                  </p>
                </div>
              )}
              
              <div className={`p-4 rounded-xl border ${
                formData.isActive 
                  ? 'theme-success-bg bg-opacity-20 theme-success-border' 
                  : 'theme-danger-bg bg-opacity-20 theme-danger-border'
              }`}>
                <p className={`text-base font-medium ${
                  formData.isActive ? 'theme-success' : 'theme-danger'
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
                <div className="admin-card bg-opacity-50 rounded-xl p-6">
                  <h3 className="text-lg font-medium admin-text mb-4">
                    Account Timeline
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 admin-text-light" />
                      <div>
                        <p className="text-base font-medium admin-text">Member Since</p>
                        <p className="text-sm admin-text-light">{new Date(initialData.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 admin-text-light" />
                      <div>
                        <p className="text-base font-medium admin-text">Last Updated</p>
                        <p className="text-sm admin-text-light">{new Date(initialData.updatedAt).toLocaleDateString()}</p>
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
          <div className="xl:col-span-2 theme-danger-bg bg-opacity-20 border theme-danger-border rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 theme-danger" />
              <p className="text-sm theme-danger">{errors.submit}</p>
            </div>
          </div>
        )}
      </form>

      {/* Form Actions - Outside form to span full width */}
      <div className="admin-card rounded-xl shadow-sm border p-10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold admin-text mb-2">
              {isEdit ? "Save Changes" : "Create User Account"}
            </h3>
            <p className="admin-text-light">
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
              className="px-8 py-3 admin-border border rounded-xl admin-text hover:admin-card hover:bg-opacity-50 transition-colors duration-200 font-medium text-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="user-form"
              disabled={saving}
              className={`flex items-center space-x-3 px-10 py-3 rounded-xl transition-colors duration-200 font-medium text-lg shadow-lg ${getButtonClasses('primary')} disabled:opacity-50`}
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
