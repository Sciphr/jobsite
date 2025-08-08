"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { motion } from "framer-motion";
import {
  BarChart3,
  Users,
  Eye,
  Clock,
  Globe,
  ArrowRight,
  TrendingUp,
  MousePointer,
  Calendar,
  Zap,
  AlertTriangle,
  Settings,
  ExternalLink,
  RefreshCcw as Refresh,
} from "lucide-react";

export default function GoogleAnalyticsPage() {
  const router = useRouter();
  const { getButtonClasses, getStatCardClasses } = useThemeClasses();

  // State
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("30d");
  const [isRefreshing, setIsRefreshing] = useState(false);

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
            Google Analytics insights for your job site
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

      {/* Key Metrics Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6"
      >
        {[
          {
            title: "Active Users",
            value: formatNumber(analyticsData?.overview?.activeUsers),
            icon: Users,
            color: "bg-blue-500",
            bgColor: "bg-blue-50 dark:bg-blue-900/20",
            textColor: "text-blue-600 dark:text-blue-400",
          },
          {
            title: "Sessions",
            value: formatNumber(analyticsData?.overview?.sessions),
            icon: Eye,
            color: "bg-green-500",
            bgColor: "bg-green-50 dark:bg-green-900/20",
            textColor: "text-green-600 dark:text-green-400",
          },
          {
            title: "Page Views",
            value: formatNumber(analyticsData?.overview?.pageViews),
            icon: MousePointer,
            color: "bg-purple-500",
            bgColor: "bg-purple-50 dark:bg-purple-900/20",
            textColor: "text-purple-600 dark:text-purple-400",
          },
          {
            title: "Avg. Session Duration",
            value: formatDuration(
              analyticsData?.overview?.averageSessionDuration
            ),
            icon: Clock,
            color: "bg-orange-500",
            bgColor: "bg-orange-50 dark:bg-orange-900/20",
            textColor: "text-orange-600 dark:text-orange-400",
          },
        ].map((metric, index) => (
          <motion.div
            key={metric.title}
            whileHover={{ scale: 1.02, y: -2 }}
            className={`admin-card rounded-lg p-4 lg:p-6 shadow-sm ${getStatCardClasses(index).hover}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm admin-text-light font-medium">
                  {metric.title}
                </p>
                <p className="text-xl lg:text-2xl font-bold admin-text mt-1">
                  {metric.value}
                </p>
              </div>
              <div className={`p-3 rounded-full ${metric.bgColor}`}>
                <metric.icon
                  className={`h-5 w-5 lg:h-6 lg:w-6 ${metric.textColor}`}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Additional Metrics */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6"
      >
        <div className="admin-card rounded-lg p-4 lg:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold admin-text">Bounce Rate</h3>
            <TrendingUp className="h-5 w-5 admin-text-light" />
          </div>
          <div className="text-2xl font-bold admin-text">
            {formatPercentage(analyticsData?.overview?.bounceRate)}
          </div>
          <p className="text-sm admin-text-light mt-1">
            Percentage of single-page sessions
          </p>
        </div>

        <div className="admin-card rounded-lg p-4 lg:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold admin-text">Job Page Views</h3>
            <Calendar className="h-5 w-5 admin-text-light" />
          </div>
          <div className="text-2xl font-bold admin-text">
            {formatNumber(analyticsData?.overview?.totalJobPageViews)}
          </div>
          <p className="text-sm admin-text-light mt-1">
            {analyticsData?.insights?.jobPagesPercentage}% of total page views
          </p>
        </div>

        <div className="admin-card rounded-lg p-4 lg:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold admin-text">
              Top Traffic Source
            </h3>
            <Globe className="h-5 w-5 admin-text-light" />
          </div>
          <div className="text-xl font-bold admin-text">
            {analyticsData?.insights?.topTrafficSource}
          </div>
          <p className="text-sm admin-text-light mt-1">
            Primary source of website traffic
          </p>
        </div>
      </motion.div>

      {/* Traffic Sources */}
      {analyticsData?.trafficSources &&
        analyticsData.trafficSources.length > 0 && (
          <motion.div
            variants={itemVariants}
            className="admin-card rounded-lg shadow-sm"
          >
            <div className="p-4 lg:p-6 border-b admin-border">
              <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
                <Zap className="h-5 w-5 text-blue-600" />
                <span>Traffic Sources</span>
              </h3>
            </div>
            <div className="p-4 lg:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {analyticsData.trafficSources
                  .slice(0, 6)
                  .map((source, index) => (
                    <div
                      key={source.source}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: source.color }}
                        ></div>
                        <div>
                          <p className="font-medium admin-text text-sm">
                            {source.source}
                          </p>
                          <p className="text-xs admin-text-light">
                            {formatNumber(source.sessions)} sessions
                          </p>
                        </div>
                      </div>
                      <div className="text-sm font-semibold admin-text">
                        {formatPercentage(source.percentage)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </motion.div>
        )}

      {/* Top Pages */}
      {analyticsData?.topPages && analyticsData.topPages.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="admin-card rounded-lg shadow-sm"
        >
          <div className="p-4 lg:p-6 border-b admin-border">
            <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
              <Eye className="h-5 w-5 text-green-600" />
              <span>Most Viewed Pages</span>
            </h3>
          </div>
          <div className="p-4 lg:p-6">
            <div className="space-y-3">
              {analyticsData.topPages.slice(0, 5).map((page, index) => (
                <div
                  key={page.path}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex-1">
                    <p className="font-medium admin-text text-sm truncate">
                      {page.path}
                    </p>
                    <p className="text-xs admin-text-light">
                      {formatNumber(page.pageViews)} views •{" "}
                      {formatPercentage(page.bounceRate)} bounce rate
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="font-semibold admin-text">
                      {formatNumber(page.pageViews)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
