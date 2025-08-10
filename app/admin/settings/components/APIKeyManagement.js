"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Key,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Calendar,
  Activity,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock,
  Globe,
  Shield,
  Code,
  ArrowRight,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import APIKeyRevealModal from './APIKeyRevealModal';

export default function APIKeyManagement({ getButtonClasses }) {
  const { data: session } = useSession();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [newApiKeyData, setNewApiKeyData] = useState(null);
  const [showRevealModal, setShowRevealModal] = useState(false);
  const queryClient = useQueryClient();

  // Fetch API keys
  const { data: apiKeysData, isLoading, error } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const response = await fetch('/api/admin/api-keys');
      if (!response.ok) {
        throw new Error('Failed to fetch API keys');
      }
      return response.json();
    }
  });

  // Create API key mutation
  const createKeyMutation = useMutation({
    mutationFn: async (keyData) => {
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keyData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create API key');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['api-keys']);
      setShowCreateModal(false);
      setNewApiKeyData(data.apiKey);
      setShowRevealModal(true);
    }
  });

  // Revoke API key mutation
  const revokeKeyMutation = useMutation({
    mutationFn: async (keyId) => {
      const response = await fetch(`/api/admin/api-keys?keyId=${keyId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to revoke API key');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['api-keys']);
    }
  });

  const apiKeys = apiKeysData?.apiKeys || [];

  const handleCreateKey = (keyData) => {
    createKeyMutation.mutate(keyData);
  };

  const handleRevokeKey = (keyId) => {
    if (confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      revokeKeyMutation.mutate(keyId);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // You could add a toast notification here
      alert('Copied to clipboard!');
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <div>
            <h3 className="text-red-800 font-medium">Failed to load API keys</h3>
            <p className="text-red-600 text-sm mt-1">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-xl">
            <Key className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              API Access Management
            </h2>
            <p className="text-blue-700 dark:text-blue-300 text-sm mb-4">
              Generate and manage API keys for external integrations. Use these keys to connect your JobSite data with other systems like CRMs, HRIS platforms, or custom applications.
            </p>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400">
                <Shield className="h-4 w-4" />
                <span>Enterprise+ Feature</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400">
                <Globe className="h-4 w-4" />
                <span>RESTful API</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* API Keys List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold admin-text">Your API Keys</h3>
          <button
            onClick={() => setShowCreateModal(true)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${getButtonClasses("primary")}`}
          >
            <Plus className="h-4 w-4" />
            <span>Generate New Key</span>
          </button>
        </div>

        {apiKeys.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium admin-text mb-2">No API keys yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Create your first API key to start integrating with external systems
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className={`${getButtonClasses("primary")}`}
            >
              Generate Your First API Key
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((apiKey) => (
              <APIKeyCard
                key={apiKey.id}
                apiKey={apiKey}
                onRevoke={() => handleRevokeKey(apiKey.id)}
                onViewUsage={() => {
                  setSelectedKey(apiKey);
                  setShowUsageModal(true);
                }}
                onCopy={copyToClipboard}
                getButtonClasses={getButtonClasses}
              />
            ))}
          </div>
        )}
      </div>

      {/* API Documentation Link */}
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Code className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            <div>
              <h3 className="font-semibold admin-text">API Documentation</h3>
              <p className="text-sm admin-text-light">
                Complete API reference, code examples, and integration guides
              </p>
            </div>
          </div>
          <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
            <span>View Docs</span>
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <CreateAPIKeyModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateKey}
          isLoading={createKeyMutation.isLoading}
          error={createKeyMutation.error}
          getButtonClasses={getButtonClasses}
        />
      )}

      {/* Usage Modal */}
      {showUsageModal && selectedKey && (
        <UsageModal
          apiKey={selectedKey}
          onClose={() => {
            setShowUsageModal(false);
            setSelectedKey(null);
          }}
        />
      )}

      {/* API Key Reveal Modal */}
      {showRevealModal && newApiKeyData && (
        <APIKeyRevealModal
          apiKeyData={newApiKeyData}
          onClose={() => {
            setShowRevealModal(false);
            setNewApiKeyData(null);
          }}
          getButtonClasses={getButtonClasses}
        />
      )}
    </div>
  );
}

// API Key Card Component
function APIKeyCard({ apiKey, onRevoke, onViewUsage, onCopy, getButtonClasses }) {
  const [showKey, setShowKey] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium admin-text">{apiKey.name}</h4>
          <p className="text-sm admin-text-light">
            Created {formatDate(apiKey.created_at)}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {apiKey.is_active ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></div>
              Active
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
              <div className="w-1.5 h-1.5 bg-red-400 rounded-full mr-1"></div>
              Revoked
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {/* API Key Display */}
        <div className="flex items-center space-x-2">
          <div className="flex-1 bg-gray-50 dark:bg-gray-700 rounded border p-2 font-mono text-sm">
            {showKey ? apiKey.key_prefix : apiKey.key_prefix}
          </div>
          <button
            onClick={() => setShowKey(!showKey)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <button
            onClick={() => onCopy(apiKey.key_prefix)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm font-medium admin-text">
              {apiKey.total_requests || 0}
            </div>
            <div className="text-xs admin-text-light">Total Requests</div>
          </div>
          <div>
            <div className="text-sm font-medium admin-text">
              {apiKey.requests_this_month || 0}
            </div>
            <div className="text-xs admin-text-light">This Month</div>
          </div>
          <div>
            <div className="text-sm font-medium admin-text">
              {apiKey.rate_limit || 1000}/hr
            </div>
            <div className="text-xs admin-text-light">Rate Limit</div>
          </div>
        </div>

        {/* Permissions */}
        <div>
          <div className="text-sm font-medium admin-text mb-2">Permissions:</div>
          <div className="flex flex-wrap gap-1">
            {JSON.parse(apiKey.permissions || '[]').map((permission) => (
              <span
                key={permission}
                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
              >
                {permission}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
          <div className="text-xs admin-text-light">
            Last used: {formatDate(apiKey.last_used_at)}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onViewUsage}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View Usage
            </button>
            {apiKey.is_active && (
              <button
                onClick={onRevoke}
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                Revoke
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Create API Key Modal Component
function CreateAPIKeyModal({ onClose, onCreate, isLoading, error, getButtonClasses }) {
  const [formData, setFormData] = useState({
    name: '',
    permissions: [],
    rateLimit: 1000,
    expiresAt: ''
  });

  const availablePermissions = [
    { value: 'jobs:read', label: 'Jobs: Read', description: 'List and view job details' },
    { value: 'jobs:create', label: 'Jobs: Create', description: 'Create new job postings' },
    { value: 'jobs:update', label: 'Jobs: Update', description: 'Modify existing jobs' },
    { value: 'jobs:delete', label: 'Jobs: Delete', description: 'Remove job postings' },
    { value: 'applications:read', label: 'Applications: Read', description: 'List and view applications' },
    { value: 'applications:create', label: 'Applications: Create', description: 'Submit new applications' },
    { value: 'applications:update', label: 'Applications: Update', description: 'Update application status' }
  ];

  const handlePermissionChange = (permission, checked) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        permissions: [...prev.permissions, permission]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => p !== permission)
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.name && formData.permissions.length > 0) {
      onCreate(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold admin-text">Generate New API Key</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error.message}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium admin-text mb-2">
                Key Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., CRM Integration, Analytics Dashboard"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text bg-white dark:bg-gray-700"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium admin-text mb-2">
                Permissions * (Select at least one)
              </label>
              <div className="space-y-3 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                {availablePermissions.map((permission) => (
                  <label key={permission.value} className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.permissions.includes(permission.value)}
                      onChange={(e) => handlePermissionChange(permission.value, e.target.checked)}
                      className="mt-1 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium admin-text">{permission.label}</div>
                      <div className="text-xs admin-text-light">{permission.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium admin-text mb-2">
                Rate Limit (requests per hour)
              </label>
              <select
                value={formData.rateLimit}
                onChange={(e) => setFormData(prev => ({ ...prev, rateLimit: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text bg-white dark:bg-gray-700"
              >
                <option value={500}>500 requests/hour</option>
                <option value={1000}>1,000 requests/hour</option>
                <option value={2500}>2,500 requests/hour</option>
                <option value={5000}>5,000 requests/hour</option>
                <option value={10000}>10,000 requests/hour</option>
              </select>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-medium mb-1">Important Security Notes:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• The API key will only be shown once after creation</li>
                    <li>• Store it securely and never share it publicly</li>
                    <li>• You can revoke access at any time from this page</li>
                    <li>• All API requests are logged for security monitoring</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !formData.name || formData.permissions.length === 0}
                className={`flex items-center space-x-2 px-6 py-2 rounded-lg ${getButtonClasses("primary")} ${
                  isLoading || !formData.name || formData.permissions.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Generate API Key</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Usage Modal Component  
function UsageModal({ apiKey, onClose }) {
  // This would fetch usage data from the API
  // For now, showing placeholder data
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold admin-text">
              Usage Statistics: {apiKey.name}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {apiKey.total_requests || 0}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400">Total Requests</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {apiKey.requests_this_month || 0}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">This Month</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {apiKey.rate_limit || 1000}
                </div>
                <div className="text-sm text-purple-600 dark:text-purple-400">Rate Limit/hr</div>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  99.9%
                </div>
                <div className="text-sm text-orange-600 dark:text-orange-400">Uptime</div>
              </div>
            </div>

            {/* Usage would be implemented here with charts */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Detailed usage analytics coming soon
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}