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
  EyeOff,
  Settings,
  Search,
  UserCheck
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
    ldap_use_ssl: false,
    // Field mapping settings
    ldap_field_email: 'mail',
    ldap_field_first_name: 'givenName',
    ldap_field_last_name: 'sn',
    ldap_field_phone: 'telephoneNumber',
    ldap_field_display_name: 'displayName',
    ldap_field_user_id: 'uid',
    ldap_use_default_fallbacks: true
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const [showConfiguration, setShowConfiguration] = useState(false);
  const [fieldTestResults, setFieldTestResults] = useState(null);
  const [testUsername, setTestUsername] = useState('');
  const [isTestingFields, setIsTestingFields] = useState(false);
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

  const handleTestFieldMapping = async () => {
    if (!testUsername.trim()) {
      setFieldTestResults({ success: false, message: 'Please enter a test username' });
      return;
    }

    setIsTestingFields(true);
    setFieldTestResults(null);
    
    try {
      const fieldMappings = {
        email: settings.ldap_field_email,
        first_name: settings.ldap_field_first_name,
        last_name: settings.ldap_field_last_name,
        phone: settings.ldap_field_phone,
        display_name: settings.ldap_field_display_name,
        user_id: settings.ldap_field_user_id
      };

      const response = await fetch('/api/admin/settings/ldap/test-fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testUsername, fieldMappings }),
      });

      const data = await response.json();
      setFieldTestResults(data);
    } catch (error) {
      console.error('Field mapping test failed:', error);
      setFieldTestResults({ success: false, message: 'Failed to test field mappings' });
    } finally {
      setIsTestingFields(false);
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
          <div className="flex items-center space-x-3">
            <div 
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                settings.ldap_enabled 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {settings.ldap_enabled ? 'Enabled' : 'Disabled'}
            </div>
            {settings.ldap_enabled && (
              <button
                type="button"
                onClick={() => setShowConfiguration(!showConfiguration)}
                className="px-3 py-1.5 text-xs font-medium admin-text admin-border border rounded hover:admin-card hover:bg-opacity-50 transition-colors"
              >
                <Settings className="h-3 w-3 inline mr-1" />
                {showConfiguration ? 'Hide Config' : 'Configure'}
              </button>
            )}
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
            {/* Server Configuration - Hidden by default when enabled */}
            {showConfiguration && (
              <>
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
              </>
            )}

            {/* Field Mapping Section - Always visible when LDAP enabled */}
            <div className="border-t admin-border pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 admin-text" />
                  <div>
                    <h4 className="text-sm font-medium admin-text">Field Mapping</h4>
                    <p className="text-xs admin-text-light">
                      Map LDAP attributes to application fields
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFieldMapping(!showFieldMapping)}
                  className="px-3 py-1.5 text-xs font-medium admin-text admin-border border rounded hover:admin-card hover:bg-opacity-50 transition-colors"
                >
                  {showFieldMapping ? 'Hide' : 'Customize'} Mapping
                </button>
              </div>

              {showFieldMapping && (
                <div className="space-y-4 p-4 admin-card bg-opacity-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium admin-text mb-1">
                        Email Attribute *
                      </label>
                      <input
                        type="text"
                        value={settings.ldap_field_email}
                        onChange={(e) => handleInputChange('ldap_field_email', e.target.value)}
                        placeholder="e.g., mail, email, userPrincipalName"
                        className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium admin-text mb-1">
                        User ID Attribute *
                      </label>
                      <input
                        type="text"
                        value={settings.ldap_field_user_id}
                        onChange={(e) => handleInputChange('ldap_field_user_id', e.target.value)}
                        placeholder="e.g., uid, sAMAccountName, cn"
                        className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium admin-text mb-1">
                        First Name Attribute
                      </label>
                      <input
                        type="text"
                        value={settings.ldap_field_first_name}
                        onChange={(e) => handleInputChange('ldap_field_first_name', e.target.value)}
                        placeholder="e.g., givenName, firstName, fname"
                        className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium admin-text mb-1">
                        Last Name Attribute
                      </label>
                      <input
                        type="text"
                        value={settings.ldap_field_last_name}
                        onChange={(e) => handleInputChange('ldap_field_last_name', e.target.value)}
                        placeholder="e.g., sn, surname, lastName, lname"
                        className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium admin-text mb-1">
                        Phone Attribute
                      </label>
                      <input
                        type="text"
                        value={settings.ldap_field_phone}
                        onChange={(e) => handleInputChange('ldap_field_phone', e.target.value)}
                        placeholder="e.g., telephoneNumber, mobile, phone"
                        className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium admin-text mb-1">
                        Display Name Attribute
                      </label>
                      <input
                        type="text"
                        value={settings.ldap_field_display_name}
                        onChange={(e) => handleInputChange('ldap_field_display_name', e.target.value)}
                        placeholder="e.g., displayName, cn, fullName"
                        className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-3 border-t admin-border">
                    <input
                      id="use_fallbacks"
                      type="checkbox"
                      className="admin-checkbox"
                      checked={settings.ldap_use_default_fallbacks}
                      onChange={(e) => handleInputChange('ldap_use_default_fallbacks', e.target.checked)}
                    />
                    <label htmlFor="use_fallbacks" className="text-xs admin-text">
                      Use default fallbacks for empty fields (recommended)
                    </label>
                  </div>

                  {/* Field Test Section */}
                  <div className="border-t admin-border pt-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <UserCheck className="h-4 w-4 admin-text" />
                      <h5 className="text-xs font-medium admin-text">Test Field Mapping</h5>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="text"
                        value={testUsername}
                        onChange={(e) => setTestUsername(e.target.value)}
                        placeholder="Enter test username (e.g., tesla)"
                        className="flex-1 px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={handleTestFieldMapping}
                        disabled={isTestingFields || !testUsername.trim()}
                        className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isTestingFields ? (
                          <Loader className="h-3 w-3 animate-spin" />
                        ) : (
                          <Search className="h-3 w-3" />
                        )}
                        <span>{isTestingFields ? 'Testing...' : 'Test Fields'}</span>
                      </button>
                    </div>

                    {/* Field Test Results */}
                    {fieldTestResults && (
                      <div className={`mt-3 p-3 rounded-lg text-xs ${
                        fieldTestResults.found && !fieldTestResults.error
                          ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800'
                          : 'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800'
                      }`}>
                        {fieldTestResults.found && !fieldTestResults.error ? (
                          <div>
                            <p className="font-medium text-green-800 dark:text-green-200 mb-2">
                              ✅ User found! Mapped fields:
                            </p>
                            <div className="space-y-1">
                              {Object.entries(fieldTestResults.mappedData || {}).map(([field, value]) => (
                                <p key={field} className="text-green-700 dark:text-green-300">
                                  <span className="font-medium">{field}:</span> {value || 'empty'}
                                </p>
                              ))}
                            </div>
                            {fieldTestResults.allAttributes && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300">
                                  View all available attributes
                                </summary>
                                <div className="mt-1 pl-2 space-y-1 max-h-32 overflow-y-auto">
                                  {Object.entries(fieldTestResults.allAttributes).map(([attr, values]) => (
                                    <p key={attr} className="text-green-600 dark:text-green-400">
                                      <span className="font-mono">{attr}:</span> {Array.isArray(values) ? values.join(', ') : values}
                                    </p>
                                  ))}
                                </div>
                              </details>
                            )}
                          </div>
                        ) : (
                          <p className="text-red-800 dark:text-red-200">
                            ❌ {fieldTestResults.message || fieldTestResults.error || 'User not found'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
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
              className="flex items-center px-4 py-2 text-sm font-medium admin-text admin-border border rounded-lg hover:admin-bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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