import { useState, useEffect } from "react";
import PermissionSelector from "./PermissionSelector";

const ROLE_COLORS = [
  { name: "Blue", value: "blue", class: "bg-blue-500" },
  { name: "Green", value: "green", class: "bg-green-500" },
  { name: "Purple", value: "purple", class: "bg-purple-500" },
  { name: "Red", value: "red", class: "bg-red-500" },
  { name: "Yellow", value: "yellow", class: "bg-yellow-500" },
  { name: "Indigo", value: "indigo", class: "bg-indigo-500" },
  { name: "Pink", value: "pink", class: "bg-pink-500" },
  { name: "Gray", value: "gray", class: "bg-gray-500" },
];

export default function EditRoleModal({ isOpen, role, onClose, onRoleUpdated }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "blue",
    isActive: true,
  });
  const [selectedPermissions, setSelectedPermissions] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [initialLoad, setInitialLoad] = useState(true);
  const [allowSubmission, setAllowSubmission] = useState(false);

  useEffect(() => {
    if (isOpen && role) {
      console.log('🔍 EditRoleModal Debug:', { isOpen, role, currentStep, initialLoad });
      // Populate form with role data
      setFormData({
        name: role.name || "",
        description: role.description || "",
        color: role.color || "blue",
        isActive: role.is_active ?? true,
      });

      // Convert role permissions to set
      const permissionSet = new Set();
      if (role.role_permissions) {
        role.role_permissions.forEach(rp => {
          if (rp.permissions) {
            permissionSet.add(`${rp.permissions.resource}:${rp.permissions.action}`);
          }
        });
      }
      setSelectedPermissions(permissionSet);
      
      setCurrentStep(1);
      setError(null);
      setInitialLoad(false);
      setAllowSubmission(false);
    }
  }, [isOpen, role]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleColorSelect = (color) => {
    setFormData(prev => ({ ...prev, color }));
  };

  const handleNextStep = () => {
    console.log('🔧 handleNextStep called, currentStep:', currentStep, 'formData:', formData);
    if (currentStep === 1) {
      // Validate basic info
      if (!formData.name.trim()) {
        console.log('❌ Validation failed: name required');
        setError("Role name is required");
        return;
      }
      if (formData.name.length < 2) {
        console.log('❌ Validation failed: name too short');
        setError("Role name must be at least 2 characters long");
        return;
      }
      console.log('✅ Validation passed, moving to step 2');
      setError(null);
      setCurrentStep(2);
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🔧 handleSubmit called, currentStep:', currentStep, 'allowSubmission:', allowSubmission);
    
    // Only allow submission on step 2 and when explicitly requested
    if (currentStep !== 2 || !allowSubmission) {
      console.log('❌ Form submission blocked - not on final step or not allowed');
      setAllowSubmission(false); // Reset flag
      return;
    }
    
    if (selectedPermissions.size === 0) {
      setError("Please select at least one permission");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/roles/${role.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          color: formData.color,
          is_active: formData.isActive,
          permissions: Array.from(selectedPermissions),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update role");
      }

      const data = await response.json();
      console.log('✅ Role updated successfully, calling onRoleUpdated');
      onRoleUpdated(data.role);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !role) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6 relative z-[61]">
          <div className="sm:flex sm:items-start">
            <div className="w-full">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Edit Role: {role.name}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-sm text-gray-500">
                      Step {currentStep} of 2: {currentStep === 1 ? "Basic Information" : "Permissions"}
                    </p>
                    {role.is_system_role && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        System Role
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* System Role Warning */}
              {role.is_system_role && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">System Role Notice</h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>This is a system role with restricted editing capabilities. Changes to permissions should be made carefully as they may affect core system functionality.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center">
                  <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full border-2 ${currentStep >= 1 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'}`}>
                      {currentStep > 1 ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="text-sm font-medium">1</span>
                      )}
                    </div>
                    <span className="ml-2 text-sm font-medium">Basic Info</span>
                  </div>
                  
                  <div className={`flex-1 h-1 mx-4 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                  
                  <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full border-2 ${currentStep >= 2 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'}`}>
                      <span className="text-sm font-medium">2</span>
                    </div>
                    <span className="ml-2 text-sm font-medium">Permissions</span>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} onKeyDown={(e) => {
                if (e.key === 'Enter' && currentStep === 1) {
                  e.preventDefault();
                  handleNextStep();
                }
              }}>
                {currentStep === 1 && (
                  <div className="space-y-6">
                    {/* Role Name */}
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Role Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        disabled={role.is_system_role}
                        className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                          role.is_system_role ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                        placeholder="e.g., Content Manager, Team Lead, etc."
                      />
                      {role.is_system_role && (
                        <p className="mt-1 text-xs text-gray-500">System role names cannot be modified</p>
                      )}
                    </div>

                    {/* Description */}
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        Description (Optional)
                      </label>
                      <textarea
                        name="description"
                        id="description"
                        rows={3}
                        value={formData.description}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Describe what this role is responsible for..."
                      />
                    </div>

                    {/* Color Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Role Color
                      </label>
                      <div className="flex flex-wrap gap-3">
                        {ROLE_COLORS.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => handleColorSelect(color.value)}
                            className={`flex items-center space-x-2 px-3 py-2 rounded-md border-2 transition-colors ${
                              formData.color === color.value
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full ${color.class}`}></div>
                            <span className="text-sm text-gray-700">{color.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center">
                      <input
                        id="isActive"
                        name="isActive"
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                        Role is active and can be assigned to users
                      </label>
                    </div>
                  </div>
                )}

                {currentStep === 2 && !initialLoad && (
                  <div>
                    <div className="mb-4">
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Select Permissions</h4>
                      <p className="text-sm text-gray-600">Choose the permissions this role should have.</p>
                    </div>
                    <PermissionSelector
                      selectedPermissions={selectedPermissions}
                      onPermissionChange={setSelectedPermissions}
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-8 flex justify-between">
                  <div>
                    {currentStep === 2 && (
                      <button
                        type="button"
                        onClick={handlePrevStep}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <svg className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Previous
                      </button>
                    )}
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>

                    {currentStep === 1 ? (
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Next: Review Permissions
                        <svg className="ml-2 -mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={loading || selectedPermissions.size === 0}
                        onClick={() => setAllowSubmission(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Updating Role...
                          </>
                        ) : (
                          <>
                            <svg className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Update Role
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}