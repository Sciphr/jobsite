"use client";

import { motion } from "framer-motion";
import { BarChart3, Filter, Download, ChevronDown, RefreshCw } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";

const AnalyticsHeader = ({
  timeRange,
  setTimeRange,
  selectedDepartment,
  setSelectedDepartment,
  selectedMetric,
  setSelectedMetric,
  showFilters,
  setShowFilters,
  departments,
  handleExportReport
}) => {
  const { getButtonClasses } = useThemeClasses();

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

  const timeRanges = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 3 months" },
    { value: "12m", label: "Last 12 months" },
  ];

  return (
    <motion.div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0"
      >
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold admin-text flex items-center space-x-2 lg:space-x-3">
            <BarChart3 className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600" />
            <span>Analytics Dashboard</span>
          </h1>
          <p className="admin-text-light mt-2 text-sm lg:text-base">
            Comprehensive insights into your hiring performance and trends
          </p>
        </div>
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center space-x-2 px-3 py-2 lg:px-4 lg:py-2 rounded-lg transition-colors text-sm ${getButtonClasses("secondary")}`}
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
            />
          </button>
          <button
            onClick={handleExportReport}
            className={`flex items-center justify-center space-x-2 px-3 py-2 lg:px-4 lg:py-2 rounded-lg transition-colors text-sm ${getButtonClasses("primary")}`}
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
          className="admin-card p-4 lg:p-6 rounded-lg shadow"
        >
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <div>
              <label className="block text-sm font-medium admin-text-light mb-2">
                Time Range
              </label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 admin-text admin-card"
              >
                {timeRanges.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium admin-text-light mb-2">
                Department
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 admin-text admin-card"
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
              <label className="block text-sm font-medium admin-text-light mb-2">
                Metric Focus
              </label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 admin-text admin-card"
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
    </motion.div>
  );
};

export default AnalyticsHeader;