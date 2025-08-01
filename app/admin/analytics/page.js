"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { useAnimationSettings } from "@/app/hooks/useAnimationSettings";
import { useAnalytics, usePrefetchAdminData } from "@/app/hooks/useAdminData";
import { ResourcePermissionGuard } from "@/app/components/guards/PagePermissionGuard";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Briefcase,
  FileText,
  Eye,
  Calendar,
  DollarSign,
  Target,
  Award,
  Activity,
  Download,
  Filter,
  RefreshCw,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { exportAnalyticsToExcel, exportAnalyticsToCSV } from "@/app/utils/analyticsExport";

function AdminAnalyticsContent() {
  const { data: session } = useSession();
  const { getStatCardClasses, getButtonClasses } = useThemeClasses();
  const [timeRange, setTimeRange] = useState("30d");
  const [selectedMetric, setSelectedMetric] = useState("applications");
  const { prefetchAll } = usePrefetchAdminData();
  const {
    data: analytics,
    isLoading,
    isError,
    error,
    refetch,
  } = useAnalytics(timeRange);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const timeRangeOptions = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "1y", label: "Last year" },
  ];

  const getChangeIcon = (change) => {
    if (change > 0) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getChangeColor = (change) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-gray-500";
  };

  // ✅ NEW: Export functionality
  const handleExport = (format) => {
    if (!analytics) return;

    if (format === 'excel') {
      exportAnalyticsToExcel(analytics, timeRange);
    } else if (format === 'csv') {
      exportAnalyticsToCSV(analytics, timeRange);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="admin-card p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium admin-text mb-2">
            Failed to load analytics
          </h3>
          <p className="admin-text-light mb-6">
            There was an error loading the analytics data.
          </p>
          <button
            onClick={handleRefresh}
            className={`${getButtonClasses("primary")} px-4 py-2 rounded-lg`}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold admin-text">Analytics Dashboard</h1>
          <p className="admin-text-light mt-2 text-sm sm:text-base">
            Track performance metrics and insights across your job board
          </p>
        </div>
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text bg-white dark:bg-gray-700"
          >
            {timeRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="flex space-x-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50 admin-text bg-white dark:bg-gray-800"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">{refreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
            {/* ✅ NEW: Export Dropdown */}
            <div className="relative group">
              <button
                className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${getButtonClasses("primary")}`}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              {/* Invisible bridge to prevent dropdown from disappearing */}
              <div className="absolute right-0 top-10 w-48 h-4 invisible group-hover:visible z-10"></div>
              <div className="absolute right-0 top-12 w-48 admin-card rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 border">
                <div className="p-2">
                  <button
                    onClick={() => handleExport('excel')}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-left text-sm admin-text hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                  >
                    <span className="text-green-600">📊</span>
                    <span>Export to Excel (.xlsx)</span>
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-left text-sm admin-text hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                  >
                    <span className="text-blue-600">📄</span>
                    <span>Export to CSV</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="metric-card admin-card p-4 sm:p-6 rounded-lg shadow cursor-pointer transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium admin-text-light">Total Jobs</p>
              <p className="text-2xl sm:text-3xl font-bold admin-text">
                {analytics.overview.totalJobs}
              </p>
              <div className="flex items-center mt-2">
                {getChangeIcon(analytics.overview.jobsChange)}
                <span
                  className={`text-xs sm:text-sm ml-1 ${getChangeColor(
                    analytics.overview.jobsChange
                  )}`}
                >
                  {Math.abs(analytics.overview.jobsChange).toFixed(2)}%
                </span>
                <span className="text-xs sm:text-sm admin-text-light ml-1 hidden sm:inline">
                  vs last period
                </span>
              </div>
            </div>
            <div
              className={`metric-icon p-2 sm:p-3 rounded-lg ${getStatCardClasses(0).bg}`}
            >
              <Briefcase className={`h-5 w-5 sm:h-6 sm:w-6 ${getStatCardClasses(0).icon}`} />
            </div>
          </div>
        </div>

        <div className="metric-card admin-card p-4 sm:p-6 rounded-lg shadow cursor-pointer transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium admin-text-light">
                Applications
              </p>
              <p className="text-2xl sm:text-3xl font-bold admin-text">
                {analytics.overview.totalApplications}
              </p>
              <div className="flex items-center mt-2">
                {getChangeIcon(analytics.overview.applicationsChange)}
                <span
                  className={`text-xs sm:text-sm ml-1 ${getChangeColor(
                    analytics.overview.applicationsChange
                  )}`}
                >
                  {Math.abs(analytics.overview.applicationsChange).toFixed(2)}%
                </span>
                <span className="text-xs sm:text-sm admin-text-light ml-1 hidden sm:inline">
                  vs last period
                </span>
              </div>
            </div>
            <div
              className={`metric-icon p-2 sm:p-3 rounded-lg ${getStatCardClasses(1).bg}`}
            >
              <FileText className={`h-5 w-5 sm:h-6 sm:w-6 ${getStatCardClasses(1).icon}`} />
            </div>
          </div>
        </div>

        <div className="metric-card admin-card p-4 sm:p-6 rounded-lg shadow cursor-pointer transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium admin-text-light">
                Total Users
              </p>
              <p className="text-2xl sm:text-3xl font-bold admin-text">
                {analytics.overview.totalUsers}
              </p>
              <div className="flex items-center mt-2">
                {getChangeIcon(analytics.overview.usersChange)}
                <span
                  className={`text-xs sm:text-sm ml-1 ${getChangeColor(
                    analytics.overview.usersChange
                  )}`}
                >
                  {Math.abs(analytics.overview.usersChange).toFixed(2)}%
                </span>
                <span className="text-xs sm:text-sm admin-text-light ml-1 hidden sm:inline">
                  vs last period
                </span>
              </div>
            </div>
            <div
              className={`metric-icon p-2 sm:p-3 rounded-lg ${getStatCardClasses(2).bg}`}
            >
              <Users className={`h-5 w-5 sm:h-6 sm:w-6 ${getStatCardClasses(2).icon}`} />
            </div>
          </div>
        </div>

        <div className="metric-card admin-card p-4 sm:p-6 rounded-lg shadow cursor-pointer transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium admin-text-light">Job Views</p>
              <p className="text-2xl sm:text-3xl font-bold admin-text">
                {analytics.overview.totalViews.toLocaleString()}
              </p>
              <div className="flex items-center mt-2">
                {getChangeIcon(analytics.overview.viewsChange)}
                <span
                  className={`text-xs sm:text-sm ml-1 ${getChangeColor(
                    analytics.overview.viewsChange
                  )}`}
                >
                  {Math.abs(analytics.overview.viewsChange).toFixed(2)}%
                </span>
                <span className="text-xs sm:text-sm admin-text-light ml-1 hidden sm:inline">
                  vs last period
                </span>
              </div>
            </div>
            <div
              className={`metric-icon p-2 sm:p-3 rounded-lg ${getStatCardClasses(3).bg}`}
            >
              <Eye className={`h-5 w-5 sm:h-6 sm:w-6 ${getStatCardClasses(3).icon}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Additional Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="metric-card admin-card p-4 sm:p-6 rounded-lg shadow cursor-pointer transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium admin-text-light">Emails Sent</p>
              <p className="text-2xl sm:text-3xl font-bold admin-text">
                {analytics.overview.totalEmails?.toLocaleString() || 0}
              </p>
              <div className="flex items-center mt-2">
                <span className="text-xs sm:text-sm admin-text-light">Email communications</span>
              </div>
            </div>
            <div className="metric-icon p-2 sm:p-3 rounded-lg bg-blue-100">
              <span className="text-2xl">📧</span>
            </div>
          </div>
        </div>

        <div className="metric-card admin-card p-4 sm:p-6 rounded-lg shadow cursor-pointer transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium admin-text-light">Interviews Scheduled</p>
              <p className="text-2xl sm:text-3xl font-bold admin-text">
                {analytics.overview.totalInterviews || 0}
              </p>
              <div className="flex items-center mt-2">
                <span className="text-xs sm:text-sm text-blue-600">
                  {analytics.additionalMetrics.interviewRate.toFixed(2)}% of applications
                </span>
              </div>
            </div>
            <div className="metric-icon p-2 sm:p-3 rounded-lg bg-purple-100">
              <span className="text-2xl">🗣️</span>
            </div>
          </div>
        </div>

        <div className="metric-card admin-card p-4 sm:p-6 rounded-lg shadow cursor-pointer transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium admin-text-light">Jobs Saved</p>
              <p className="text-2xl sm:text-3xl font-bold admin-text">
                {analytics.overview.totalSavedJobs || 0}
              </p>
              <div className="flex items-center mt-2">
                <span className="text-xs sm:text-sm text-green-600">
                  {analytics.additionalMetrics.saveRate.toFixed(2)}% save rate
                </span>
              </div>
            </div>
            <div className="metric-icon p-2 sm:p-3 rounded-lg bg-green-100">
              <span className="text-2xl">💾</span>
            </div>
          </div>
        </div>

        <div className="metric-card admin-card p-4 sm:p-6 rounded-lg shadow cursor-pointer transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium admin-text-light">Resumes Uploaded</p>
              <p className="text-2xl sm:text-3xl font-bold admin-text">
                {analytics.overview.totalResumes || 0}
              </p>
              <div className="flex items-center mt-2">
                <span className="text-xs sm:text-sm admin-text-light">User submissions</span>
              </div>
            </div>
            <div className="metric-icon p-2 sm:p-3 rounded-lg bg-yellow-100">
              <span className="text-2xl">📄</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        {/* Trend Chart */}
        <div className="chart-card admin-card p-4 sm:p-6 rounded-lg shadow">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-6">
            <h2 className="text-lg font-semibold admin-text">
              Activity Trends
            </h2>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="w-full sm:w-auto text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text bg-white dark:bg-gray-700"
            >
              <option value="applications">Applications</option>
              <option value="jobs">Jobs Posted</option>
              <option value="users">New Users</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={analytics.applicationsByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value, name) => [
                  value,
                  name.charAt(0).toUpperCase() + name.slice(1),
                ]}
              />
              <Area
                type="monotone"
                dataKey={selectedMetric}
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.1}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Jobs by Department */}
        <div className="chart-card admin-card p-4 sm:p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold admin-text mb-6">
            Jobs by Department
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <Pie
                data={analytics.jobsByDepartment}
                cx="50%"
                cy="50%"
                outerRadius={90}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(1)}%`
                }
              >
                {analytics.jobsByDepartment.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Conversion Funnel & Top Jobs */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        {/* Conversion Funnel */}
        <div className="chart-card admin-card p-4 sm:p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold admin-text mb-6">
            Conversion Funnel
          </h2>
          <div className="space-y-4">
            {analytics.conversionFunnel.map((stage, index) => (
              <div key={index} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium admin-text-light">
                    {stage.stage}
                  </span>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm admin-text-light">
                      {stage.percentage.toFixed(2)}%
                    </span>
                    <span className="text-lg font-bold admin-text">
                      {stage.count.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${stage.percentage.toFixed(2)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performing Jobs */}
        <div className="chart-card admin-card p-4 sm:p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold admin-text mb-6">
            Top Performing Jobs
          </h2>
          <div className="space-y-3 sm:space-y-4">
            {analytics.topJobs.map((job, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium admin-text">{job.title}</div>
                  <div className="text-sm admin-text-light">
                    {job.applications} applications • {job.views} views
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium admin-text">
                    {parseFloat(job.conversionRate).toFixed(2)}%
                  </div>
                  <div className="text-xs admin-text-light">conversion</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Application Status Cards */}
      <div className="chart-card admin-card p-4 sm:p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold admin-text mb-6">
          Application Status Distribution
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {analytics.applicationStatus.map((status, index) => (
            <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
              <div 
                className="w-4 h-4 rounded-full mx-auto mb-2"
                style={{ backgroundColor: status.color }}
              ></div>
              <div className="text-2xl font-bold admin-text mb-1">
                {status.value}
              </div>
              <div className="text-sm admin-text-light mb-1">
                {status.name}
              </div>
              <div className="text-xs admin-text-light">
                {((status.value / analytics.overview.totalApplications) * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="chart-card admin-card p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-green-100">
              <Target className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold admin-text">
              Avg. Time to Hire
            </h3>
          </div>
          <div className="text-2xl sm:text-3xl font-bold admin-text mb-2">
            {analytics.additionalMetrics.avgTimeToHire || 0} days
          </div>
          <div className="flex items-center">
            <span className="text-xs sm:text-sm admin-text-light">
              {analytics.additionalMetrics.avgTimeToHire > 0 
                ? "Average hiring timeline" 
                : "No hires in period"}
            </span>
          </div>
        </div>

        <div className="chart-card admin-card p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-100">
              <Award className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold admin-text">Success Rate</h3>
          </div>
          <div className="text-2xl sm:text-3xl font-bold admin-text mb-2">
            {analytics.additionalMetrics.successRate.toFixed(2)}%
          </div>
          <div className="flex items-center">
            <span className="text-xs sm:text-sm admin-text-light">
              Applications to hire rate
            </span>
          </div>
        </div>

        <div className="chart-card admin-card p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-100">
              <Activity className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold admin-text">
              Avg. Applications/Job
            </h3>
          </div>
          <div className="text-2xl sm:text-3xl font-bold admin-text mb-2">
            {analytics.additionalMetrics.avgApplicationsPerJob.toFixed(2)}
          </div>
          <div className="flex items-center">
            <span className="text-xs sm:text-sm admin-text-light">
              Average per job posting
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  return (
    <ResourcePermissionGuard 
      resource="analytics" 
      actions={["view"]}
      fallbackPath="/admin/dashboard"
    >
      <AdminAnalyticsContent />
    </ResourcePermissionGuard>
  );
}
