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
    </motion.div>
  );
};

export default AnalyticsHeader;