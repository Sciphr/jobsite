// app/applications-manager/settings/components/CertnIntegration.js
"use client";

import { useState, useEffect } from "react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { motion } from "framer-motion";
import {
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff,
  AlertCircle,
  Info,
  Check,
} from "lucide-react";

export default function CertnIntegration() {
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
    clientId: "",
    clientSecret: "",
    environment: "demo", // demo or production
  });

  const [accountInfo, setAccountInfo] = useState(null);
  const [showClientSecret, setShowClientSecret] = useState(false);

  useEffect(() => {
    loadCertnSettings();
  }, []);

  const loadCertnSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/integrations/certn/status");
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.connected);
        setAccountInfo(data.accountInfo);
        if (data.connected) {
          setCredentials({
            clientId: "••••••••••••••••", // Masked
            clientSecret: "••••••••••••••••", // Masked
            environment: data.environment || "demo",
          });
        }
      }
    } catch (error) {
      console.error("Error loading CERTN settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!credentials.clientId || credentials.clientId === "••••••••••••••••" ||
        !credentials.clientSecret || credentials.clientSecret === "••••••••••••••••") {
      setError("Please enter valid Client ID and Client Secret");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/integrations/certn/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        setIsConnected(true);
        setAccountInfo(data.accountInfo);
        setSuccess("Successfully connected to CERTN!");
        setCredentials({
          clientId: "••••••••••••••••",
          clientSecret: "••••••••••••••••",
          environment: credentials.environment,
        });
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(data.error || "Failed to connect to CERTN");
      }
    } catch (error) {
      console.error("Error connecting to CERTN:", error);
      setError("Failed to connect to CERTN. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (
      !confirm(
        "Are you sure you want to disconnect from CERTN? You won't be able to run background checks until you reconnect."
      )
    ) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/admin/integrations/certn/disconnect",
        {
          method: "POST",
        }
      );

      if (response.ok) {
        setIsConnected(false);
        setAccountInfo(null);
        setCredentials({ clientId: "", clientSecret: "", environment: "demo" });
        setSuccess("Successfully disconnected from CERTN");
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError("Failed to disconnect from CERTN");
      }
    } catch (error) {
      console.error("Error disconnecting from CERTN:", error);
      setError("Failed to disconnect from CERTN");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/integrations/certn/test");

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
      console.error("Error testing CERTN connection:", error);
      setTestResult({
        success: false,
        message: "Failed to test connection",
      });
    } finally {
      setIsTesting(false);
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
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold admin-text mb-2">
                CERTN Integration
              </h3>
              <p className="admin-text-light text-sm mb-4 max-w-2xl">
                Connect your CERTN account to run comprehensive background checks
                on candidates directly from the application workflow. CERTN is a leading
                Canadian background check service providing employment verification, criminal
                records, and more.
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
                  href="https://certn.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  <span>Learn more about CERTN</span>
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

      {/* Connection Status & Account Info */}
      {isConnected && accountInfo && (
        <div className="admin-card rounded-lg shadow-sm border admin-border p-6">
          <h4 className="font-semibold admin-text mb-4">Account Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm admin-text-light">Environment</label>
              <p className="font-medium admin-text capitalize">
                {credentials.environment}
              </p>
            </div>
            {accountInfo.name && (
              <div>
                <label className="text-sm admin-text-light">Account Name</label>
                <p className="font-medium admin-text">{accountInfo.name}</p>
              </div>
            )}
            {accountInfo.email && (
              <div>
                <label className="text-sm admin-text-light">Email</label>
                <p className="font-medium admin-text">{accountInfo.email}</p>
              </div>
            )}
            <div>
              <label className="text-sm admin-text-light">Status</label>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <p className="font-medium text-green-600 dark:text-green-400">
                  Active
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 mt-6">
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
                  <p>API Version: {testResult.details.version || "N/A"}</p>
                  {testResult.details.accountName && (
                    <p>Account: {testResult.details.accountName}</p>
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
          <h4 className="font-semibold admin-text mb-4">Connect to CERTN</h4>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-2">Before you begin:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>
                    Sign up for a CERTN account at{" "}
                    <a
                      href="https://certn.co/get-started"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:no-underline"
                    >
                      certn.co/get-started
                    </a>
                  </li>
                  <li>
                    Navigate to Settings → API Credentials in your CERTN dashboard
                  </li>
                  <li>Generate your Client ID and Client Secret</li>
                  <li>
                    Start with the Demo environment for testing, then
                    switch to Production when ready
                  </li>
                </ol>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Environment Selection */}
            <div>
              <label className="block text-sm font-medium admin-text mb-2">
                Environment
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() =>
                    setCredentials((prev) => ({
                      ...prev,
                      environment: "demo",
                    }))
                  }
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    credentials.environment === "demo"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <div
                      className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                        credentials.environment === "demo"
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {credentials.environment === "demo" && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <span className="font-medium admin-text">Demo</span>
                  </div>
                  <p className="text-xs admin-text-light">
                    Testing environment (recommended to start)
                  </p>
                </button>

                <button
                  onClick={() =>
                    setCredentials((prev) => ({
                      ...prev,
                      environment: "production",
                    }))
                  }
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    credentials.environment === "production"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <div
                      className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                        credentials.environment === "production"
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {credentials.environment === "production" && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <span className="font-medium admin-text">Production</span>
                  </div>
                  <p className="text-xs admin-text-light">
                    Live environment (charges apply)
                  </p>
                </button>
              </div>
            </div>

            {/* Client ID Input */}
            <div>
              <label className="block text-sm font-medium admin-text mb-2">
                Client ID
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                value={credentials.clientId}
                onChange={(e) =>
                  setCredentials((prev) => ({
                    ...prev,
                    clientId: e.target.value,
                  }))
                }
                placeholder="Enter your CERTN Client ID"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text bg-white dark:bg-gray-800"
              />
            </div>

            {/* Client Secret Input */}
            <div>
              <label className="block text-sm font-medium admin-text mb-2">
                Client Secret
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <input
                  type={showClientSecret ? "text" : "password"}
                  value={credentials.clientSecret}
                  onChange={(e) =>
                    setCredentials((prev) => ({
                      ...prev,
                      clientSecret: e.target.value,
                    }))
                  }
                  placeholder="Enter your CERTN Client Secret"
                  className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text bg-white dark:bg-gray-800"
                />
                <button
                  type="button"
                  onClick={() => setShowClientSecret(!showClientSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showClientSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs admin-text-light mt-1">
                Your credentials will be encrypted and stored securely
              </p>
            </div>

            {/* Connect Button */}
            <div className="flex items-center space-x-3 pt-4">
              <button
                onClick={handleConnect}
                disabled={isSaving || !credentials.clientId || !credentials.clientSecret}
                className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-colors ${
                  isSaving || !credentials.clientId || !credentials.clientSecret
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
                    <span>Connect to CERTN</span>
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
            What you can do with CERTN
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: "Criminal Records Search",
                description:
                  "Canadian criminal record checks including RCMP and local databases",
              },
              {
                title: "Employment Verification",
                description: "Verify past employment history and job titles in Canada",
              },
              {
                title: "Education Verification",
                description: "Confirm degrees and certifications from Canadian institutions",
              },
              {
                title: "Identity Verification",
                description: "Comprehensive identity verification for Canadian residents",
              },
              {
                title: "Credit Checks",
                description:
                  "Credit history reports for financial positions (where applicable)",
              },
              {
                title: "Reference Checks",
                description: "Automated reference checking and verification",
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
