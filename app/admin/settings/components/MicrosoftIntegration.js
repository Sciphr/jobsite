// app/admin/settings/components/MicrosoftIntegration.js
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import {
  Calendar,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Settings,
  Clock,
  Globe,
  Mail,
  Trash2,
  Link as LinkIcon,
  Users,
  Video,
} from "lucide-react";

export default function MicrosoftIntegration() {
  const { data: session } = useSession();
  const { getButtonClasses } = useThemeClasses();
  const [integrationData, setIntegrationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchIntegrationStatus();
    
    // Check for OAuth callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    const microsoftSuccess = urlParams.get('microsoft_success');
    const microsoftError = urlParams.get('microsoft_error');
    
    if (microsoftSuccess === 'connected') {
      setSuccess("Microsoft Calendar & Teams connected successfully!");
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } else if (microsoftError) {
      const errorMessages = {
        access_denied: "Access was denied. Please try again and allow calendar and Teams access.",
        invalid_request: "Invalid request. Please try connecting again.",
        user_not_found: "User session not found. Please try again.",
        connection_failed: "Failed to connect to Microsoft. Please try again.",
      };
      setError(errorMessages[microsoftError] || "An error occurred during connection.");
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  const fetchIntegrationStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/microsoft/integration/status");
      if (response.ok) {
        const data = await response.json();
        setIntegrationData(data);
      } else {
        console.error("Failed to fetch Microsoft integration status");
      }
    } catch (error) {
      console.error("Error fetching Microsoft integration status:", error);
    } finally {
      setLoading(false);
    }
  };

  const connectMicrosoft = async () => {
    try {
      setConnecting(true);
      setError("");
      setSuccess("");

      // Get OAuth URL from our API
      const response = await fetch("/api/microsoft/integration/auth-url", {
        method: "POST",
      });

      if (response.ok) {
        const { authUrl } = await response.json();
        // Redirect to Microsoft OAuth
        window.location.href = authUrl;
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to initiate Microsoft OAuth");
      }
    } catch (error) {
      console.error("Error connecting to Microsoft:", error);
      setError("Failed to connect to Microsoft. Please try again.");
    } finally {
      setConnecting(false);
    }
  };

  const disconnectMicrosoft = async () => {
    if (!confirm("Are you sure you want to disconnect your Microsoft account? This will disable calendar sync and Teams meeting features.")) {
      return;
    }

    try {
      setDisconnecting(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/microsoft/integration/disconnect", {
        method: "POST",
      });

      if (response.ok) {
        setIntegrationData(null);
        setSuccess("Microsoft integration disconnected successfully");
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to disconnect Microsoft integration");
      }
    } catch (error) {
      console.error("Error disconnecting Microsoft integration:", error);
      setError("Failed to disconnect Microsoft integration. Please try again.");
    } finally {
      setDisconnecting(false);
    }
  };

  const testMicrosoftAccess = async () => {
    try {
      setError("");
      setSuccess("");

      const response = await fetch("/api/microsoft/integration/test", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(`Microsoft access test successful! Found ${data.calendarCount} calendars and Teams access verified.`);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Microsoft access test failed");
      }
    } catch (error) {
      console.error("Error testing Microsoft access:", error);
      setError("Failed to test Microsoft access. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="border rounded-lg p-6">
        <div className="animate-pulse">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
            <div className="h-6 bg-gray-200 rounded w-48"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  const isConnected = integrationData?.connected;

  // Dynamic color scheme based on connection status
  const colorScheme = isConnected ? {
    border: "border-green-200",
    bg: "bg-green-50",
    borderB: "border-green-200",
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    textColor: "text-green-900",
    textColorLight: "text-green-700"
  } : {
    border: "border-blue-200", 
    bg: "bg-blue-50",
    borderB: "border-blue-200",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    textColor: "text-blue-900",
    textColorLight: "text-blue-700"
  };

  return (
    <div className={`border ${colorScheme.border} rounded-lg overflow-hidden`}>
      {/* Header */}
      <div className={`${colorScheme.bg} px-6 py-4 border-b ${colorScheme.borderB}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 ${colorScheme.iconBg} rounded-lg`}>
              <Users className={`h-5 w-5 ${colorScheme.iconColor}`} />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${colorScheme.textColor}`}>
                Microsoft Integration
              </h3>
              <p className={`text-sm ${colorScheme.textColorLight}`}>
                Connect Microsoft Calendar and Teams for interview scheduling
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <div className={`flex items-center space-x-2 ${colorScheme.textColorLight}`}>
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Connected</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-gray-600">
                <X className="h-5 w-5" />
                <span className="text-sm font-medium">Disconnected</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-700 font-medium">Error</span>
            </div>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-700 font-medium">Success</span>
            </div>
            <p className="text-green-600 text-sm mt-1">{success}</p>
          </div>
        )}

        {isConnected ? (
          <div className="space-y-6">
            {/* Connection Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Mail className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Microsoft Account</span>
                </div>
                <p className="text-sm text-gray-700">
                  {integrationData.microsoftEmail || "Connected Account"}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Tenant</span>
                </div>
                <p className="text-sm text-gray-700">
                  {integrationData.tenantId || "Organization Tenant"}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Connected Since</span>
                </div>
                <p className="text-sm text-gray-700">
                  {integrationData.connectedAt 
                    ? new Date(integrationData.connectedAt).toLocaleDateString()
                    : "Unknown"
                  }
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Globe className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Timezone</span>
                </div>
                <p className="text-sm text-gray-700">
                  {integrationData.timezone || "America/Toronto"}
                </p>
              </div>
            </div>

            {/* Features Enabled */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-3">
                Features Enabled
              </h4>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-blue-600" />
                  <span>Schedule interviews with Outlook Calendar integration</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-blue-600" />
                  <span>Generate Microsoft Teams links for video interviews</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-blue-600" />
                  <span>Check availability across Microsoft 365</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-blue-600" />
                  <span>Automatic calendar invites for confirmed interviews</span>
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-3">
                <button
                  onClick={testMicrosoftAccess}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${getButtonClasses("secondary")}`}
                >
                  <Settings className="h-4 w-4" />
                  <span>Test Connection</span>
                </button>
                <button
                  onClick={fetchIntegrationStatus}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh</span>
                </button>
              </div>
              <button
                onClick={disconnectMicrosoft}
                disabled={disconnecting}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  disconnecting 
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                {disconnecting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span>{disconnecting ? "Disconnecting..." : "Disconnect"}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Setup Instructions */}
            <div className="text-center py-8">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Connect Your Microsoft Account
              </h4>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Connect your Microsoft 365 account to enable Outlook Calendar integration and 
                Teams meeting creation for seamless interview scheduling.
              </p>
              
              <button
                onClick={connectMicrosoft}
                disabled={connecting}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg mx-auto transition-colors ${
                  connecting 
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                    : getButtonClasses("primary")
                }`}
              >
                {connecting ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <LinkIcon className="h-5 w-5" />
                )}
                <span>{connecting ? "Connecting..." : "Connect Microsoft"}</span>
                {!connecting && <ExternalLink className="h-4 w-4" />}
              </button>
            </div>

            {/* Features Preview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                What you'll get:
              </h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>Automatic Outlook Calendar blocking for scheduled interviews</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Video className="h-4 w-4 text-gray-500" />
                  <span>Auto-generated Microsoft Teams links for video calls</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>Real-time availability checking across Microsoft 365</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>Automatic calendar invites for participants</span>
                </li>
              </ul>
            </div>

            {/* Privacy Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-1">
                    Privacy & Security
                  </h4>
                  <p className="text-sm text-blue-800">
                    We only access your calendar and Teams to create and manage interview events. 
                    Your personal calendar data remains private and is not stored on our servers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}