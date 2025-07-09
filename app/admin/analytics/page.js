"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { useAnimationSettings } from "@/app/hooks/useAnimationSettings";
import { useAnalytics, usePrefetchAdminData } from "@/app/hooks/useAdminData";
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

export default function AdminAnalytics() {
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

  const getMockData = () => ({
    overview: {
      totalJobs: 45,
      totalApplications: 1247,
      totalUsers: 892,
      totalViews: 15643,
      jobsChange: 12.5,
      applicationsChange: -3.2,
      usersChange: 8.7,
      viewsChange: 22.1,
    },
    applicationsByDay: [
      { date: "2025-01-01", applications: 32, jobs: 2, users: 15 },
      { date: "2025-01-02", applications: 28, jobs: 1, users: 22 },
      { date: "2025-01-03", applications: 45, jobs: 3, users: 18 },
      { date: "2025-01-04", applications: 38, jobs: 2, users: 31 },
      { date: "2025-01-05", applications: 52, jobs: 4, users: 28 },
      { date: "2025-01-06", applications: 41, jobs: 1, users: 19 },
      { date: "2025-01-07", applications: 35, jobs: 2, users: 24 },
    ],
    jobsByDepartment: [
      { name: "Engineering", value: 18, color: "#3B82F6" },
      { name: "Marketing", value: 8, color: "#10B981" },
      { name: "Sales", value: 12, color: "#F59E0B" },
      { name: "Design", value: 5, color: "#EF4444" },
      { name: "Operations", value: 2, color: "#8B5CF6" },
    ],
    applicationStatus: [
      { name: "Applied", value: 624, color: "#3B82F6" },
      { name: "Reviewing", value: 312, color: "#F59E0B" },
      { name: "Interview", value: 186, color: "#10B981" },
      { name: "Hired", value: 89, color: "#059669" },
      { name: "Rejected", value: 36, color: "#EF4444" },
    ],
    topJobs: [
      {
        title: "Senior React Developer",
        applications: 124,
        views: 1847,
        conversionRate: 6.7,
      },
      {
        title: "Marketing Manager",
        applications: 89,
        views: 1234,
        conversionRate: 7.2,
      },
      {
        title: "UX Designer",
        applications: 78,
        views: 1456,
        conversionRate: 5.4,
      },
      {
        title: "Sales Representative",
        applications: 65,
        views: 987,
        conversionRate: 6.6,
      },
      {
        title: "DevOps Engineer",
        applications: 52,
        views: 876,
        conversionRate: 5.9,
      },
    ],
    conversionFunnel: [
      { stage: "Job Views", count: 15643, percentage: 100 },
      { stage: "Started Application", count: 2847, percentage: 18.2 },
      { stage: "Completed Application", count: 1247, percentage: 43.8 },
      { stage: "Interview", count: 186, percentage: 14.9 },
      { stage: "Hired", count: 89, percentage: 47.8 },
    ],
    additionalMetrics: {
      avgTimeToHire: 18,
      successRate: 7.1,
      avgApplicationsPerJob: 27.7,
    },
  });

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold admin-text">Analytics Dashboard</h1>
          <p className="admin-text-light mt-2">
            Track performance metrics and insights across your job board
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text"
          >
            {timeRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 admin-text"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
          <button
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${getButtonClasses("primary")}`}
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="metric-card admin-card p-6 rounded-lg shadow cursor-pointer transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium admin-text-light">Total Jobs</p>
              <p className="text-3xl font-bold admin-text">
                {analytics.overview.totalJobs}
              </p>
              <div className="flex items-center mt-2">
                {getChangeIcon(analytics.overview.jobsChange)}
                <span
                  className={`text-sm ml-1 ${getChangeColor(
                    analytics.overview.jobsChange
                  )}`}
                >
                  {Math.abs(analytics.overview.jobsChange)}%
                </span>
                <span className="text-sm admin-text-light ml-1">
                  vs last period
                </span>
              </div>
            </div>
            <div
              className={`metric-icon p-3 rounded-lg ${getStatCardClasses(0).bg}`}
            >
              <Briefcase className={`h-6 w-6 ${getStatCardClasses(0).icon}`} />
            </div>
          </div>
        </div>

        <div className="metric-card admin-card p-6 rounded-lg shadow cursor-pointer transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium admin-text-light">
                Applications
              </p>
              <p className="text-3xl font-bold admin-text">
                {analytics.overview.totalApplications}
              </p>
              <div className="flex items-center mt-2">
                {getChangeIcon(analytics.overview.applicationsChange)}
                <span
                  className={`text-sm ml-1 ${getChangeColor(
                    analytics.overview.applicationsChange
                  )}`}
                >
                  {Math.abs(analytics.overview.applicationsChange)}%
                </span>
                <span className="text-sm admin-text-light ml-1">
                  vs last period
                </span>
              </div>
            </div>
            <div
              className={`metric-icon p-3 rounded-lg ${getStatCardClasses(1).bg}`}
            >
              <FileText className={`h-6 w-6 ${getStatCardClasses(1).icon}`} />
            </div>
          </div>
        </div>

        <div className="metric-card admin-card p-6 rounded-lg shadow cursor-pointer transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium admin-text-light">
                Total Users
              </p>
              <p className="text-3xl font-bold admin-text">
                {analytics.overview.totalUsers}
              </p>
              <div className="flex items-center mt-2">
                {getChangeIcon(analytics.overview.usersChange)}
                <span
                  className={`text-sm ml-1 ${getChangeColor(
                    analytics.overview.usersChange
                  )}`}
                >
                  {Math.abs(analytics.overview.usersChange)}%
                </span>
                <span className="text-sm admin-text-light ml-1">
                  vs last period
                </span>
              </div>
            </div>
            <div
              className={`metric-icon p-3 rounded-lg ${getStatCardClasses(2).bg}`}
            >
              <Users className={`h-6 w-6 ${getStatCardClasses(2).icon}`} />
            </div>
          </div>
        </div>

        <div className="metric-card admin-card p-6 rounded-lg shadow cursor-pointer transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium admin-text-light">Job Views</p>
              <p className="text-3xl font-bold admin-text">
                {analytics.overview.totalViews.toLocaleString()}
              </p>
              <div className="flex items-center mt-2">
                {getChangeIcon(analytics.overview.viewsChange)}
                <span
                  className={`text-sm ml-1 ${getChangeColor(
                    analytics.overview.viewsChange
                  )}`}
                >
                  {Math.abs(analytics.overview.viewsChange)}%
                </span>
                <span className="text-sm admin-text-light ml-1">
                  vs last period
                </span>
              </div>
            </div>
            <div
              className={`metric-icon p-3 rounded-lg ${getStatCardClasses(3).bg}`}
            >
              <Eye className={`h-6 w-6 ${getStatCardClasses(3).icon}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Trend Chart */}
        <div className="chart-card admin-card p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold admin-text">
              Activity Trends
            </h2>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="text-sm border border-gray-300 rounded px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text"
            >
              <option value="applications">Applications</option>
              <option value="jobs">Jobs Posted</option>
              <option value="users">New Users</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analytics.applicationsByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis tick={{ fontSize: 12 }} />
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
        <div className="chart-card admin-card p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold admin-text mb-6">
            Jobs by Department
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.jobsByDepartment}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
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

      {/* Application Status & Top Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Application Status */}
        <div className="chart-card admin-card p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold admin-text mb-6">
            Application Status Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.applicationStatus} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 12 }}
                width={80}
              />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {analytics.applicationStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Performing Jobs */}
        <div className="chart-card admin-card p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold admin-text mb-6">
            Top Performing Jobs
          </h2>
          <div className="space-y-4">
            {analytics.topJobs.map((job, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium admin-text">{job.title}</div>
                  <div className="text-sm admin-text-light">
                    {job.applications} applications • {job.views} views
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium admin-text">
                    {job.conversionRate}%
                  </div>
                  <div className="text-xs admin-text-light">conversion</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="chart-card admin-card p-6 rounded-lg shadow">
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
                    {stage.percentage}%
                  </span>
                  <span className="text-lg font-bold admin-text">
                    {stage.count.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${stage.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="chart-card admin-card p-6 rounded-lg shadow">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-green-100">
              <Target className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold admin-text">
              Avg. Time to Hire
            </h3>
          </div>
          <div className="text-3xl font-bold admin-text mb-2">
            {analytics.additionalMetrics.avgTimeToHire} days
          </div>
          <div className="flex items-center">
            <TrendingDown className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600 ml-1">2 days faster</span>
            <span className="text-sm admin-text-light ml-1">
              than last month
            </span>
          </div>
        </div>

        <div className="chart-card admin-card p-6 rounded-lg shadow">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-100">
              <Award className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold admin-text">Success Rate</h3>
          </div>
          <div className="text-3xl font-bold admin-text mb-2">
            {analytics.additionalMetrics.successRate}%
          </div>
          <div className="flex items-center">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600 ml-1">1.2% increase</span>
            <span className="text-sm admin-text-light ml-1">
              from last month
            </span>
          </div>
        </div>

        <div className="chart-card admin-card p-6 rounded-lg shadow">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-100">
              <Activity className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold admin-text">
              Avg. Applications/Job
            </h3>
          </div>
          <div className="text-3xl font-bold admin-text mb-2">
            {analytics.additionalMetrics.avgApplicationsPerJob}
          </div>
          <div className="flex items-center">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600 ml-1">3.2 increase</span>
            <span className="text-sm admin-text-light ml-1">
              from last month
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
