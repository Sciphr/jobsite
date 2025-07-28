"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { useApplications, useJobsSimple } from "@/app/hooks/useAdminData";
import { motion } from "framer-motion";
import { ArrowRight, Layers } from "lucide-react";
import { exportAnalyticsWithEmbeddedCharts } from "@/app/utils/excelExportEmbeddedCharts";

// Import all components
import {
  AnalyticsHeader,
  KeyMetricsCards,
  ConversionFunnel,
  StatusDistribution,
  QuickActions,
  JobPerformance,
  DepartmentPerformance,
  SourceAnalysis
} from "./components";

export default function AnalyticsPage() {
  const router = useRouter();
  const { getButtonClasses } = useThemeClasses();

  // Data fetching
  const { data: applications = [] } = useApplications();
  const { data: jobs = [] } = useJobsSimple();

  // State
  const [timeRange, setTimeRange] = useState("30d");
  const [selectedMetric, setSelectedMetric] = useState("overview");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState("all");

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

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    const days = parseInt(timeRange.replace("d", "").replace("m", "")) * (timeRange.includes("m") ? 30 : 1);
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return { startDate, endDate: now };
  };

  // Filter applications by time range and department
  const filteredApplications = useMemo(() => {
    const { startDate } = getDateRange();
    let filtered = applications.filter((app) => new Date(app.appliedAt) >= startDate);

    if (selectedDepartment !== "all") {
      filtered = filtered.filter((app) => app.job?.department === selectedDepartment);
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

    const thisWeekApplications = applications.filter((app) => new Date(app.appliedAt) >= lastWeek);
    const lastWeekApplications = applications.filter((app) => {
      const date = new Date(app.appliedAt);
      return (
        date >= new Date(lastWeek.getTime() - 7 * 24 * 60 * 60 * 1000) &&
        date < lastWeek
      );
    });

    // Calculate trends
    const weeklyGrowth = lastWeekApplications.length > 0
      ? ((thisWeekApplications.length - lastWeekApplications.length) / lastWeekApplications.length) * 100
      : thisWeekApplications.length > 0 ? 100 : 0;

    // Conversion funnel
    const totalApplications = filteredApplications.length;
    const reviewing = statusCounts.Reviewing || 0;
    const interviewing = statusCounts.Interview || 0;
    const hired = statusCounts.Hired || 0;

    // Department breakdown
    const departmentStats = filteredJobs.reduce((acc, job) => {
      const dept = job.department;
      if (!acc[dept]) {
        acc[dept] = { jobs: 0, applications: 0, hired: 0 };
      }
      acc[dept].jobs++;

      const deptApplications = filteredApplications.filter((app) => app.job?.department === dept);
      acc[dept].applications = deptApplications.length;
      acc[dept].hired = deptApplications.filter((app) => app.status === "Hired").length;

      return acc;
    }, {});

    // Top performing jobs
    const jobPerformance = filteredJobs
      .map((job) => {
        const jobApplications = filteredApplications.filter((app) => app.jobId === job.id);
        const hiredCount = jobApplications.filter((app) => app.status === "Hired").length;

        return {
          ...job,
          applicationsCount: jobApplications.length,
          hiredCount,
          conversionRate: jobApplications.length > 0 ? (hiredCount / jobApplications.length) * 100 : 0,
          avgTimeToHire: Math.floor(Math.random() * 20) + 10, // Mock data
        };
      })
      .sort((a, b) => b.applicationsCount - a.applicationsCount);

    // Source analysis (mock data)
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
        applicationToReview: totalApplications > 0 ? (reviewing / totalApplications) * 100 : 0,
        reviewToInterview: reviewing > 0 ? (interviewing / reviewing) * 100 : 0,
        interviewToHire: interviewing > 0 ? (hired / interviewing) * 100 : 0,
        overallConversion: totalApplications > 0 ? (hired / totalApplications) * 100 : 0,
      },
      departmentStats,
      jobPerformance: jobPerformance.slice(0, 5),
      sourceAnalysis,
      timeToHire: { average: 14, fastest: 7, slowest: 28, median: 12 },
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
      const filename = await exportAnalyticsWithEmbeddedCharts(analytics, timeRange, selectedDepartment);
      console.log(`Report exported successfully: ${filename}`);
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-4 lg:space-y-6"
    >
      <motion.div className="space-y-4 lg:space-y-6">
        {/* Header with Filters */}
        <AnalyticsHeader
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          selectedDepartment={selectedDepartment}
          setSelectedDepartment={setSelectedDepartment}
          selectedMetric={selectedMetric}
          setSelectedMetric={setSelectedMetric}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          departments={departments}
          handleExportReport={handleExportReport}
        />

        {/* Key Metrics Cards */}
        <KeyMetricsCards analytics={analytics} />

        {/* Main Content Based on Selected Metric */}
        {selectedMetric === "overview" && (
          <div className="space-y-4 lg:space-y-6">
            {/* Conversion Funnel and Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              <ConversionFunnel analytics={analytics} selectedMetric={selectedMetric} />
              <div className="space-y-4 lg:space-y-6">
                <StatusDistribution analytics={analytics} />
                <QuickActions />
              </div>
            </div>

            {/* Performance Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <JobPerformance analytics={analytics} selectedMetric={selectedMetric} />
              <DepartmentPerformance analytics={analytics} selectedMetric={selectedMetric} />
            </div>

            {/* Source Analysis */}
            <SourceAnalysis analytics={analytics} selectedMetric={selectedMetric} />
          </div>
        )}

        {/* Focused Views */}
        {selectedMetric === "conversion" && (
          <ConversionFunnel analytics={analytics} selectedMetric={selectedMetric} />
        )}

        {selectedMetric === "performance" && (
          <div className="space-y-4 lg:space-y-6">
            <JobPerformance analytics={analytics} selectedMetric={selectedMetric} />
            <DepartmentPerformance analytics={analytics} selectedMetric={selectedMetric} />
          </div>
        )}

        {selectedMetric === "sources" && (
          <SourceAnalysis analytics={analytics} selectedMetric={selectedMetric} />
        )}

        {/* Footer Actions */}
        <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-center sm:space-y-0 sm:space-x-4 pt-6">
          <button
            onClick={() => router.push("/applications-manager")}
            className={`flex items-center justify-center space-x-2 px-4 py-2 lg:px-6 lg:py-3 rounded-lg text-sm ${getButtonClasses("secondary")}`}
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            <span>Back to Overview</span>
          </button>
          <button
            onClick={() => router.push("/applications-manager/pipeline")}
            className={`flex items-center justify-center space-x-2 px-4 py-2 lg:px-6 lg:py-3 rounded-lg text-sm ${getButtonClasses("primary")}`}
          >
            <Layers className="h-4 w-4" />
            <span>View Pipeline</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}