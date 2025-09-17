"use client";

import { useState, useEffect } from "react";
import {
  Tags,
  Type,
  UserCheck,
  Shield,
  Settings,
  CheckCircle,
  XCircle,
  Loader
} from "lucide-react";
import { useAuthSettings, useUpdateAuthSettings } from "@/app/hooks/useAdminData";

export default function AuthenticationLabels() {
  // Use React Query hooks for data fetching and mutations
  const { data: authSettings, isLoading, error } = useAuthSettings();
  const updateAuthSettings = useUpdateAuthSettings();

  // Local state for form inputs and UI states
  const [settings, setSettings] = useState({
    local_auth_label: 'Local Login',
    local_auth_description: 'For external candidates and contractors',
    ldap_auth_label: 'Employee Login',
    ldap_auth_description: 'Use your company credentials',
    saml_auth_label: 'Company Login',
    saml_auth_description: 'Use your single sign-on account',
    auth_show_descriptions: true,
    auth_default_method: 'local'
  });

  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Update local state when React Query data loads
  useEffect(() => {
    if (authSettings) {
      setSettings(authSettings);
    }
  }, [authSettings]);

  // Handle success message timing
  useEffect(() => {
    if (updateAuthSettings.isSuccess) {
      setShowSuccessMessage(true);
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
        updateAuthSettings.reset(); // Reset the mutation state
      }, 4000); // Show for 4 seconds

      return () => clearTimeout(timer);
    }
  }, [updateAuthSettings.isSuccess]);

  const handleSaveLabels = async () => {
    const settingsToSave = {
      local_auth_label: settings.local_auth_label,
      local_auth_description: settings.local_auth_description,
      ldap_auth_label: settings.ldap_auth_label,
      ldap_auth_description: settings.ldap_auth_description,
      saml_auth_label: settings.saml_auth_label,
      saml_auth_description: settings.saml_auth_description,
      auth_show_descriptions: settings.auth_show_descriptions,
      auth_default_method: settings.auth_default_method
    };

    updateAuthSettings.mutate(settingsToSave);
  };

  const handleInputChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader className="h-6 w-6 animate-spin admin-text" />
        <span className="ml-2 admin-text">Loading authentication label settings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-6 text-red-600">
        <XCircle className="h-6 w-6 mr-2" />
        <span>Error loading authentication settings: {error.message}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {/* Local Auth Labels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium admin-text mb-2">
              Local Authentication Label
            </label>
            <div className="relative">
              <Type className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 admin-text-light" />
              <input
                type="text"
                value={settings.local_auth_label}
                onChange={(e) => handleInputChange('local_auth_label', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg admin-bg admin-text focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Guest Login"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium admin-text mb-2">
              Local Authentication Description
            </label>
            <input
              type="text"
              value={settings.local_auth_description}
              onChange={(e) => handleInputChange('local_auth_description', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg admin-bg admin-text focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., For external candidates and contractors"
            />
          </div>
        </div>

        {/* LDAP Auth Labels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium admin-text mb-2">
              LDAP Authentication Label
            </label>
            <div className="relative">
              <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 admin-text-light" />
              <input
                type="text"
                value={settings.ldap_auth_label}
                onChange={(e) => handleInputChange('ldap_auth_label', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg admin-bg admin-text focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Employee Login"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium admin-text mb-2">
              LDAP Authentication Description
            </label>
            <input
              type="text"
              value={settings.ldap_auth_description}
              onChange={(e) => handleInputChange('ldap_auth_description', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg admin-bg admin-text focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Use your company credentials"
            />
          </div>
        </div>

        {/* SAML Auth Labels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium admin-text mb-2">
              SAML Authentication Label
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 admin-text-light" />
              <input
                type="text"
                value={settings.saml_auth_label}
                onChange={(e) => handleInputChange('saml_auth_label', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg admin-bg admin-text focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Company Login"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium admin-text mb-2">
              SAML Authentication Description
            </label>
            <input
              type="text"
              value={settings.saml_auth_description}
              onChange={(e) => handleInputChange('saml_auth_description', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg admin-bg admin-text focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Use your single sign-on account"
            />
          </div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium admin-text mb-2">
              Show Descriptions
            </label>
            <div className="flex items-center space-x-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={settings.auth_show_descriptions}
                  onChange={(e) => handleInputChange('auth_show_descriptions', e.target.checked)}
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${
                  settings.auth_show_descriptions
                    ? 'bg-green-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                    settings.auth_show_descriptions ? 'translate-x-5' : 'translate-x-0'
                  } mt-0.5 ml-0.5`}></div>
                </div>
              </label>
              <span className="text-sm admin-text-light">Display description text under authentication methods</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium admin-text mb-2">
              Default Authentication Method
            </label>
            <select
              value={settings.auth_default_method}
              onChange={(e) => handleInputChange('auth_default_method', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg admin-bg admin-text focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="local">Local Authentication</option>
              <option value="ldap">LDAP Authentication</option>
              <option value="saml">SAML Authentication</option>
            </select>
          </div>
        </div>

        {/* Save Section */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            {/* Save Status */}
            {showSuccessMessage && (
              <div className="flex items-center space-x-1 text-green-600 animate-fade-in">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Saved successfully</span>
              </div>
            )}

            {updateAuthSettings.isError && (
              <div className="flex items-center space-x-1 text-red-600">
                <XCircle className="h-4 w-4" />
                <span className="text-sm">Error: {updateAuthSettings.error?.message || 'Failed to save changes'}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleSaveLabels}
            disabled={updateAuthSettings.isPending}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {updateAuthSettings.isPending ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Settings className="h-4 w-4" />
            )}
            <span>{updateAuthSettings.isPending ? 'Saving...' : 'Save Authentication Labels'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}