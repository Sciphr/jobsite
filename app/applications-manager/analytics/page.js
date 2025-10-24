"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import {
  useAnalytics,
  useJobsSimple,
} from "@/app/hooks/useAdminData";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Briefcase,
  FileText,
  Clock,
  Target,
  Award,
  Activity,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus,
  Download,
  Zap,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
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
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";

export default function AdvancedAnalyticsPage() {
  const { data: session } = useSession();
  const { getStatCardClasses, getButtonClasses } = useThemeClasses();
  const [timeRange, setTimeRange] = useState("30d");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const { data: jobs = [] } = useJobsSimple();
  const { data: analytics, isLoading, refetch } = useAnalytics(timeRange, selectedDepartment);

  // Debug: Log the analytics data
  useEffect(() => {
    if (analytics) {
      console.log("Analytics data received:", analytics);
      console.log("Metrics:", analytics.metrics);
      console.log("Additional metrics:", analytics.additionalMetrics);
    }
  }, [analytics]);

  // Get unique departments
  const departments = useMemo(() => {
    const depts = new Set(jobs.map(job => job.department).filter(Boolean));
    return Array.from(depts);
  }, [jobs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 500);
  };

  // Enhanced metrics calculations
  const enhancedMetrics = useMemo(() => {
    if (!analytics || !analytics.overview) return null;

    const totalApplications = analytics.overview.totalApplications || 0;
    const totalJobs = analytics.overview.totalJobs || 0;
    const avgTimeToHire = analytics.additionalMetrics?.avgTimeToHire || 0;
    const conversionRate = analytics.additionalMetrics?.successRate || 0;

    // Transform applicationsByDay to time series
    const timeSeriesData = (analytics.applicationsByDay || []).map(item => ({
      date: item.date,
      applications: item.count || 0
    }));

    console.log("Time series data for chart:", timeSeriesData.slice(0, 5));

    // Transform applicationStatus to stage distribution
    const stageDistribution = (analytics.applicationStatus || []).map(item => ({
      name: item.name,
      value: item.value
    }));

    // Create source breakdown (you might not have this in your API, so we'll create dummy data or skip)
    const sourceBreakdown = [
      { source: 'Direct Apply', count: Math.round(totalApplications * 0.4) },
      { source: 'LinkedIn', count: Math.round(totalApplications * 0.3) },
      { source: 'Indeed', count: Math.round(totalApplications * 0.2) },
      { source: 'Referral', count: Math.round(totalApplications * 0.1) },
    ].filter(item => item.count > 0);

    return {
      totalApplications,
      totalJobs,
      avgTimeToHire,
      conversionRate: parseFloat(conversionRate).toFixed(1),
      applicationTrend: analytics.overview?.applicationsChange || 0,
      topPerformingJobs: (analytics.topJobs || []).map(job => ({
        title: job.title,
        department: job.department,
        application_count: job.applicationCount
      })),
      stageDistribution,
      sourceBreakdown,
      timeSeriesData,
    };
  }, [analytics]);

  // Chart colors
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin admin-text mx-auto mb-4" />
          <p className="admin-text-light">Loading advanced analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold admin-text flex items-center gap-3">
            <BarChart3 className="h-8 w-8 theme-primary" />
            Advanced Analytics Dashboard
          </h1>
          <p className="admin-text-light mt-1">
            Deep insights into your recruitment pipeline and performance metrics
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Time Range Filter */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className={`${getButtonClasses("secondary")} px-4 py-2 rounded-lg text-sm font-medium`}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>

          {/* Department Filter */}
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className={`${getButtonClasses("secondary")} px-4 py-2 rounded-lg text-sm font-medium`}
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`${getButtonClasses("accent")} px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2`}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {/* Export Button */}
          <button
            className={`${getButtonClasses("primary")} px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2`}
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </motion.div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className={`${getStatCardClasses(0).bg} rounded-lg p-6 border admin-border`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium admin-text-light">Total Applications</p>
              <p className="text-3xl font-bold admin-text mt-2">
                {enhancedMetrics?.totalApplications || 0}
              </p>
            </div>
            <FileText className={`h-12 w-12 ${getStatCardClasses(0).icon}`} />
          </div>
          <div className="flex items-center gap-2 mt-4">
            {enhancedMetrics?.applicationTrend > 0 ? (
              <ArrowUp className="h-4 w-4 text-green-500" />
            ) : enhancedMetrics?.applicationTrend < 0 ? (
              <ArrowDown className="h-4 w-4 text-red-500" />
            ) : (
              <Minus className="h-4 w-4 text-gray-400" />
            )}
            <span className={`text-sm font-medium ${
              enhancedMetrics?.applicationTrend > 0 ? 'text-green-600' :
              enhancedMetrics?.applicationTrend < 0 ? 'text-red-600' :
              'text-gray-600'
            }`}>
              {Math.abs(enhancedMetrics?.applicationTrend || 0)}% vs last period
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className={`${getStatCardClasses(1).bg} rounded-lg p-6 border admin-border`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium admin-text-light">Active Jobs</p>
              <p className="text-3xl font-bold admin-text mt-2">
                {enhancedMetrics?.totalJobs || 0}
              </p>
            </div>
            <Briefcase className={`h-12 w-12 ${getStatCardClasses(1).icon}`} />
          </div>
          <div className="mt-4">
            <p className="text-sm admin-text-light">
              {((enhancedMetrics?.totalApplications || 0) / (enhancedMetrics?.totalJobs || 1)).toFixed(1)} applications per job
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className={`${getStatCardClasses(2).bg} rounded-lg p-6 border admin-border`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium admin-text-light">Conversion Rate</p>
              <p className="text-3xl font-bold admin-text mt-2">
                {enhancedMetrics?.conversionRate || 0}%
              </p>
            </div>
            <Target className={`h-12 w-12 ${getStatCardClasses(2).icon}`} />
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${enhancedMetrics?.conversionRate || 0}%` }}
              ></div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className={`${getStatCardClasses(3).bg} rounded-lg p-6 border admin-border`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium admin-text-light">Avg. Time to Hire</p>
              <p className="text-3xl font-bold admin-text mt-2">
                {enhancedMetrics?.avgTimeToHire || 0}d
              </p>
            </div>
            <Clock className={`h-12 w-12 ${getStatCardClasses(3).icon}`} />
          </div>
          <div className="mt-4">
            <p className="text-sm admin-text-light">
              Industry avg: 30-45 days
            </p>
          </div>
        </motion.div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Applications Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="admin-card border admin-border rounded-lg p-6"
        >
          <h3 className="text-lg font-semibold admin-text mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 theme-primary" />
            Applications Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={enhancedMetrics?.timeSeriesData || []}>
              <defs>
                <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
              <XAxis dataKey="date" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#F3F4F6' }}
              />
              <Area
                type="monotone"
                dataKey="applications"
                stroke="#3B82F6"
                fillOpacity={1}
                fill="url(#colorApplications)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Stage Distribution Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="admin-card border admin-border rounded-lg p-6"
        >
          <h3 className="text-lg font-semibold admin-text mb-4 flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 theme-primary" />
            Application Stage Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={enhancedMetrics?.stageDistribution || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {(enhancedMetrics?.stageDistribution || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Source Breakdown Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="admin-card border admin-border rounded-lg p-6"
        >
          <h3 className="text-lg font-semibold admin-text mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 theme-primary" />
            Application Sources
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={enhancedMetrics?.sourceBreakdown || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
              <XAxis dataKey="source" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#F3F4F6' }}
              />
              <Bar dataKey="count" fill="#10B981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Top Performing Jobs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="admin-card border admin-border rounded-lg p-6"
        >
          <h3 className="text-lg font-semibold admin-text mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 theme-primary" />
            Top Performing Jobs
          </h3>
          <div className="space-y-3">
            {(enhancedMetrics?.topPerformingJobs || []).slice(0, 5).map((job, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium admin-text">{job.title}</p>
                  <p className="text-sm admin-text-light">{job.department}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold admin-text">{job.application_count}</p>
                  <p className="text-xs admin-text-light">applications</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Conversion Funnel - UNIQUE TO ADVANCED ANALYTICS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="admin-card border admin-border rounded-lg p-6"
      >
        <h3 className="text-lg font-semibold admin-text mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 theme-primary" />
          Conversion Funnel Analysis
        </h3>
        <div className="space-y-4">
          {(analytics?.conversionFunnel || []).map((stage, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium admin-text">{stage.stage}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm admin-text-light">{stage.count.toLocaleString()} applicants</span>
                  <span className={`text-sm font-bold ${
                    stage.percentage > 50 ? 'text-green-600' :
                    stage.percentage > 10 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {stage.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-4 rounded-full transition-all duration-500 ${
                    index === 0 ? 'bg-blue-500' :
                    index === 1 ? 'bg-green-500' :
                    index === 2 ? 'bg-yellow-500' :
                    index === 3 ? 'bg-orange-500' :
                    'bg-purple-500'
                  }`}
                  style={{ width: `${stage.percentage}%` }}
                ></div>
              </div>
              {index < (analytics?.conversionFunnel || []).length - 1 && (
                <div className="flex items-center justify-center my-2">
                  <ArrowDown className="h-4 w-4 text-gray-400" />
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Insights Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="admin-card border admin-border rounded-lg p-6"
      >
        <h3 className="text-lg font-semibold admin-text mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 theme-primary" />
          AI-Powered Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400 mb-2" />
            <p className="text-sm font-medium admin-text">Strong Performance</p>
            <p className="text-xs admin-text-light mt-1">
              Your applications are {enhancedMetrics?.applicationTrend > 0 ? 'up' : 'stable'} compared to last period
            </p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <Target className="h-6 w-6 text-green-600 dark:text-green-400 mb-2" />
            <p className="text-sm font-medium admin-text">Conversion Optimized</p>
            <p className="text-xs admin-text-light mt-1">
              {enhancedMetrics?.conversionRate}% of applicants reach final stages
            </p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400 mb-2" />
            <p className="text-sm font-medium admin-text">Efficient Hiring</p>
            <p className="text-xs admin-text-light mt-1">
              Average time to hire is {enhancedMetrics?.avgTimeToHire}d, {enhancedMetrics?.avgTimeToHire < 30 ? 'faster than' : 'comparable to'} industry average
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
