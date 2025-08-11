"use client";

import { useState, useEffect } from "react";
import { 
  Server, 
  Shield, 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader,
  Eye,
  EyeOff 
} from "lucide-react";

export default function LDAPIntegration() {
  const [settings, setSettings] = useState({
    ldap_enabled: false,
    ldap_server: '',
    ldap_port: '389',
    ldap_base_dn: '',
    ldap_bind_dn: '',
    ldap_bind_password: '',
    ldap_user_search_base: '',
    ldap_group_search_base: '',
    ldap_use_ssl: false
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load current LDAP settings
  useEffect(() => {
    loadLDAPSettings();
  }, []);

  const loadLDAPSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings/ldap');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load LDAP settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setTestResult(null); // Clear test result when settings change
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/settings/ldap', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setHasChanges(false);
        setTestResult({ success: true, message: 'LDAP settings saved successfully' });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save LDAP settings:', error);
      setTestResult({ success: false, message: 'Failed to save LDAP settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/admin/settings/ldap/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      console.error('LDAP test failed:', error);
      setTestResult({ success: false, message: 'Failed to test LDAP connection' });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="admin-card p-6">
        <div className="flex items-center justify-center">
          <Loader className="h-6 w-6 animate-spin admin-text" />
          <span className="ml-2 admin-text">Loading LDAP settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-card">
      {/* Header */}
      <div className="p-6 border-b admin-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 admin-bg-secondary rounded-lg">
              <Server className="h-5 w-5 admin-text" />
            </div>
            <div>
              <h3 className="font-semibold admin-text">LDAP Authentication</h3>
              <p className="text-sm admin-text-light">
                Connect to your LDAP directory for enterprise authentication
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div 
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                settings.ldap_enabled 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {settings.ldap_enabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Enable LDAP Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium admin-text">Enable LDAP Authentication</label>
            <p className="text-sm admin-text-light">
              Allow users to authenticate using LDAP credentials
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only"
              checked={settings.ldap_enabled}
              onChange={(e) => handleInputChange('ldap_enabled', e.target.checked)}
            />
            <div className={`w-11 h-6 rounded-full transition-colors ${
              settings.ldap_enabled 
                ? 'bg-indigo-600' 
                : 'bg-gray-200 dark:bg-gray-700'
            }`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                settings.ldap_enabled ? 'translate-x-5' : 'translate-x-0'
              } mt-0.5 ml-0.5`} />
            </div>
          </label>
        </div>

        {settings.ldap_enabled && (
          <>
            {/* Server Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium admin-text mb-2">
                  LDAP Server <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 admin-input"
                  placeholder="ldap.company.com"
                  value={settings.ldap_server}
                  onChange={(e) => handleInputChange('ldap_server', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium admin-text mb-2">
                  Port
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 admin-input"
                  placeholder="389"
                  value={settings.ldap_port}
                  onChange={(e) => handleInputChange('ldap_port', e.target.value)}
                />
              </div>
            </div>

            {/* Base DN */}
            <div>
              <label className="block text-sm font-medium admin-text mb-2">
                Base DN <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 admin-input"
                placeholder="dc=company,dc=com"
                value={settings.ldap_base_dn}
                onChange={(e) => handleInputChange('ldap_base_dn', e.target.value)}
              />
              <p className="text-xs admin-text-light mt-1">
                The base distinguished name for LDAP searches
              </p>
            </div>

            {/* Bind Credentials */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium admin-text mb-2">
                  Bind DN <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 admin-input"
                  placeholder="cn=admin,dc=company,dc=com"
                  value={settings.ldap_bind_dn}
                  onChange={(e) => handleInputChange('ldap_bind_dn', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium admin-text mb-2">
                  Bind Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full px-3 py-2 pr-10 admin-input"
                    placeholder="••••••••"
                    value={settings.ldap_bind_password}
                    onChange={(e) => handleInputChange('ldap_bind_password', e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 admin-text-light" />
                    ) : (
                      <Eye className="h-4 w-4 admin-text-light" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Search Bases */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium admin-text mb-2">
                  User Search Base
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 admin-input"
                  placeholder="ou=users,dc=company,dc=com"
                  value={settings.ldap_user_search_base}
                  onChange={(e) => handleInputChange('ldap_user_search_base', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium admin-text mb-2">
                  Group Search Base
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 admin-input"
                  placeholder="ou=groups,dc=company,dc=com"
                  value={settings.ldap_group_search_base}
                  onChange={(e) => handleInputChange('ldap_group_search_base', e.target.value)}
                />
              </div>
            </div>

            {/* SSL Option */}
            <div className="flex items-center space-x-3">
              <input
                id="ldap_ssl"
                type="checkbox"
                className="admin-checkbox"
                checked={settings.ldap_use_ssl}
                onChange={(e) => handleInputChange('ldap_use_ssl', e.target.checked)}
              />
              <label htmlFor="ldap_ssl" className="text-sm font-medium admin-text">
                Use SSL/TLS (LDAPS)
              </label>
            </div>

            {/* Test Result */}
            {testResult && (
              <div className={`p-4 rounded-lg ${
                testResult.success 
                  ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800'
                  : 'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800'
              }`}>
                <div className="flex items-start space-x-3">
                  {testResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${
                      testResult.success 
                        ? 'text-green-800 dark:text-green-200'
                        : 'text-red-800 dark:text-red-200'
                    }`}>
                      {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                    </p>
                    <p className={`text-sm ${
                      testResult.success 
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-red-700 dark:text-red-300'
                    }`}>
                      {testResult.message}
                    </p>
                    {testResult.details && (
                      <p className={`text-xs mt-1 ${
                        testResult.success 
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {testResult.details}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 admin-bg-secondary border-t admin-border flex items-center justify-between">
        <div className="text-sm admin-text-light">
          {hasChanges && (
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>You have unsaved changes</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {settings.ldap_enabled && (
            <button
              onClick={handleTestConnection}
              disabled={isTesting || !settings.ldap_server || !settings.ldap_base_dn}
              className="px-4 py-2 text-sm font-medium admin-text admin-border border rounded-lg hover:admin-bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTesting ? (
                <>
                  <Loader className="h-4 w-4 animate-spin mr-2" />
                  Testing...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}