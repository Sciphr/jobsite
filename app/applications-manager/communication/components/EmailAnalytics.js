"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { 
  Download, 
  Send, 
  CheckCircle, 
  Eye, 
  ExternalLink, 
  TrendingUp, 
  BarChart3,
  ChevronDown 
} from "lucide-react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { useEmailAnalyticsExport } from "@/app/hooks/useCommunicationData";

export default function EmailAnalytics({ emailAnalytics, emailTemplates }) {
  const { getButtonClasses } = useThemeClasses();
  const { exportAnalytics, loading: exportLoading, error: exportError } = useEmailAnalyticsExport();
  
  // Local state for export functionality
  const [selectedTimeRange, setSelectedTimeRange] = useState("30d");
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle export functionality
  const handleExport = async (format) => {
    try {
      await exportAnalytics(selectedTimeRange, format);
      setShowExportDropdown(false);
    } catch (error) {
      console.error("Export failed:", error);
      alert(`Export failed: ${error.message}`);
    }
  };

  const handleTimeRangeChange = (e) => {
    setSelectedTimeRange(e.target.value);
  };

  const metrics = [
    {
      label: "Total Sent",
      value: emailAnalytics.totalSent,
      icon: Send,
      color: "blue",
      trend: "+12% from last week",
    },
    {
      label: "Delivered",
      value: emailAnalytics.delivered,
      icon: CheckCircle,
      color: "green",
      subtitle: `${emailAnalytics.deliveryRate}% delivery rate`,
    },
    {
      label: "Opened",
      value: emailAnalytics.opened,
      icon: Eye,
      color: "purple",
      subtitle: `${emailAnalytics.openRate}% open rate`,
    },
    {
      label: "Clicked",
      value: emailAnalytics.clicked,
      icon: ExternalLink,
      color: "orange",
      subtitle: `${emailAnalytics.clickRate}% click rate`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold admin-text">Email Analytics</h3>
        <div className="flex items-center space-x-2">
          <select 
            value={selectedTimeRange}
            onChange={handleTimeRangeChange}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 admin-text admin-card"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 3 months</option>
            <option value="1y">Last year</option>
          </select>
          
          {/* Export Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              disabled={exportLoading}
              className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm ${getButtonClasses("secondary")} disabled:opacity-50`}
            >
              {exportLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>{exportLoading ? "Exporting..." : "Export Report"}</span>
              <ChevronDown className="h-4 w-4" />
            </motion.button>

            {/* Dropdown Menu */}
            {showExportDropdown && !exportLoading && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 mt-2 w-48 admin-card border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10"
              >
                <div className="py-1">
                  <button
                    onClick={() => handleExport('xlsx')}
                    className="block w-full text-left px-4 py-2 text-sm admin-text hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <Download className="h-4 w-4" />
                      <span>Download as Excel (.xlsx)</span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="block w-full text-left px-4 py-2 text-sm admin-text hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <Download className="h-4 w-4" />
                      <span>Download as CSV (.csv)</span>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            className="admin-card border border-gray-200 dark:border-gray-600 rounded-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium admin-text-light">{metric.label}</p>
                <p className="text-2xl font-bold admin-text">{metric.value}</p>
              </div>
              <div
                className={`p-3 rounded-lg ${
                  metric.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/20' :
                  metric.color === 'green' ? 'bg-green-100 dark:bg-green-900/20' :
                  metric.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/20' :
                  metric.color === 'orange' ? 'bg-orange-100 dark:bg-orange-900/20' :
                  'bg-gray-100 dark:bg-gray-700'
                }`}
              >
                <metric.icon
                  className={`h-6 w-6 ${
                    metric.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                    metric.color === 'green' ? 'text-green-600 dark:text-green-400' :
                    metric.color === 'purple' ? 'text-purple-600 dark:text-purple-400' :
                    metric.color === 'orange' ? 'text-orange-600 dark:text-orange-400' :
                    'admin-text-light'
                  }`}
                />
              </div>
            </div>
            {metric.trend && (
              <div className="mt-4 flex items-center">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600 dark:text-green-400">{metric.trend}</span>
              </div>
            )}
            {metric.subtitle && (
              <div className="mt-4">
                <span className="text-sm admin-text-light">{metric.subtitle}</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Charts placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="admin-card border admin-border rounded-lg p-6">
          <h4 className="text-lg font-semibold mb-4 admin-text">Email Performance Over Time</h4>
          <div className="h-64 flex items-center justify-center admin-text-light">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 admin-text-light" />
              <p>Chart placeholder - Email performance timeline</p>
            </div>
          </div>
        </div>

        <div className="admin-card border admin-border rounded-lg p-6">
          <h4 className="text-lg font-semibold mb-4 admin-text">Template Performance</h4>
          <div className="space-y-4">
            {emailTemplates.slice(0, 3).map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className="flex items-center justify-between p-3 admin-card rounded-lg"
              >
                <div>
                  <p className="font-medium admin-text">{template.name}</p>
                  <p className="text-sm admin-text-light">
                    {Math.floor(Math.random() * 50) + 20} emails sent
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium admin-text">
                    {Math.floor(Math.random() * 30) + 60}%
                  </p>
                  <p className="text-xs admin-text-light">open rate</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}