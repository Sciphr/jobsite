// app/admin/settings/components/CalendarIntegration.js
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
} from "lucide-react";

export default function CalendarIntegration() {
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
    const calendarSuccess = urlParams.get('calendar_success');
    const calendarError = urlParams.get('calendar_error');
    
    if (calendarSuccess === 'connected') {
      setSuccess("Google Calendar connected successfully!");
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } else if (calendarError) {
      const errorMessages = {
        access_denied: "Access was denied. Please try again and allow calendar access.",
        invalid_request: "Invalid request. Please try connecting again.",
        user_not_found: "User session not found. Please try again.",
        connection_failed: "Failed to connect to Google Calendar. Please try again.",
      };
      setError(errorMessages[calendarError] || "An error occurred during connection.");
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  const fetchIntegrationStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/calendar/integration/status");
      if (response.ok) {
        const data = await response.json();
        setIntegrationData(data);
      } else {
        console.error("Failed to fetch integration status");
      }
    } catch (error) {
      console.error("Error fetching integration status:", error);
    } finally {
      setLoading(false);
    }
  };

  const connectGoogleCalendar = async () => {
    try {
      setConnecting(true);
      setError("");
      setSuccess("");

      // Get OAuth URL from our API
      const response = await fetch("/api/calendar/integration/auth-url", {
        method: "POST",
      });

      if (response.ok) {
        const { authUrl } = await response.json();
        // Redirect to Google OAuth
        window.location.href = authUrl;
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to initiate Google OAuth");
      }
    } catch (error) {
      console.error("Error connecting to Google Calendar:", error);
      setError("Failed to connect to Google Calendar. Please try again.");
    } finally {
      setConnecting(false);
    }
  };

  const disconnectGoogleCalendar = async () => {
    if (!confirm("Are you sure you want to disconnect your Google Calendar? This will disable interview scheduling features.")) {
      return;
    }

    try {
      setDisconnecting(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/calendar/integration/disconnect", {
        method: "POST",
      });

      if (response.ok) {
        setIntegrationData(null);
        setSuccess("Google Calendar disconnected successfully");
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to disconnect Google Calendar");
      }
    } catch (error) {
      console.error("Error disconnecting Google Calendar:", error);
      setError("Failed to disconnect Google Calendar. Please try again.");
    } finally {
      setDisconnecting(false);
    }
  };

  const testCalendarAccess = async () => {
    try {
      setError("");
      setSuccess("");

      const response = await fetch("/api/calendar/integration/test", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(`Calendar access test successful! Found ${data.calendarCount} calendars.`);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Calendar access test failed");
      }
    } catch (error) {
      console.error("Error testing calendar access:", error);
      setError("Failed to test calendar access. Please try again.");
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
              <Calendar className={`h-5 w-5 ${colorScheme.iconColor}`} />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${colorScheme.textColor}`}>
                Google Calendar Integration
              </h3>
              <p className={`text-sm ${colorScheme.textColorLight}`}>
                Connect your Google Calendar to enable interview scheduling features
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <div className="flex items-center space-x-2 text-green-700">
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
                  <span className="text-sm font-medium text-gray-900">Google Account</span>
                </div>
                <p className="text-sm text-gray-700">
                  {integrationData.googleEmail || "Connected Account"}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Primary Calendar</span>
                </div>
                <p className="text-sm text-gray-700">
                  {integrationData.calendarId || "primary"}
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
                  <span>Schedule interviews with automatic calendar blocking</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-blue-600" />
                  <span>Generate Google Meet links for video interviews</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-blue-600" />
                  <span>Check availability before proposing time slots</span>
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
                  onClick={testCalendarAccess}
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
                onClick={disconnectGoogleCalendar}
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
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Connect Your Google Calendar
              </h4>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Connect your Google Calendar to unlock powerful interview scheduling features. 
                You'll be able to check availability, create meetings, and manage interviews seamlessly.
              </p>
              
              <button
                onClick={connectGoogleCalendar}
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
                <span>{connecting ? "Connecting..." : "Connect Google Calendar"}</span>
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
                  <span>Automatic calendar blocking for scheduled interviews</span>
                </li>
                <li className="flex items-center space-x-2">
                  <LinkIcon className="h-4 w-4 text-gray-500" />
                  <span>Auto-generated Google Meet links for video calls</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>Real-time availability checking</span>
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
                    We only access your calendar to create and manage interview events. 
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