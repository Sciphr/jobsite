// app/applications-manager/settings/components/BambooHRIntegration.js
"use client";

import { useState, useEffect } from "react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { motion } from "framer-motion";
import {
  Users,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff,
  AlertCircle,
  Info,
  Clock,
  Zap,
} from "lucide-react";

export default function BambooHRIntegration() {
  const { getButtonClasses } = useThemeClasses();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [credentials, setCredentials] = useState({
    subdomain: "",
    apiKey: "",
  });

  const [connectionInfo, setConnectionInfo] = useState(null);
  const [autoSync, setAutoSync] = useState(false);
  const [isUpdatingAutoSync, setIsUpdatingAutoSync] = useState(false);

  useEffect(() => {
    loadBambooHRSettings();
  }, []);

  const loadBambooHRSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/integrations/bamboohr/status");
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.connected);
        setConnectionInfo(data.connectionInfo);
        setAutoSync(data.autoSync || false);
        if (data.connected) {
          setCredentials({
            subdomain: data.subdomain || "",
            apiKey: "••••••••••••••••", // Masked
          });
        }
      }
    } catch (error) {
      console.error("Error loading BambooHR settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!credentials.subdomain || !credentials.apiKey || credentials.apiKey === "••••••••••••••••") {
      setError("Please enter both your subdomain and API key");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/integrations/bamboohr/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        setIsConnected(true);
        setConnectionInfo(data.connectionInfo);
        setSuccess("Successfully connected to BambooHR!");
        setCredentials({
          subdomain: credentials.subdomain,
          apiKey: "••••••••••••••••",
        });
        // Trigger event to update navigation
        window.dispatchEvent(new Event('hrisIntegrationChanged'));
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(data.error || "Failed to connect to BambooHR");
      }
    } catch (error) {
      console.error("Error connecting to BambooHR:", error);
      setError("Failed to connect to BambooHR. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (
      !confirm(
        "Are you sure you want to disconnect from BambooHR? This will disable automatic syncing of hired candidates."
      )
    ) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/integrations/bamboohr/disconnect", {
        method: "POST",
      });

      if (response.ok) {
        setIsConnected(false);
        setConnectionInfo(null);
        setCredentials({ subdomain: "", apiKey: "" });
        setSuccess("Successfully disconnected from BambooHR");
        // Trigger event to update navigation
        window.dispatchEvent(new Event('hrisIntegrationChanged'));
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError("Failed to disconnect from BambooHR");
      }
    } catch (error) {
      console.error("Error disconnecting from BambooHR:", error);
      setError("Failed to disconnect from BambooHR");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/integrations/bamboohr/test");

      const data = await response.json();

      if (response.ok) {
        setTestResult({
          success: true,
          message: "Connection test successful!",
          details: data,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || "Connection test failed",
        });
      }
    } catch (error) {
      console.error("Error testing BambooHR connection:", error);
      setTestResult({
        success: false,
        message: "Failed to test connection",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSyncNow = async () => {
    setIsTesting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/integrations/bamboohr/sync", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Sync completed! ${data.syncedCount || 0} record(s) synced.`);
        // Reload connection info to get updated last sync time
        await loadBambooHRSettings();
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(data.error || "Failed to sync with BambooHR");
      }
    } catch (error) {
      console.error("Error syncing with BambooHR:", error);
      setError("Failed to sync with BambooHR");
    } finally {
      setIsTesting(false);
    }
  };

  const handleAutoSyncToggle = async (enabled) => {
    setIsUpdatingAutoSync(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/settings/bamboohr_auto_sync", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: enabled,
          isPersonal: false,
        }),
      });

      if (response.ok) {
        setAutoSync(enabled);
        setSuccess(
          enabled
            ? "Auto-sync enabled! Candidates will be automatically synced when marked as Hired."
            : "Auto-sync disabled. You'll need to manually sync candidates."
        );
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError("Failed to update auto-sync setting");
      }
    } catch (error) {
      console.error("Error updating auto-sync:", error);
      setError("Failed to update auto-sync setting");
    } finally {
      setIsUpdatingAutoSync(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="admin-card rounded-lg shadow-sm border admin-border p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold admin-text mb-2">
                BambooHR Integration
              </h3>
              <p className="admin-text-light text-sm mb-4 max-w-2xl">
                Connect your BambooHR account to automatically sync hired candidates
                to your HRIS system. BambooHR is a leading human resources information
                system that helps manage employee data, onboarding, and more.
              </p>
              <div className="flex items-center space-x-4">
                {isConnected ? (
                  <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-gray-500">
                    <XCircle className="h-5 w-5" />
                    <span className="font-medium">Not Connected</span>
                  </div>
                )}
                <a
                  href="https://www.bamboohr.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  <span>Learn more about BambooHR</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
        >
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-green-700 dark:text-green-300 font-medium">
              {success}
            </span>
          </div>
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <span className="text-red-700 dark:text-red-300 font-medium">
              {error}
            </span>
          </div>
        </motion.div>
      )}

      {/* Connection Status & Info */}
      {isConnected && connectionInfo && (
        <div className="admin-card rounded-lg shadow-sm border admin-border p-6">
          <h4 className="font-semibold admin-text mb-4">Connection Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm admin-text-light">Subdomain</label>
              <p className="font-medium admin-text">{credentials.subdomain}</p>
            </div>
            <div>
              <label className="text-sm admin-text-light">Status</label>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <p className="font-medium text-green-600 dark:text-green-400">
                  Active
                </p>
              </div>
            </div>
            {connectionInfo.lastSync && (
              <div>
                <label className="text-sm admin-text-light">Last Sync</label>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 admin-text-light" />
                  <p className="font-medium admin-text">
                    {new Date(connectionInfo.lastSync).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
            {connectionInfo.companyName && (
              <div>
                <label className="text-sm admin-text-light">Company</label>
                <p className="font-medium admin-text">{connectionInfo.companyName}</p>
              </div>
            )}
          </div>

          {/* Auto-Sync Toggle */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h5 className="font-semibold admin-text">Automatic Sync</h5>
                </div>
                <p className="text-sm admin-text-light">
                  Automatically sync candidates to BambooHR when they are marked as "Hired"
                </p>
              </div>
              <button
                onClick={() => handleAutoSyncToggle(!autoSync)}
                disabled={isUpdatingAutoSync}
                className={`ml-4 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  autoSync
                    ? "bg-blue-600"
                    : "bg-gray-200 dark:bg-gray-600"
                } ${isUpdatingAutoSync ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoSync ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            {autoSync && (
              <div className="mt-3 flex items-start space-x-2 text-sm text-blue-700 dark:text-blue-300">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  Enabled: Candidates will be automatically synced when marked as Hired
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${getButtonClasses("secondary")} ${isTesting ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span>{isTesting ? "Testing..." : "Test Connection"}</span>
            </button>

            <button
              onClick={handleSyncNow}
              disabled={isTesting}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${getButtonClasses("primary")} ${isTesting ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              <span>Sync Now</span>
            </button>

            <button
              onClick={handleDisconnect}
              disabled={isSaving}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              <span>Disconnect</span>
            </button>
          </div>

          {/* Test Result */}
          {testResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className={`mt-4 p-4 rounded-lg border ${
                testResult.success
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
              }`}
            >
              <div className="flex items-center space-x-2 mb-2">
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
                <span
                  className={`font-medium ${testResult.success ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}
                >
                  {testResult.message}
                </span>
              </div>
              {testResult.details && (
                <div className="text-sm admin-text-light mt-2">
                  {testResult.details.companyName && (
                    <p>Company: {testResult.details.companyName}</p>
                  )}
                  {testResult.details.employeeCount !== undefined && (
                    <p>Employees: {testResult.details.employeeCount}</p>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* Connection Form */}
      {!isConnected && (
        <div className="admin-card rounded-lg shadow-sm border admin-border p-6">
          <h4 className="font-semibold admin-text mb-4">Connect to BambooHR</h4>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-2">Before you begin:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>
                    Log in to your BambooHR account
                  </li>
                  <li>
                    Navigate to Settings → API Keys (Account → API Keys)
                  </li>
                  <li>Generate a new API key with appropriate permissions</li>
                  <li>
                    Copy your API key and company subdomain (e.g., if your URL is
                    <span className="font-mono mx-1">yourcompany.bamboohr.com</span>,
                    your subdomain is <span className="font-mono">yourcompany</span>)
                  </li>
                </ol>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Subdomain Input */}
            <div>
              <label className="block text-sm font-medium admin-text mb-2">
                Company Subdomain
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={credentials.subdomain}
                  onChange={(e) =>
                    setCredentials((prev) => ({
                      ...prev,
                      subdomain: e.target.value.toLowerCase().trim(),
                    }))
                  }
                  placeholder="yourcompany"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text bg-white dark:bg-gray-800"
                />
                <span className="admin-text-light text-sm">.bamboohr.com</span>
              </div>
              <p className="text-xs admin-text-light mt-1">
                Enter only the subdomain part, not the full URL
              </p>
            </div>

            {/* API Key Input */}
            <div>
              <label className="block text-sm font-medium admin-text mb-2">
                API Key
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={credentials.apiKey}
                  onChange={(e) =>
                    setCredentials((prev) => ({
                      ...prev,
                      apiKey: e.target.value.trim(),
                    }))
                  }
                  placeholder="Enter your BambooHR API Key"
                  className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text bg-white dark:bg-gray-800"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs admin-text-light mt-1">
                Your API key will be encrypted and stored securely
              </p>
            </div>

            {/* Connect Button */}
            <div className="flex items-center space-x-3 pt-4">
              <button
                onClick={handleConnect}
                disabled={isSaving || !credentials.subdomain || !credentials.apiKey}
                className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-colors ${
                  isSaving || !credentials.subdomain || !credentials.apiKey
                    ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    : getButtonClasses("primary")
                }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Connect to BambooHR</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Features Overview (when not connected) */}
      {!isConnected && (
        <div className="admin-card rounded-lg shadow-sm border admin-border p-6">
          <h4 className="font-semibold admin-text mb-4">
            What you can do with BambooHR
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: "Automatic Candidate Sync",
                description:
                  "Automatically sync hired candidates to BambooHR when you mark them as hired",
              },
              {
                title: "Employee Data Management",
                description: "Seamlessly transfer candidate data to employee records in BambooHR",
              },
              {
                title: "Onboarding Integration",
                description: "Trigger onboarding workflows in BambooHR for new hires",
              },
              {
                title: "Manual Sync Option",
                description: "Choose to manually sync candidates or enable automatic syncing",
              },
              {
                title: "Bidirectional Data Flow",
                description: "Keep candidate and employee data in sync between systems",
              },
              {
                title: "Audit Trail",
                description: "Track all sync activities and maintain a complete audit log",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
              >
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium admin-text text-sm">
                    {feature.title}
                  </p>
                  <p className="text-xs admin-text-light mt-1">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
