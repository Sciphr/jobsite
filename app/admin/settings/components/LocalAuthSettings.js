"use client";

import { useState, useEffect } from "react";
import { 
  Key, 
  Shield, 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader,
  Settings,
  UserCheck
} from "lucide-react";

export default function LocalAuthSettings() {
  const [settings, setSettings] = useState({
    local_auth_enabled: true
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  // Load settings on component mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/settings/local-auth');
      const data = await response.json();
      
      if (response.ok) {
        setSettings(data);
      } else {
        console.error('Failed to fetch local auth settings:', data.error);
        // Use defaults on error
        setSettings({ local_auth_enabled: true });
      }
    } catch (error) {
      console.error('Error fetching local auth settings:', error);
      setSettings({ local_auth_enabled: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleLocalAuth = async (enabled) => {
    if (!enabled) {
      const confirmed = window.confirm(
        "⚠️ WARNING: Disabling local authentication will prevent users from logging in with username/password. " +
        "Make sure you have LDAP or SAML properly configured and tested first. " +
        "Are you sure you want to continue?"
      );
      if (!confirmed) return;
    }

    setIsSaving(true);
    setSaveStatus(null);

    try {
      const response = await fetch('/api/admin/settings/local-auth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          local_auth_enabled: enabled 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSettings(prev => ({ ...prev, local_auth_enabled: enabled }));
        setSaveStatus('success');
        
        // Show success message
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus('error');
        console.error('Failed to update local auth setting:', data.error);
      }
    } catch (error) {
      console.error('Error updating local auth setting:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader className="h-6 w-6 animate-spin admin-text" />
        <span className="ml-2 admin-text">Loading local authentication settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-lg ${
            settings.local_auth_enabled 
              ? 'bg-green-100 dark:bg-green-900/30' 
              : 'bg-red-100 dark:bg-red-900/30'
          }`}>
            <Key className={`h-5 w-5 ${
              settings.local_auth_enabled
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`} />
          </div>
          <div>
            <h4 className="text-base font-semibold admin-text">Enable Local Authentication</h4>
            <p className="text-sm admin-text-light mt-1">
              Allow users to log in with username and password stored in your database
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Save Status */}
          {saveStatus === 'success' && (
            <div className="flex items-center space-x-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Saved</span>
            </div>
          )}
          
          {saveStatus === 'error' && (
            <div className="flex items-center space-x-1 text-red-600">
              <XCircle className="h-4 w-4" />
              <span className="text-sm">Error</span>
            </div>
          )}

          {/* Toggle Switch */}
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only"
              checked={settings.local_auth_enabled}
              onChange={(e) => handleToggleLocalAuth(e.target.checked)}
              disabled={isSaving}
            />
            <div className={`w-11 h-6 rounded-full transition-colors ${
              settings.local_auth_enabled 
                ? 'bg-green-600' 
                : 'bg-gray-200 dark:bg-gray-700'
            } ${isSaving ? 'opacity-50' : ''}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                settings.local_auth_enabled ? 'translate-x-5' : 'translate-x-0'
              } mt-0.5 ml-0.5`}>
                {isSaving && (
                  <Loader className="h-3 w-3 animate-spin text-gray-400 m-1" />
                )}
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Status Information */}
      <div className={`rounded-lg border p-4 ${
        settings.local_auth_enabled
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      }`}>
        <div className="flex items-start space-x-3">
          {settings.local_auth_enabled ? (
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          )}
          <div>
            <h5 className={`text-sm font-medium ${
              settings.local_auth_enabled
                ? 'text-green-800 dark:text-green-200'
                : 'text-yellow-800 dark:text-yellow-200'
            }`}>
              {settings.local_auth_enabled ? 'Local Authentication Enabled' : 'Local Authentication Disabled'}
            </h5>
            <p className={`text-sm mt-1 ${
              settings.local_auth_enabled
                ? 'text-green-700 dark:text-green-300'
                : 'text-yellow-700 dark:text-yellow-300'
            }`}>
              {settings.local_auth_enabled 
                ? 'Users can log in with their username and password. This is the traditional authentication method.'
                : 'Users cannot log in with username/password. Only LDAP and SAML authentication methods are available.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Security Recommendations */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h5 className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Security Recommendations
            </h5>
            <div className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-2">
              <p>
                <strong>For Enterprise Organizations:</strong> Consider disabling local authentication 
                if you have LDAP or SAML configured. This centralizes user management and improves security.
              </p>
              <p>
                <strong>Before Disabling:</strong> Ensure your LDAP/SAML configuration is working correctly 
                and test with a few users first.
              </p>
              <p>
                <strong>Account Linking:</strong> Existing local accounts will automatically be linked 
                when users log in via LDAP/SAML with the same email address.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}