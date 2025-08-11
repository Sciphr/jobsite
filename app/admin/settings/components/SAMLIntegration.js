"use client";

import { useState, useEffect } from "react";
import { 
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
  UserCheck,
  Copy,
  ExternalLink,
  Zap
} from "lucide-react";
import { SAML_PROVIDER_PRESETS } from "../../../lib/saml";

export default function SAMLIntegration() {
  const [settings, setSettings] = useState({
    saml_enabled: false,
    saml_entity_id: '',
    saml_sso_url: '',
    saml_sls_url: '',
    saml_certificate: '',
    saml_private_key: '',
    saml_want_assertions_signed: true,
    saml_want_response_signed: true,
    // Field mapping settings
    saml_field_email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
    saml_field_first_name: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
    saml_field_last_name: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
    saml_field_phone: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/mobilephone',
    saml_field_display_name: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/displayname',
    saml_field_user_id: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
    saml_use_default_fallbacks: true
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const [showConfiguration, setShowConfiguration] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [fieldTestResults, setFieldTestResults] = useState(null);
  const [testSamlResponse, setTestSamlResponse] = useState('');
  const [isTestingFields, setIsTestingFields] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('');

  // Load current SAML settings
  useEffect(() => {
    loadSAMLSettings();
  }, []);

  const loadSAMLSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings/saml');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load SAML settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setTestResult(null); // Clear test result when settings change
  };

  const applyProviderPreset = (presetKey) => {
    const preset = SAML_PROVIDER_PRESETS[presetKey];
    if (preset) {
      const fieldMappingUpdates = {};
      
      // Map field names correctly
      if (preset.fieldMappings.email) fieldMappingUpdates.saml_field_email = preset.fieldMappings.email;
      if (preset.fieldMappings.firstName) fieldMappingUpdates.saml_field_first_name = preset.fieldMappings.firstName;
      if (preset.fieldMappings.lastName) fieldMappingUpdates.saml_field_last_name = preset.fieldMappings.lastName;
      if (preset.fieldMappings.displayName) fieldMappingUpdates.saml_field_display_name = preset.fieldMappings.displayName;
      if (preset.fieldMappings.userId) fieldMappingUpdates.saml_field_user_id = preset.fieldMappings.userId;
      
      setSettings(prev => ({
        ...prev,
        saml_entity_id: preset.entityId,
        ...fieldMappingUpdates
      }));
      setHasChanges(true);
      setSelectedPreset(presetKey);
      
      console.log('Applied preset:', presetKey, fieldMappingUpdates);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/settings/saml', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setHasChanges(false);
        setTestResult({ success: true, message: 'SAML settings saved successfully' });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save SAML settings:', error);
      setTestResult({ success: false, message: 'Failed to save SAML settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/admin/settings/saml/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      console.error('SAML test failed:', error);
      setTestResult({ success: false, message: 'Failed to test SAML connection' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestAttributeMapping = async () => {
    if (!testSamlResponse.trim()) {
      setFieldTestResults({ success: false, message: 'Please enter a test SAML response or use the mock test' });
      return;
    }

    setIsTestingFields(true);
    setFieldTestResults(null);
    
    try {
      const attributeMappings = {
        email: settings.saml_field_email,
        first_name: settings.saml_field_first_name,
        last_name: settings.saml_field_last_name,
        phone: settings.saml_field_phone,
        display_name: settings.saml_field_display_name,
        user_id: settings.saml_field_user_id
      };

      const response = await fetch('/api/admin/settings/saml/test-attributes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testSamlResponse, attributeMappings }),
      });

      const data = await response.json();
      setFieldTestResults(data);
    } catch (error) {
      console.error('Attribute mapping test failed:', error);
      setFieldTestResults({ success: false, message: 'Failed to test attribute mappings' });
    } finally {
      setIsTestingFields(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const getMetadataUrl = () => {
    return `${window.location.origin}/api/auth/saml/metadata`;
  };

  const getAcsUrl = () => {
    return `${window.location.origin}/api/auth/saml/acs`;
  };

  if (isLoading) {
    return (
      <div className="admin-card p-6">
        <div className="flex items-center justify-center">
          <Loader className="h-6 w-6 animate-spin admin-text" />
          <span className="ml-2 admin-text">Loading SAML settings...</span>
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
              <Shield className="h-5 w-5 admin-text" />
            </div>
            <div>
              <h3 className="font-semibold admin-text">SAML Authentication</h3>
              <p className="text-sm admin-text-light">
                Connect to your SAML Identity Provider for Single Sign-On (SSO)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div 
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                settings.saml_enabled 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {settings.saml_enabled ? 'Enabled' : 'Disabled'}
            </div>
            {settings.saml_enabled && (
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
        {/* Enable SAML Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium admin-text">Enable SAML Authentication</label>
            <p className="text-sm admin-text-light">
              Allow users to authenticate using SAML SSO
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only"
              checked={settings.saml_enabled}
              onChange={(e) => handleInputChange('saml_enabled', e.target.checked)}
            />
            <div className={`w-11 h-6 rounded-full transition-colors ${
              settings.saml_enabled 
                ? 'bg-indigo-600' 
                : 'bg-gray-200 dark:bg-gray-700'
            }`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                settings.saml_enabled ? 'translate-x-5' : 'translate-x-0'
              } mt-0.5 ml-0.5`} />
            </div>
          </label>
        </div>

        {settings.saml_enabled && (
          <>
            {/* Provider Presets */}
            <div className="border-t admin-border pt-6">
              <div className="flex items-center space-x-3 mb-4">
                <Zap className="h-5 w-5 admin-text" />
                <div>
                  <h4 className="text-sm font-medium admin-text">Quick Setup</h4>
                  <p className="text-xs admin-text-light">
                    Use presets for common SAML providers
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(SAML_PROVIDER_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => applyProviderPreset(key)}
                    className={`p-3 text-xs font-medium rounded-lg border transition-colors ${
                      selectedPreset === key
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-300'
                        : 'admin-border hover:admin-bg-secondary admin-text'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Integration URLs */}
            <div className="border-t admin-border pt-6">
              <div className="flex items-center space-x-3 mb-4">
                <ExternalLink className="h-5 w-5 admin-text" />
                <div>
                  <h4 className="text-sm font-medium admin-text">Integration URLs</h4>
                  <p className="text-xs admin-text-light">
                    Configure these URLs in your SAML Identity Provider
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium admin-text mb-1">
                    Metadata URL
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={getMetadataUrl()}
                      readOnly
                      className="flex-1 px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    />
                    <button
                      onClick={() => copyToClipboard(getMetadataUrl())}
                      className="px-2 py-2 text-xs admin-text admin-border border rounded hover:admin-bg-secondary"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium admin-text mb-1">
                    Assertion Consumer Service (ACS) URL
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={getAcsUrl()}
                      readOnly
                      className="flex-1 px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    />
                    <button
                      onClick={() => copyToClipboard(getAcsUrl())}
                      className="px-2 py-2 text-xs admin-text admin-border border rounded hover:admin-bg-secondary"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* SAML Configuration - Hidden by default when enabled */}
            {showConfiguration && (
              <>
                <div className="border-t admin-border pt-6">
                  <div className="space-y-4">
                    {/* Entity ID */}
                    <div>
                      <label className="block text-sm font-medium admin-text mb-2">
                        Entity ID / Issuer <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 admin-input"
                        placeholder="https://sts.windows.net/{tenant-id}/"
                        value={settings.saml_entity_id}
                        onChange={(e) => handleInputChange('saml_entity_id', e.target.value)}
                      />
                      <p className="text-xs admin-text-light mt-1">
                        The Entity ID from your Identity Provider
                      </p>
                    </div>

                    {/* SSO URL */}
                    <div>
                      <label className="block text-sm font-medium admin-text mb-2">
                        SSO URL <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="url"
                        className="w-full px-3 py-2 admin-input"
                        placeholder="https://login.microsoftonline.com/{tenant-id}/saml2"
                        value={settings.saml_sso_url}
                        onChange={(e) => handleInputChange('saml_sso_url', e.target.value)}
                      />
                      <p className="text-xs admin-text-light mt-1">
                        Single Sign-On URL from your Identity Provider
                      </p>
                    </div>

                    {/* SLS URL */}
                    <div>
                      <label className="block text-sm font-medium admin-text mb-2">
                        Single Logout URL (Optional)
                      </label>
                      <input
                        type="url"
                        className="w-full px-3 py-2 admin-input"
                        placeholder="https://login.microsoftonline.com/{tenant-id}/saml2"
                        value={settings.saml_sls_url}
                        onChange={(e) => handleInputChange('saml_sls_url', e.target.value)}
                      />
                    </div>

                    {/* Certificate */}
                    <div>
                      <label className="block text-sm font-medium admin-text mb-2">
                        X.509 Certificate <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <textarea
                          className="w-full px-3 py-2 admin-input font-mono text-xs"
                          rows={6}
                          placeholder="-----BEGIN CERTIFICATE-----&#10;MIIDXTCCAkWgAwIBAgIJALmVKuIIvoYnMA0GCSqGSIb3DQEBBQUAMEUxCzAJBgNV&#10;...&#10;-----END CERTIFICATE-----"
                          value={settings.saml_certificate}
                          onChange={(e) => handleInputChange('saml_certificate', e.target.value)}
                          style={{ display: showCertificate ? 'block' : 'none' }}
                        />
                        {!showCertificate && settings.saml_certificate && (
                          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 text-xs admin-text-light">
                            Certificate loaded ({settings.saml_certificate.length} characters)
                          </div>
                        )}
                        <button
                          type="button"
                          className="absolute top-2 right-2 p-1 text-xs admin-text-light hover:admin-text"
                          onClick={() => setShowCertificate(!showCertificate)}
                        >
                          {showCertificate ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-xs admin-text-light mt-1">
                        Copy the certificate from your Identity Provider
                      </p>
                    </div>

                    {/* Advanced Settings Toggle */}
                    <div className="border-t admin-border pt-4">
                      <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center space-x-2 text-sm font-medium admin-text hover:admin-text-light"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Advanced Settings</span>
                        {showAdvanced ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Advanced Settings */}
                    {showAdvanced && (
                      <div className="space-y-4 pl-6 border-l-2 admin-border">
                        {/* Private Key */}
                        <div>
                          <label className="block text-sm font-medium admin-text mb-2">
                            Private Key (Optional)
                          </label>
                          <div className="relative">
                            <textarea
                              className="w-full px-3 py-2 admin-input font-mono text-xs"
                              rows={4}
                              placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                              value={settings.saml_private_key}
                              onChange={(e) => handleInputChange('saml_private_key', e.target.value)}
                              style={{ display: showPrivateKey ? 'block' : 'none' }}
                            />
                            {!showPrivateKey && settings.saml_private_key && (
                              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 text-xs admin-text-light">
                                Private key loaded ({settings.saml_private_key.length} characters)
                              </div>
                            )}
                            <button
                              type="button"
                              className="absolute top-2 right-2 p-1 text-xs admin-text-light hover:admin-text"
                              onClick={() => setShowPrivateKey(!showPrivateKey)}
                            >
                              {showPrivateKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Security Options */}
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3">
                            <input
                              id="want_assertions_signed"
                              type="checkbox"
                              className="admin-checkbox"
                              checked={settings.saml_want_assertions_signed}
                              onChange={(e) => handleInputChange('saml_want_assertions_signed', e.target.checked)}
                            />
                            <label htmlFor="want_assertions_signed" className="text-sm font-medium admin-text">
                              Require signed SAML assertions
                            </label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <input
                              id="want_response_signed"
                              type="checkbox"
                              className="admin-checkbox"
                              checked={settings.saml_want_response_signed}
                              onChange={(e) => handleInputChange('saml_want_response_signed', e.target.checked)}
                            />
                            <label htmlFor="want_response_signed" className="text-sm font-medium admin-text">
                              Require signed SAML responses
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Field Mapping Section - Always visible when SAML enabled */}
            <div className="border-t admin-border pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 admin-text" />
                  <div>
                    <h4 className="text-sm font-medium admin-text">Attribute Mapping</h4>
                    <p className="text-xs admin-text-light">
                      Map SAML attributes to application fields
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
                        value={settings.saml_field_email}
                        onChange={(e) => handleInputChange('saml_field_email', e.target.value)}
                        placeholder="e.g., email, http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
                        className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium admin-text mb-1">
                        User ID Attribute *
                      </label>
                      <input
                        type="text"
                        value={settings.saml_field_user_id}
                        onChange={(e) => handleInputChange('saml_field_user_id', e.target.value)}
                        placeholder="e.g., nameID, login, user_id"
                        className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium admin-text mb-1">
                        First Name Attribute
                      </label>
                      <input
                        type="text"
                        value={settings.saml_field_first_name}
                        onChange={(e) => handleInputChange('saml_field_first_name', e.target.value)}
                        placeholder="e.g., firstName, first_name, givenName"
                        className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium admin-text mb-1">
                        Last Name Attribute
                      </label>
                      <input
                        type="text"
                        value={settings.saml_field_last_name}
                        onChange={(e) => handleInputChange('saml_field_last_name', e.target.value)}
                        placeholder="e.g., lastName, last_name, surname"
                        className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium admin-text mb-1">
                        Phone Attribute
                      </label>
                      <input
                        type="text"
                        value={settings.saml_field_phone}
                        onChange={(e) => handleInputChange('saml_field_phone', e.target.value)}
                        placeholder="e.g., phone, phoneNumber, mobile"
                        className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium admin-text mb-1">
                        Display Name Attribute
                      </label>
                      <input
                        type="text"
                        value={settings.saml_field_display_name}
                        onChange={(e) => handleInputChange('saml_field_display_name', e.target.value)}
                        placeholder="e.g., displayName, display_name, fullName"
                        className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-3 border-t admin-border">
                    <input
                      id="use_fallbacks_saml"
                      type="checkbox"
                      className="admin-checkbox"
                      checked={settings.saml_use_default_fallbacks}
                      onChange={(e) => handleInputChange('saml_use_default_fallbacks', e.target.checked)}
                    />
                    <label htmlFor="use_fallbacks_saml" className="text-xs admin-text">
                      Use default fallbacks for empty attributes (recommended)
                    </label>
                  </div>

                  {/* Attribute Test Section */}
                  <div className="border-t admin-border pt-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <UserCheck className="h-4 w-4 admin-text" />
                      <h5 className="text-xs font-medium admin-text">Test Attribute Mapping</h5>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium admin-text mb-1">
                          Test SAML Response (Optional - leave empty for mock test)
                        </label>
                        <textarea
                          value={testSamlResponse}
                          onChange={(e) => setTestSamlResponse(e.target.value)}
                          placeholder="Paste SAML response XML here for testing, or leave empty to use mock data"
                          className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono"
                          rows={4}
                        />
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={handleTestAttributeMapping}
                          disabled={isTestingFields}
                          className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isTestingFields ? (
                            <Loader className="h-3 w-3 animate-spin" />
                          ) : (
                            <Search className="h-3 w-3" />
                          )}
                          <span>{isTestingFields ? 'Testing...' : 'Test Mapping'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Attribute Test Results */}
                    {fieldTestResults && (
                      <div className={`mt-3 p-3 rounded-lg text-xs ${
                        fieldTestResults.found && !fieldTestResults.error
                          ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800'
                          : 'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800'
                      }`}>
                        {fieldTestResults.found && !fieldTestResults.error ? (
                          <div>
                            <p className="font-medium text-green-800 dark:text-green-200 mb-2">
                              ✅ Attribute mapping test successful!
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
                                  {Object.entries(fieldTestResults.allAttributes).map(([attr, value]) => (
                                    <p key={attr} className="text-green-600 dark:text-green-400">
                                      <span className="font-mono">{attr}:</span> {value}
                                    </p>
                                  ))}
                                </div>
                              </details>
                            )}
                          </div>
                        ) : (
                          <p className="text-red-800 dark:text-red-200">
                            ❌ {fieldTestResults.message || fieldTestResults.error || 'Attribute mapping test failed'}
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
                      {testResult.success ? 'Configuration Valid' : 'Configuration Invalid'}
                    </p>
                    <p className={`text-sm ${
                      testResult.success 
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-red-700 dark:text-red-300'
                    }`}>
                      {testResult.message}
                    </p>
                    {testResult.tests && testResult.tests.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {testResult.tests.map((test, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            {test.passed ? (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500" />
                            )}
                            <span className="text-xs">{test.test}: {test.message}</span>
                          </div>
                        ))}
                      </div>
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
          {settings.saml_enabled && (
            <button
              onClick={handleTestConnection}
              disabled={isTesting || !settings.saml_sso_url || !settings.saml_certificate}
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
                  Test Configuration
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