"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useThemeClasses } from "../../contexts/AdminThemeContext";
import {
  Shield,
  AlertTriangle,
  Activity,
  TrendingUp,
  Globe,
  Users,
  Eye,
  RefreshCw,
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Filter,
  Search,
  Calendar,
  ExternalLink,
  Zap,
  Lock,
  Wifi,
  UserX,
} from "lucide-react";

// Security events fetcher
const fetchSecurityEvents = async (timeframe = "24h", limit = 100) => {
  const response = await fetch(
    `/api/admin/security/events?timeframe=${timeframe}&limit=${limit}`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch security events: ${response.status}`);
  }
  return response.json();
};

// Security stats fetcher
const fetchSecurityStats = async (timeframe = "24h") => {
  const response = await fetch(
    `/api/admin/security/stats?timeframe=${timeframe}`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch security stats: ${response.status}`);
  }
  return response.json();
};

// Security alerts fetcher
const fetchSecurityAlerts = async () => {
  const response = await fetch("/api/admin/security/alerts");
  if (!response.ok) {
    throw new Error(`Failed to fetch security alerts: ${response.status}`);
  }
  return response.json();
};

export default function SecurityPage() {
  const { getThemeClasses, getButtonClasses, getStatCardClasses } =
    useThemeClasses();
  const queryClient = useQueryClient();
  const [timeframe, setTimeframe] = useState("24h");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);

  // Queries
  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["security-stats", timeframe],
    queryFn: () => fetchSecurityStats(timeframe),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const {
    data: eventsData,
    isLoading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents,
  } = useQuery({
    queryKey: ["security-events", timeframe],
    queryFn: () => fetchSecurityEvents(timeframe, 50),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const {
    data: alertsData,
    isLoading: alertsLoading,
    error: alertsError,
    refetch: refetchAlerts,
  } = useQuery({
    queryKey: ["security-alerts"],
    queryFn: fetchSecurityAlerts,
    staleTime: 15 * 1000, // 15 seconds (alerts are urgent)
    gcTime: 2 * 60 * 1000, // 2 minutes
  });

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchStats();
      refetchEvents();
      refetchAlerts();
    }, 30000);

    return () => clearInterval(interval);
  }, [refetchStats, refetchEvents, refetchAlerts]);

  const handleRefreshAll = () => {
    refetchStats();
    refetchEvents();
    refetchAlerts();
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case "critical":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "high":
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case "medium":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "low":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSeverityBadge = (severity) => {
    const baseClasses =
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (severity) {
      case "critical":
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300`;
      case "high":
        return `${baseClasses} bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300`;
      case "medium":
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300`;
      case "low":
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300`;
    }
  };

  const getEventTypeIcon = (eventType) => {
    switch (eventType) {
      case "login_failure":
        return <UserX className="h-4 w-4" />;
      case "rate_limit_exceeded":
        return <Zap className="h-4 w-4" />;
      case "sql_injection_attempt":
      case "xss_attempt":
        return <Lock className="h-4 w-4" />;
      case "permission_denied":
        return <Shield className="h-4 w-4" />;
      case "suspicious_activity":
        return <Eye className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleString();
    } catch (error) {
      return "Invalid Date";
    }
  };

  const formatEventType = (eventType) => {
    return eventType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const resolveAlert = async (alertId) => {
    try {
      const response = await fetch(`/api/admin/security/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved: true }),
      });

      if (response.ok) {
        refetchAlerts();
      }
    } catch (error) {
      console.error("Failed to resolve alert:", error);
    }
  };

  const exportSecurityData = async () => {
    try {
      const response = await fetch(
        `/api/admin/security/export?timeframe=${timeframe}`
      );
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `security-report-${timeframe}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to export security data:", error);
    }
  };

  const stats = statsData?.data || {};
  const events = eventsData?.data || [];
  const alerts = alertsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Security Dashboard
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">
            Monitor threats, security events, and system protection status
          </p>
        </div>
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button
            onClick={exportSecurityData}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          <button
            onClick={handleRefreshAll}
            disabled={statsLoading || eventsLoading || alertsLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${
                statsLoading || eventsLoading || alertsLoading
                  ? "animate-spin"
                  : ""
              }`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Security Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`${getStatCardClasses()} p-6`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Total Events
                </dt>
                <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                  {statsLoading ? "..." : stats.totalEvents || 0}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className={`${getStatCardClasses()} p-6`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Active Alerts
                </dt>
                <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                  {alertsLoading ? "..." : alerts.filter(a => !a.resolved).length}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className={`${getStatCardClasses()} p-6`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <XCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Critical Events
                </dt>
                <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                  {statsLoading
                    ? "..."
                    : stats.eventsBySeverity?.critical || 0}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className={`${getStatCardClasses()} p-6`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Globe className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Unique IPs
                </dt>
                <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                  {statsLoading ? "..." : stats.topIPs?.length || 0}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.filter(a => !a.resolved).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              Active Security Alerts
            </h3>
          </div>
          <div className="p-6 space-y-4">
            {alerts
              .filter(alert => !alert.resolved)
              .slice(0, 5)
              .map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                >
                  <div className="flex items-center space-x-3">
                    {getSeverityIcon(alert.severity)}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatEventType(alert.alert_type)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {alert.ip_address} • {alert.event_count} events •{" "}
                        {formatDate(alert.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={getSeverityBadge(alert.severity)}>
                      {alert.severity}
                    </span>
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Event Types Breakdown */}
      {stats.eventsByType && stats.eventsByType.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Security Events by Type
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {stats.eventsByType.slice(0, 8).map((event, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getEventTypeIcon(event.type)}
                      <span className="text-sm text-gray-900 dark:text-white">
                        {formatEventType(event.type)}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {event.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top IPs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Top Source IPs
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {stats.topIPs && stats.topIPs.slice(0, 8).map((ip, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Wifi className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-mono text-gray-900 dark:text-white">
                        {ip.ip}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {ip.count} events
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Security Events */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Recent Security Events
          </h3>
        </div>
        <div className="overflow-x-auto">
          {eventsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : eventsError ? (
            <div className="flex items-center justify-center h-32 text-red-600 dark:text-red-400">
              <p>Failed to load security events</p>
            </div>
          ) : events.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <Shield className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No security events in the selected timeframe</p>
              </div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Event Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {events.slice(0, 20).map((event, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>{formatDate(event.created_at)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        {getEventTypeIcon(event.event_type)}
                        <span className="text-gray-900 dark:text-white">
                          {formatEventType(event.event_type)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={getSeverityBadge(event.severity)}>
                        {event.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                      {event.ip_address || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {event.users ? `${event.users.firstName} ${event.users.lastName}` : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {event.details && typeof event.details === 'string' 
                        ? JSON.parse(event.details).description || JSON.parse(event.details).reason || "No details"
                        : "No details"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}