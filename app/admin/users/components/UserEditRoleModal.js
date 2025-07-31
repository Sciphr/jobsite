"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import UserRoleManager from "./UserRoleManager";

export default function UserEditRoleModal({ 
  isOpen, 
  user, 
  onClose, 
  onUserUpdated 
}) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchRoles();
    }
  }, [isOpen]);

  const fetchRoles = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/roles');
      if (!response.ok) {
        throw new Error('Failed to fetch roles');
      }
      
      const data = await response.json();
      setRoles(data.roles || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

      // Refresh data
      if (onUserUpdated) {
        onUserUpdated();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccessMessage(null);
    onClose();
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6 relative z-[61]">
          <div className="sm:flex sm:items-start">
            <div className="w-full">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Manage Roles: {user.firstName || user.email}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Assign or remove roles for this user. Changes take effect immediately.
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <span className="sr-only">Close</span>
                  <X className="h-6 w-6" />
                </button>
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

              {/* Success Message Display */}
              {successMessage && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Automatic Role Assignment</h3>
                      <p className="text-sm text-blue-700 mt-1">{successMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <UserRoleManager
                  user={user}
                  availableRoles={roles}
                  onRoleChange={handleRoleChange}
                  isLoading={saving}
                  compact={false}
                />
              )}

              {/* Action Buttons */}
              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}