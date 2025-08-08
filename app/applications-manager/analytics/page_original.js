// app/applications-manager/analytics/page.js
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { useApplications, useJobsSimple } from "@/app/hooks/useAdminData";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Briefcase,
  Clock,
  Target,
  ArrowRight,
  Download,
  Filter,
  CheckCircle,
  AlertTriangle,
  Star,
  Globe,
  Mail,
  Award,
  Timer,
  Building,
  ChevronDown,
  RefreshCw,
  PieChart,
  Activity,
  Layers,
  FileText,
} from "lucide-react";
import { exportAnalyticsWithEmbeddedCharts } from "@/app/utils/excelExportEmbeddedCharts";

export default function AnalyticsPage() {
  const router = useRouter();
  const { getButtonClasses, getStatCardClasses } = useThemeClasses();

  // Data fetching
  const { data: applications = [] } = useApplications();
  const { data: jobs = [] } = useJobsSimple();

  // State
  const [timeRange, setTimeRange] = useState("30d");
  const [selectedMetric, setSelectedMetric] = useState("overview");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState("all");

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

  const statCardVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
      },
    },
  };

  const chartVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24,
      },
    },
  };

  // Time range options
  const timeRanges = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 3 months" },
    { value: "12m", label: "Last 12 months" },
  ];

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    const days =
      parseInt(timeRange.replace("d", "").replace("m", "")) *
      (timeRange.includes("m") ? 30 : 1);
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return { startDate, endDate: now };
  };

  // Filter applications by time range and department
  const filteredApplications = useMemo(() => {
    const { startDate } = getDateRange();
    let filtered = applications.filter(
      (app) => new Date(app.appliedAt) >= startDate
    );

    if (selectedDepartment !== "all") {
      filtered = filtered.filter(
        (app) => app.job?.department === selectedDepartment
      );
    }

    return filtered;
  }, [applications, timeRange, selectedDepartment]);

  // Filter jobs by department
  const filteredJobs = useMemo(() => {
    if (selectedDepartment === "all") return jobs;
    return jobs.filter((job) => job.department === selectedDepartment);
  }, [jobs, selectedDepartment]);

  // Calculate comprehensive analytics
  const analytics = useMemo(() => {
    const statusCounts = filteredApplications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});

    // Time-based metrics
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const thisWeekApplications = applications.filter(
      (app) => new Date(app.appliedAt) >= lastWeek
    );
    const lastWeekApplications = applications.filter((app) => {
      const date = new Date(app.appliedAt);
      return (
        date >= new Date(lastWeek.getTime() - 7 * 24 * 60 * 60 * 1000) &&
        date < lastWeek
      );
    });

    // Calculate trends
    const weeklyGrowth =
      lastWeekApplications.length > 0
        ? ((thisWeekApplications.length - lastWeekApplications.length) /
            lastWeekApplications.length) *
          100
        : thisWeekApplications.length > 0
          ? 100
          : 0;

    // Conversion funnel
    const totalApplications = filteredApplications.length;
    const reviewing = statusCounts.Reviewing || 0;
    const interviewing = statusCounts.Interview || 0;
    const hired = statusCounts.Hired || 0;
    const rejected = statusCounts.Rejected || 0;

    // Department breakdown
    const departmentStats = filteredJobs.reduce((acc, job) => {
      const dept = job.department;
      if (!acc[dept]) {
        acc[dept] = {
          jobs: 0,
          applications: 0,
          hired: 0,
          avgTimeToHire: 0,
        };
      }
      acc[dept].jobs++;

      const deptApplications = filteredApplications.filter(
        (app) => app.job?.department === dept
      );
      acc[dept].applications = deptApplications.length;
      acc[dept].hired = deptApplications.filter(
        (app) => app.status === "Hired"
      ).length;

      return acc;
    }, {});

    // Top performing jobs
    const jobPerformance = filteredJobs
      .map((job) => {
        const jobApplications = filteredApplications.filter(
          (app) => app.jobId === job.id
        );
        const hiredCount = jobApplications.filter(
          (app) => app.status === "Hired"
        ).length;

        return {
          ...job,
          applicationsCount: jobApplications.length,
          hiredCount,
          conversionRate:
            jobApplications.length > 0
              ? (hiredCount / jobApplications.length) * 100
              : 0,
          avgTimeToHire: Math.floor(Math.random() * 20) + 10, // Mock data
        };
      })
      .sort((a, b) => b.applicationsCount - a.applicationsCount);

    // Source analysis (mock data for now)
    const sourceAnalysis = [
      {
        source: "Company Website",
        applications: Math.floor(totalApplications * 0.4),
        hired: Math.floor(hired * 0.3),
      },
      {
        source: "LinkedIn",
        applications: Math.floor(totalApplications * 0.25),
        hired: Math.floor(hired * 0.4),
      },
      {
        source: "Indeed",
        applications: Math.floor(totalApplications * 0.15),
        hired: Math.floor(hired * 0.15),
      },
      {
        source: "Referrals",
        applications: Math.floor(totalApplications * 0.1),
        hired: Math.floor(hired * 0.25),
      },
      {
        source: "Other",
        applications: Math.floor(totalApplications * 0.1),
        hired: Math.floor(hired * 0.1),
      },
    ];

    return {
      totalApplications,
      weeklyGrowth,
      statusCounts,
      conversionRates: {
        applicationToReview:
          totalApplications > 0 ? (reviewing / totalApplications) * 100 : 0,
        reviewToInterview: reviewing > 0 ? (interviewing / reviewing) * 100 : 0,
        interviewToHire: interviewing > 0 ? (hired / interviewing) * 100 : 0,
        overallConversion:
          totalApplications > 0 ? (hired / totalApplications) * 100 : 0,
      },
      departmentStats,
      jobPerformance: jobPerformance.slice(0, 5),
      sourceAnalysis,
      timeToHire: {
        average: 14,
        fastest: 7,
        slowest: 28,
        median: 12,
      },
      activeJobs: filteredJobs.filter((job) => job.status === "Active").length,
      totalJobs: filteredJobs.length,
    };
  }, [filteredApplications, filteredJobs, applications, jobs]);

  // Get departments for filter
  const departments = useMemo(() => {
    const depts = [...new Set(jobs.map((job) => job.department))];
    return depts.sort();
  }, [jobs]);

  // Handle export
  const handleExportReport = async () => {
    try {
      const filename = await exportAnalyticsWithEmbeddedCharts(
        analytics,
        timeRange,
        selectedDepartment
      );
      console.log(`Report exported successfully: ${filename}`);
    } catch (error) {
      console.error("Error exporting report:", error);
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      <motion.div className="space-y-6">
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold admin-text flex items-center space-x-3">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <span>Analytics Dashboard</span>
            </h1>
            <p className="admin-text-light mt-2">
              Comprehensive insights into your hiring performance and trends
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${getButtonClasses("secondary")}`}
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
              />
            </button>
            <button
              onClick={handleExportReport}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${getButtonClasses("primary")}`}
            >
              <Download className="h-4 w-4" />
              <span>Export Report</span>
            </button>
          </div>
        </motion.div>

        {/* Filters */}
        {showFilters && (
          <motion.div
            variants={itemVariants}
            className="admin-card p-6 rounded-lg shadow"
          >
            <motion.div
              variants={containerVariants}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Range
                </label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {timeRanges.map((range) => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Metric Focus
                </label>
                <select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="overview">Overview</option>
                  <option value="conversion">Conversion Funnel</option>
                  <option value="performance">Job Performance</option>
                  <option value="sources">Source Analysis</option>
                </select>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Key Metrics */}
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <motion.div
            variants={statCardVariants}
            whileHover={{
              scale: 1.02,
              y: -4,
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
            className={`stat-card admin-card p-6 rounded-lg shadow ${getStatCardClasses(0).border}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold admin-text">
                  {analytics.totalApplications}
                </div>
                <div className="text-sm admin-text-light font-medium">
                  Total Applications
                </div>
                <div className="flex items-center mt-2">
                  {analytics.weeklyGrowth >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span
                    className={`text-sm ${analytics.weeklyGrowth >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {analytics.weeklyGrowth >= 0 ? "+" : ""}
                    {analytics.weeklyGrowth.toFixed(1)}% this week
                  </span>
                </div>
              </div>
              <div
                className={`stat-icon p-3 rounded-lg ${getStatCardClasses(0).bg}`}
              >
                <Users className={`h-6 w-6 ${getStatCardClasses(0).icon}`} />
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={statCardVariants}
            whileHover={{
              scale: 1.02,
              y: -4,
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
            className={`stat-card admin-card p-6 rounded-lg shadow ${getStatCardClasses(1).border}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold admin-text">
                  {analytics.conversionRates.overallConversion.toFixed(1)}%
                </div>
                <div className="text-sm admin-text-light font-medium">
                  Overall Hire Rate
                </div>
                <div className="text-xs admin-text-light mt-2">
                  {analytics.statusCounts.Hired || 0} hired from{" "}
                  {analytics.totalApplications} applications
                </div>
              </div>
              <div
                className={`stat-icon p-3 rounded-lg ${getStatCardClasses(1).bg}`}
              >
                <Target className={`h-6 w-6 ${getStatCardClasses(1).icon}`} />
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={statCardVariants}
            whileHover={{
              scale: 1.02,
              y: -4,
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
            className={`stat-card admin-card p-6 rounded-lg shadow ${getStatCardClasses(2).border}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold admin-text">
                  {analytics.timeToHire.average}
                </div>
                <div className="text-sm admin-text-light font-medium">
                  Avg. Days to Hire
                </div>
                <div className="text-xs admin-text-light mt-2">
                  Median: {analytics.timeToHire.median} days
                </div>
              </div>
              <div
                className={`stat-icon p-3 rounded-lg ${getStatCardClasses(2).bg}`}
              >
                <Clock className={`h-6 w-6 ${getStatCardClasses(2).icon}`} />
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={statCardVariants}
            whileHover={{
              scale: 1.02,
              y: -4,
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
            className={`stat-card admin-card p-6 rounded-lg shadow ${getStatCardClasses(3).border}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold admin-text">
                  {analytics.activeJobs}
                </div>
                <div className="text-sm admin-text-light font-medium">
                  Active Jobs
                </div>
                <div className="text-xs admin-text-light mt-2">
                  {analytics.totalJobs} total positions
                </div>
              </div>
              <div
                className={`stat-icon p-3 rounded-lg ${getStatCardClasses(3).bg}`}
              >
                <Briefcase
                  className={`h-6 w-6 ${getStatCardClasses(3).icon}`}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Main Analytics Grid */}
        {selectedMetric === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Conversion Funnel */}
            <motion.div variants={chartVariants} className="lg:col-span-2">
              <div className="admin-card rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <span>Hiring Funnel</span>
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-6">
                    {/* Funnel Stages */}
                    <div className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Applications Received
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {analytics.totalApplications}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-blue-600 h-3 rounded-full"
                          style={{ width: "100%" }}
                        ></div>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Under Review
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {analytics.statusCounts.Reviewing || 0} (
                          {analytics.conversionRates.applicationToReview.toFixed(
                            1
                          )}
                          %)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.min(100, analytics.conversionRates.applicationToReview)}%`,
                          }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                          className="bg-yellow-500 h-3 rounded-full"
                          style={{
                            width: `${Math.min(100, analytics.conversionRates.applicationToReview)}%`,
                          }}
                        ></motion.div>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Interview Stage
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {analytics.statusCounts.Interview || 0} (
                          {analytics.conversionRates.reviewToInterview.toFixed(
                            1
                          )}
                          %)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.min(100, analytics.conversionRates.reviewToInterview)}%`,
                          }}
                          transition={{ duration: 0.8, delay: 0.4 }}
                          className="bg-green-500 h-3 rounded-full"
                        ></motion.div>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Hired
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {analytics.statusCounts.Hired || 0} (
                          {analytics.conversionRates.interviewToHire.toFixed(1)}
                          %)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.min(100, analytics.conversionRates.interviewToHire)}%`,
                          }}
                          transition={{ duration: 0.8, delay: 0.6 }}
                          className="bg-emerald-600 h-3 rounded-full"
                        ></motion.div>
                      </div>
                    </div>
                  </div>

                  {/* Funnel Insights */}
                  <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">
                      Funnel Insights
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-blue-700">Biggest drop-off:</span>
                        <span className="font-medium text-blue-900">
                          {analytics.conversionRates.applicationToReview <
                          analytics.conversionRates.reviewToInterview
                            ? "Application → Review"
                            : "Review → Interview"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-blue-700">
                          Strongest conversion:
                        </span>
                        <span className="font-medium text-blue-900">
                          Interview → Hire
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Quick Actions & Status */}
            <div className="space-y-6">
              {/* Status Distribution */}
              <div className="admin-card rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
                    <PieChart className="h-5 w-5 text-green-600" />
                    <span>Application Status</span>
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {Object.entries(analytics.statusCounts).map(
                      ([status, count]) => {
                        const percentage =
                          analytics.totalApplications > 0
                            ? (count / analytics.totalApplications) * 100
                            : 0;

                        const colors = {
                          Applied: "bg-blue-500",
                          Reviewing: "bg-yellow-500",
                          Interview: "bg-green-500",
                          Hired: "bg-emerald-600",
                          Rejected: "bg-red-500",
                        };

                        return (
                          <div
                            key={status}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center space-x-3">
                              <div
                                className={`w-3 h-3 rounded-full ${colors[status]}`}
                              ></div>
                              <span className="text-sm font-medium text-gray-700">
                                {status}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-gray-900">
                                {count}
                              </div>
                              <div className="text-xs text-gray-500">
                                {percentage.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="admin-card rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold admin-text">
                    Quick Actions
                  </h3>
                </div>
                <div className="p-6 space-y-3">
                  <motion.button
                    whileHover={{ scale: 1.02, x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() =>
                      router.push("/applications-manager/pipeline")
                    }
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Layers className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">View Pipeline</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02, x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() =>
                      router.push("/applications-manager/communication")
                    }
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Send Emails</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02, x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">Export Data</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Conversion Focus View */}
        {selectedMetric === "conversion" && (
          <div className="space-y-6">
            {/* Conversion Funnel - Full Width */}
            <motion.div variants={chartVariants}>
              <div className="admin-card rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <span>Detailed Hiring Funnel Analysis</span>
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Funnel Stages */}
                    <div className="space-y-6">
                      <h4 className="font-medium text-gray-900 mb-4">
                        Conversion Stages
                      </h4>
                      <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            Applications Received
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            {analytics.totalApplications}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div
                            className="bg-blue-600 h-4 rounded-full"
                            style={{ width: "100%" }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          100% of total volume
                        </div>
                      </div>

                      <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            Under Review
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            {analytics.statusCounts.Reviewing || 0} (
                            {analytics.conversionRates.applicationToReview.toFixed(
                              1
                            )}
                            %)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.min(100, analytics.conversionRates.applicationToReview)}%`,
                            }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="bg-yellow-500 h-4 rounded-full"
                          ></motion.div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Drop-off:{" "}
                          {(
                            100 - analytics.conversionRates.applicationToReview
                          ).toFixed(1)}
                          %
                        </div>
                      </div>

                      <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            Interview Stage
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            {analytics.statusCounts.Interview || 0} (
                            {analytics.conversionRates.reviewToInterview.toFixed(
                              1
                            )}
                            %)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.min(100, analytics.conversionRates.reviewToInterview)}%`,
                            }}
                            transition={{ duration: 0.8, delay: 0.4 }}
                            className="bg-green-500 h-4 rounded-full"
                          ></motion.div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          From previous stage:{" "}
                          {analytics.conversionRates.reviewToInterview.toFixed(
                            1
                          )}
                          %
                        </div>
                      </div>

                      <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            Hired
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            {analytics.statusCounts.Hired || 0} (
                            {analytics.conversionRates.interviewToHire.toFixed(
                              1
                            )}
                            %)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.min(100, analytics.conversionRates.interviewToHire)}%`,
                            }}
                            transition={{ duration: 0.8, delay: 0.6 }}
                            className="bg-emerald-600 h-4 rounded-full"
                          ></motion.div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Final conversion:{" "}
                          {analytics.conversionRates.overallConversion.toFixed(
                            1
                          )}
                          % overall
                        </div>
                      </div>
                    </div>

                    {/* Conversion Insights */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">
                        Conversion Insights
                      </h4>
                      <div className="space-y-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <h5 className="font-medium text-blue-900 mb-2">
                            Overall Performance
                          </h5>
                          <div className="text-2xl font-bold text-blue-600 mb-1">
                            {analytics.conversionRates.overallConversion.toFixed(
                              1
                            )}
                            %
                          </div>
                          <div className="text-sm text-blue-700">
                            End-to-end conversion rate
                          </div>
                        </div>

                        <div className="p-4 bg-yellow-50 rounded-lg">
                          <h5 className="font-medium text-yellow-900 mb-2">
                            Biggest Bottleneck
                          </h5>
                          <div className="text-sm text-yellow-700">
                            {analytics.conversionRates.applicationToReview <
                            analytics.conversionRates.reviewToInterview
                              ? "Application screening - many applications not progressing to review"
                              : "Interview process - review stage has good throughput but interview conversion is low"}
                          </div>
                        </div>

                        <div className="p-4 bg-green-50 rounded-lg">
                          <h5 className="font-medium text-green-900 mb-2">
                            Strongest Stage
                          </h5>
                          <div className="text-sm text-green-700">
                            Interview to hire conversion is performing well at{" "}
                            {analytics.conversionRates.interviewToHire.toFixed(
                              1
                            )}
                            %
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Status Distribution - Enhanced */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="admin-card rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
                    <PieChart className="h-5 w-5 text-green-600" />
                    <span>Application Status Breakdown</span>
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {Object.entries(analytics.statusCounts).map(
                      ([status, count]) => {
                        const percentage =
                          analytics.totalApplications > 0
                            ? (count / analytics.totalApplications) * 100
                            : 0;
                        const colors = {
                          Applied: "bg-blue-500",
                          Reviewing: "bg-yellow-500",
                          Interview: "bg-green-500",
                          Hired: "bg-emerald-600",
                          Rejected: "bg-red-500",
                        };

                        return (
                          <div key={status} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div
                                  className={`w-4 h-4 rounded-full ${colors[status]}`}
                                ></div>
                                <span className="text-sm font-medium text-gray-700">
                                  {status}
                                </span>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-gray-900">
                                  {count}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {percentage.toFixed(1)}%
                                </div>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${colors[status]}`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>

              <div className="admin-card rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold admin-text">
                    Conversion Recommendations
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800">
                        Priority Action
                      </p>
                      <p className="text-sm text-red-700">
                        Focus on improving{" "}
                        {analytics.conversionRates.applicationToReview < 50
                          ? "initial screening process"
                          : "interview scheduling"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                    <Timer className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">
                        Time Optimization
                      </p>
                      <p className="text-sm text-yellow-700">
                        Reduce time between application and first review to
                        improve candidate experience
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-800">
                        Success Pattern
                      </p>
                      <p className="text-sm text-green-700">
                        Candidates who reach interview stage have a{" "}
                        {analytics.conversionRates.interviewToHire.toFixed(1)}%
                        hire rate
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Performance Focus View */}
        {selectedMetric === "performance" && (
          <div className="space-y-6">
            {/* Top Performing Jobs - Enhanced */}
            <div className="admin-card rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
                  <Award className="h-5 w-5 text-yellow-600" />
                  <span>Job Performance Analysis</span>
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {analytics.jobPerformance.map((job, index) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02, y: -4 }}
                      className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-all cursor-pointer"
                      onClick={() =>
                        router.push(`/applications-manager/jobs/${job.id}`)
                      }
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-lg font-bold">
                          {index + 1}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">
                            {job.applicationsCount}
                          </div>
                          <div className="text-xs text-gray-500">
                            applications
                          </div>
                        </div>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">
                        {job.title}
                      </h4>
                      <p className="text-sm text-gray-500 mb-4">
                        {job.department}
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            Hire Rate
                          </span>
                          <span className="font-medium text-green-600">
                            {job.conversionRate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Hired</span>
                          <span className="font-medium text-gray-900">
                            {job.hiredCount}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            Avg. Time
                          </span>
                          <span className="font-medium text-gray-900">
                            {job.avgTimeToHire} days
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Department Performance - Enhanced */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="admin-card rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
                    <Building className="h-5 w-5 text-indigo-600" />
                    <span>Department Performance</span>
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-6">
                    {Object.entries(analytics.departmentStats).map(
                      ([dept, stats], index) => (
                        <motion.div
                          key={dept}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-4 border border-gray-200 rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-900">
                              {dept}
                            </h4>
                            <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                              {stats.jobs} jobs
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-center mb-3">
                            <div>
                              <div className="text-xl font-bold text-blue-600">
                                {stats.applications}
                              </div>
                              <div className="text-xs text-gray-500">
                                Applications
                              </div>
                            </div>
                            <div>
                              <div className="text-xl font-bold text-green-600">
                                {stats.hired}
                              </div>
                              <div className="text-xs text-gray-500">Hired</div>
                            </div>
                            <div>
                              <div className="text-xl font-bold text-purple-600">
                                {stats.applications > 0
                                  ? (
                                      (stats.hired / stats.applications) *
                                      100
                                    ).toFixed(1)
                                  : 0}
                                %
                              </div>
                              <div className="text-xs text-gray-500">
                                Success Rate
                              </div>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                              style={{
                                width: `${stats.applications > 0 ? (stats.hired / stats.applications) * 100 : 0}%`,
                              }}
                            ></div>
                          </div>
                        </motion.div>
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="admin-card rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold admin-text">
                    Performance Insights
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h5 className="font-medium text-green-900 mb-2">
                        Top Performer
                      </h5>
                      <p className="text-sm text-green-700">
                        {analytics.jobPerformance[0]?.title || "N/A"} leads with{" "}
                        {analytics.jobPerformance[0]?.applicationsCount || 0}{" "}
                        applications
                      </p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h5 className="font-medium text-blue-900 mb-2">
                        Best Conversion
                      </h5>
                      <p className="text-sm text-blue-700">
                        Highest hire rate:{" "}
                        {Math.max(
                          ...analytics.jobPerformance.map(
                            (j) => j.conversionRate
                          )
                        ).toFixed(1)}
                        %
                      </p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <h5 className="font-medium text-yellow-900 mb-2">
                        Opportunity
                      </h5>
                      <p className="text-sm text-yellow-700">
                        Focus recruitment efforts on departments with high
                        success rates
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sources Focus View */}
        {selectedMetric === "sources" && (
          <div className="space-y-6">
            {/* Source Analysis - Enhanced */}
            <div className="admin-card rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
                  <Globe className="h-5 w-5 text-cyan-600" />
                  <span>Recruitment Source Analysis</span>
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {analytics.sourceAnalysis.map((source, index) => (
                    <motion.div
                      key={source.source}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.05, y: -4 }}
                      className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-all"
                    >
                      <div className="text-center mb-4">
                        <div
                          className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-3 ${getStatCardClasses(index % 4).bg}`}
                        >
                          <Globe
                            className={`h-8 w-8 ${getStatCardClasses(index % 4).icon}`}
                          />
                        </div>
                        <h4 className="font-semibold text-gray-900">
                          {source.source}
                        </h4>
                      </div>

                      <div className="space-y-3">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-gray-900">
                            {source.applications}
                          </div>
                          <div className="text-sm text-gray-500">
                            Total Applications
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <span className="text-sm font-medium text-green-800">
                            Hired
                          </span>
                          <span className="text-lg font-bold text-green-600">
                            {source.hired}
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <span className="text-sm font-medium text-blue-800">
                            Success Rate
                          </span>
                          <span className="text-lg font-bold text-blue-600">
                            {source.applications > 0
                              ? (
                                  (source.hired / source.applications) *
                                  100
                                ).toFixed(1)
                              : 0}
                            %
                          </span>
                        </div>

                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-3 rounded-full"
                            style={{
                              width: `${source.applications > 0 ? (source.hired / source.applications) * 100 : 0}%`,
                            }}
                          ></div>
                        </div>

                        <div className="text-center">
                          <div className="text-xs text-gray-500">
                            {(
                              (source.applications /
                                analytics.totalApplications) *
                              100
                            ).toFixed(1)}
                            % of total volume
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Source Performance Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="admin-card rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold admin-text">
                    Source Performance Ranking
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {analytics.sourceAnalysis
                      .sort(
                        (a, b) =>
                          b.hired / b.applications - a.hired / a.applications
                      )
                      .map((source, index) => {
                        const successRate =
                          source.applications > 0
                            ? (source.hired / source.applications) * 100
                            : 0;
                        return (
                          <div
                            key={source.source}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center space-x-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                  index === 0
                                    ? "bg-yellow-100 text-yellow-800"
                                    : index === 1
                                      ? "bg-gray-100 text-gray-800"
                                      : index === 2
                                        ? "bg-orange-100 text-orange-800"
                                        : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {index + 1}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {source.source}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {source.applications} applications
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-green-600">
                                {successRate.toFixed(1)}%
                              </div>
                              <div className="text-sm text-gray-500">
                                {source.hired} hired
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              <div className="admin-card rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold admin-text">
                    Source Optimization
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h5 className="font-medium text-green-900 mb-2">
                      High Performer
                    </h5>
                    <p className="text-sm text-green-700">
                      LinkedIn shows the best conversion rate - consider
                      increasing investment here
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h5 className="font-medium text-blue-900 mb-2">
                      Volume Leader
                    </h5>
                    <p className="text-sm text-blue-700">
                      Company Website generates the most applications - optimize
                      the career page
                    </p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h5 className="font-medium text-yellow-900 mb-2">
                      Underutilized
                    </h5>
                    <p className="text-sm text-yellow-700">
                      Referrals have good conversion but low volume - expand
                      referral program
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h5 className="font-medium text-purple-900 mb-2">
                      Cost Analysis
                    </h5>
                    <p className="text-sm text-purple-700">
                      Focus budget on high-conversion, low-cost channels for
                      better ROI
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Additional Analytics Sections - Continue overview */}
        <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performing Jobs */}
          <div className="admin-card rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
                <Award className="h-5 w-5 text-yellow-600" />
                <span>Top Performing Jobs</span>
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {analytics.jobPerformance.map((job, index) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02, x: 4 }}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() =>
                      router.push(`/applications-manager/jobs/${job.id}`)
                    }
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {job.title}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {job.department}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {job.applicationsCount}
                      </div>
                      <div className="text-xs text-gray-500">applications</div>
                      <div className="text-xs text-green-600 font-medium">
                        {job.conversionRate.toFixed(1)}% hire rate
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Department Performance */}
          <motion.div className="admin-card rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
                <Building className="h-5 w-5 text-indigo-600" />
                <span>Department Performance</span>
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {Object.entries(analytics.departmentStats).map(
                  ([dept, stats], index) => (
                    <motion.div
                      key={dept}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      className="p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">{dept}</h4>
                        <span className="text-sm text-gray-500">
                          {stats.jobs} jobs
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <div className="text-lg font-bold text-blue-600">
                            {stats.applications}
                          </div>
                          <div className="text-xs text-gray-500">
                            Applications
                          </div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-green-600">
                            {stats.hired}
                          </div>
                          <div className="text-xs text-gray-500">Hired</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-purple-600">
                            {stats.applications > 0
                              ? (
                                  (stats.hired / stats.applications) *
                                  100
                                ).toFixed(1)
                              : 0}
                            %
                          </div>
                          <div className="text-xs text-gray-500">
                            Success Rate
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Source Analysis */}
        <div className="admin-card rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
              <Globe className="h-5 w-5 text-cyan-600" />
              <span>Application Sources</span>
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {analytics.sourceAnalysis.map((source, index) => (
                <motion.div
                  key={source.source}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="text-center"
                >
                  <div className="mb-4">
                    <div
                      className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${getStatCardClasses(index % 4).bg}`}
                    >
                      <Globe
                        className={`h-8 w-8 ${getStatCardClasses(index % 4).icon}`}
                      />
                    </div>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    {source.source}
                  </h4>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-gray-900">
                      {source.applications}
                    </div>
                    <div className="text-sm text-gray-500">applications</div>
                    <div className="text-sm font-medium text-green-600">
                      {source.hired} hired
                    </div>
                    <div className="text-xs text-gray-500">
                      {source.applications > 0
                        ? ((source.hired / source.applications) * 100).toFixed(
                            1
                          )
                        : 0}
                      % success
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Time-based Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Time to Hire Analysis */}
          <div className="admin-card rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
                <Timer className="h-5 w-5 text-orange-600" />
                <span>Time to Hire Analysis</span>
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {analytics.timeToHire.average}
                  </div>
                  <div className="text-sm text-gray-500">Average Days</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {analytics.timeToHire.median}
                  </div>
                  <div className="text-sm text-gray-500">Median Days</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">
                      Fastest Hire
                    </span>
                  </div>
                  <span className="text-green-800 font-bold">
                    {analytics.timeToHire.fastest} days
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-800">
                      Slowest Hire
                    </span>
                  </div>
                  <span className="text-red-800 font-bold">
                    {analytics.timeToHire.slowest} days
                  </span>
                </div>
              </div>

              {/* Time Range Breakdown */}
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3">
                  Hiring Speed Distribution
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">≤ 7 days (Fast)</span>
                    <span className="font-medium">25%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">8-14 days (Normal)</span>
                    <span className="font-medium">45%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">15-21 days (Slow)</span>
                    <span className="font-medium">20%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      &gt; 21 days (Very Slow)
                    </span>
                    <span className="font-medium">10%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trends & Predictions */}
          <div className="admin-card rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <span>Trends & Insights</span>
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {/* Key Insights */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">
                    Key Insights
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                      <Star className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-800">
                          Strong Performance
                        </p>
                        <p className="text-sm text-blue-700">
                          LinkedIn referrals have the highest conversion rate at{" "}
                          {analytics.sourceAnalysis.find(
                            (s) => s.source === "LinkedIn"
                          )
                            ? (
                                (analytics.sourceAnalysis.find(
                                  (s) => s.source === "LinkedIn"
                                ).hired /
                                  analytics.sourceAnalysis.find(
                                    (s) => s.source === "LinkedIn"
                                  ).applications) *
                                100
                              ).toFixed(1)
                            : 0}
                          %
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-800">
                          Opportunity
                        </p>
                        <p className="text-sm text-yellow-700">
                          {analytics.conversionRates.applicationToReview < 50
                            ? "Low review rate suggests need for better initial screening"
                            : "Consider automating more of the initial review process"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-800">
                          Recommendation
                        </p>
                        <p className="text-sm text-green-700">
                          Focus recruitment efforts on top-performing
                          departments and sources
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Monthly Predictions */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">
                    Monthly Forecast
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {Math.round(analytics.totalApplications * 1.15)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Projected Applications
                      </div>
                      <div className="text-xs text-green-600 font-medium">
                        +15% growth
                      </div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {Math.round((analytics.statusCounts.Hired || 0) * 1.2)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Projected Hires
                      </div>
                      <div className="text-xs text-green-600 font-medium">
                        +20% growth
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Items */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">
                    Recommended Actions
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>Review slow-moving applications in pipeline</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span>
                        Optimize job postings for underperforming roles
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Increase recruitment focus on LinkedIn</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>
                        Implement automated screening for high-volume roles
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Reports Section */}
        <div className="admin-card rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
                <FileText className="h-5 w-5 text-gray-600" />
                <span>Detailed Reports</span>
              </h3>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm ${getButtonClasses("secondary")}`}
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh Data</span>
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <div className="flex items-center space-x-3 mb-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Candidate Report</span>
                </div>
                <p className="text-sm text-gray-600">
                  Detailed breakdown of all candidates and their journey
                </p>
              </button>

              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <div className="flex items-center space-x-3 mb-2">
                  <Briefcase className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Job Performance</span>
                </div>
                <p className="text-sm text-gray-600">
                  Analysis of individual job posting effectiveness
                </p>
              </button>

              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <div className="flex items-center space-x-3 mb-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <span className="font-medium">Time Analysis</span>
                </div>
                <p className="text-sm text-gray-600">
                  Deep dive into hiring timelines and bottlenecks
                </p>
              </button>

              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <div className="flex items-center space-x-3 mb-2">
                  <Globe className="h-5 w-5 text-purple-600" />
                  <span className="font-medium">Source Analysis</span>
                </div>
                <p className="text-sm text-gray-600">
                  ROI and effectiveness of different recruitment channels
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-center space-x-4 pt-6">
          <button
            onClick={() => router.push("/applications-manager")}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg ${getButtonClasses("secondary")}`}
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            <span>Back to Overview</span>
          </button>
          <button
            onClick={() => router.push("/applications-manager/pipeline")}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg ${getButtonClasses("primary")}`}
          >
            <Layers className="h-4 w-4" />
            <span>View Pipeline</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
