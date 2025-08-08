"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { motion } from "framer-motion";
import {
  BarChart3,
  ArrowRight,
  AlertTriangle,
  Settings,
  ExternalLink,
  RefreshCcw as Refresh,
} from "lucide-react";

// Import tab components
import TabNavigation from "./components/TabNavigation";
import OverviewTab from "./components/OverviewTab";
import RealTimeTab from "./components/RealTimeTab";
import JobPerformanceTab from "./components/JobPerformanceTab";
import UserJourneyTab from "./components/UserJourneyTab";
import GeographyTab from "./components/GeographyTab";
import ContentTab from "./components/ContentTab";

export default function GoogleAnalyticsPage() {
  const router = useRouter();
  const { getButtonClasses, getStatCardClasses } = useThemeClasses();

  // State
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("30d");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3,
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24,
      },
    },
  };

  // Fetch analytics data
  const fetchAnalyticsData = async (showRefreshLoader = false) => {
    try {
      if (showRefreshLoader) setIsRefreshing(true);
      else setIsLoading(true);

      setError(null);

      const response = await fetch(
        `/api/admin/analytics/google?range=${timeRange}`
      );
      const data = await response.json();

      if (data.error) {
        setError(data.message || "Failed to fetch analytics data");
      } else {
        setAnalyticsData(data);
      }
    } catch (err) {
      setError("Failed to connect to Google Analytics");
      console.error("Analytics fetch error:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  // Format numbers with commas
  const formatNumber = (num) => {
    if (num === undefined || num === null) return "0";
    return new Intl.NumberFormat().format(num);
  };

  // Format percentage
  const formatPercentage = (num) => {
    if (num === undefined || num === null) return "0%";
    return `${Math.round(num * 100) / 100}%`;
  };

  // Format duration
  const formatDuration = (seconds) => {
    if (!seconds) return "0s";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return minutes > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${remainingSeconds}s`;
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchAnalyticsData(true);
  };

  // Time range options
  const timeRangeOptions = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "1y", label: "Last year" },
  ];

  if (isLoading && !analyticsData) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-32 bg-gray-200 dark:bg-gray-700 rounded"
              ></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show setup message if analytics is disabled
  if (analyticsData && !analyticsData.enabled) {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        <motion.div variants={itemVariants} className="text-center py-12">
          <div className="admin-card rounded-lg p-8 max-w-2xl mx-auto">
            <BarChart3 className="h-16 w-16 admin-text-light mx-auto mb-4" />
            <h3 className="text-xl font-semibold admin-text mb-2">
              Google Analytics Disabled
            </h3>
            <p className="admin-text-light mb-6">
              Google Analytics tracking is currently disabled. Enable it in
              settings to view your website analytics.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => router.push("/applications-manager/settings")}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg ${getButtonClasses("primary")}`}
              >
                <Settings className="h-4 w-4" />
                <span>Go to Settings</span>
              </button>
              <button
                onClick={() => router.push("/applications-manager")}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg ${getButtonClasses("secondary")}`}
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
                <span>Back to Overview</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Show configuration message if analytics is enabled but not configured
  if (analyticsData && analyticsData.enabled && !analyticsData.configured) {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        <motion.div variants={itemVariants} className="text-center py-12">
          <div className="admin-card rounded-lg p-8 max-w-4xl mx-auto">
            <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold admin-text mb-2">
              Google Analytics Configuration Required
            </h3>
            <p className="admin-text-light mb-6">
              Google Analytics is enabled but service account credentials are
              not configured. Follow these steps to complete the setup:
            </p>

            <div className="text-left bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6">
              <h4 className="font-semibold admin-text mb-4">
                Setup Instructions:
              </h4>
              <ol className="list-decimal list-inside space-y-2 admin-text-light text-sm">
                {analyticsData.setupInstructions &&
                  Object.entries(analyticsData.setupInstructions).map(
                    ([key, value]) => <li key={key}>{value}</li>
                  )}
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="https://console.cloud.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg ${getButtonClasses("primary")}`}
              >
                <ExternalLink className="h-4 w-4" />
                <span>Google Cloud Console</span>
              </a>
              <button
                onClick={() => router.push("/applications-manager")}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg ${getButtonClasses("secondary")}`}
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
                <span>Back to Overview</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Show error state with setup instructions
  if (error || (analyticsData && analyticsData.error)) {
    const errorData = analyticsData && analyticsData.error ? analyticsData : { message: error };
    
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        <motion.div variants={itemVariants} className="text-center py-12">
          <div className="admin-card rounded-lg p-8 max-w-4xl mx-auto">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold admin-text mb-2">
              Error Loading Analytics
            </h3>
            <p className="admin-text-light mb-6">{errorData.message}</p>
            
            {/* Show setup instructions if available */}
            {errorData.setupInstructions && (
              <div className="text-left bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6">
                <h4 className="font-semibold admin-text mb-4">Setup Instructions:</h4>
                <ol className="list-decimal list-inside space-y-2 admin-text-light text-sm">
                  {Object.entries(errorData.setupInstructions).map(([key, value]) => (
                    <li key={key} className={key === 'note' ? 'font-medium text-amber-600 dark:text-amber-400 mt-3 list-none' : ''}>
                      {key === 'note' ? `Note: ${value}` : value}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Show development details if available */}
            {errorData.details && process.env.NODE_ENV === 'development' && (
              <div className="text-left bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">Development Details:</h4>
                <pre className="text-xs text-red-600 dark:text-red-300 whitespace-pre-wrap font-mono">
                  {errorData.details}
                </pre>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg ${getButtonClasses("primary")}`}
              >
                <Refresh className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>Try Again</span>
              </button>
              <a
                href="https://analytics.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg ${getButtonClasses("secondary")}`}
              >
                <ExternalLink className="h-4 w-4" />
                <span>Google Analytics</span>
              </a>
              <button
                onClick={() => router.push("/applications-manager")}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700`}
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
                <span>Back to Overview</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        if (!analyticsData) {
          return (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="admin-text-light">Loading analytics data...</p>
              </div>
            </div>
          );
        }
        return <OverviewTab key="overview-tab" analyticsData={analyticsData} />;
      case "realtime":
        return <RealTimeTab key="realtime-tab" onRefreshRealTime={handleRefresh} />;
      case "jobs":
        return <JobPerformanceTab key="jobs-tab" analyticsData={analyticsData} />;
      case "journey":
        return <UserJourneyTab key="journey-tab" analyticsData={analyticsData} />;
      case "geography":
        return <GeographyTab key="geography-tab" analyticsData={analyticsData} />;
      case "content":
        return <ContentTab key="content-tab" analyticsData={analyticsData} />;
      default:
        return <OverviewTab analyticsData={analyticsData} />;
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-4 lg:space-y-6"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0"
      >
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold admin-text flex items-center space-x-2 md:space-x-3">
            <BarChart3 className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
            <span>Website Analytics</span>
          </h1>
          <p className="admin-text-light mt-2 text-sm md:text-base">
            Comprehensive Google Analytics insights for your job site
          </p>
        </div>

        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 admin-text admin-card text-sm"
          >
            {timeRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm ${getButtonClasses("secondary")}`}
          >
            <Refresh
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => router.push("/applications-manager")}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm ${getButtonClasses("primary")}`}
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            <span>Back to Overview</span>
          </button>
        </div>
      </motion.div>

      {/* Tabbed Interface */}
      <motion.div variants={itemVariants} className="admin-card rounded-lg shadow-sm">
        <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <div className="p-6">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderTabContent()}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
