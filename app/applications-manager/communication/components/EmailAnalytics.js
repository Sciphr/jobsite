"use client";

import { motion } from "framer-motion";
import { 
  Download, 
  Send, 
  CheckCircle, 
  Eye, 
  ExternalLink, 
  TrendingUp, 
  BarChart3 
} from "lucide-react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";

export default function EmailAnalytics({ emailAnalytics, emailTemplates }) {
  const { getButtonClasses } = useThemeClasses();

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
        <h3 className="text-lg font-semibold">Email Analytics</h3>
        <div className="flex items-center space-x-2">
          <select className="px-3 py-1 border border-gray-300 rounded text-sm">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 3 months</option>
          </select>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm ${getButtonClasses("secondary")}`}
          >
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </motion.button>
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
            className="bg-white border border-gray-200 rounded-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              </div>
              <div
                className={`p-3 rounded-lg ${
                  metric.color === 'blue' ? 'bg-blue-100' :
                  metric.color === 'green' ? 'bg-green-100' :
                  metric.color === 'purple' ? 'bg-purple-100' :
                  metric.color === 'orange' ? 'bg-orange-100' :
                  'bg-gray-100'
                }`}
              >
                <metric.icon
                  className={`h-6 w-6 ${
                    metric.color === 'blue' ? 'text-blue-600' :
                    metric.color === 'green' ? 'text-green-600' :
                    metric.color === 'purple' ? 'text-purple-600' :
                    metric.color === 'orange' ? 'text-orange-600' :
                    'text-gray-600'
                  }`}
                />
              </div>
            </div>
            {metric.trend && (
              <div className="mt-4 flex items-center">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">{metric.trend}</span>
              </div>
            )}
            {metric.subtitle && (
              <div className="mt-4">
                <span className="text-sm text-gray-600">{metric.subtitle}</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Charts placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold mb-4">Email Performance Over Time</h4>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>Chart placeholder - Email performance timeline</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold mb-4">Template Performance</h4>
          <div className="space-y-4">
            {emailTemplates.slice(0, 3).map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{template.name}</p>
                  <p className="text-sm text-gray-500">
                    {Math.floor(Math.random() * 50) + 20} emails sent
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    {Math.floor(Math.random() * 30) + 60}%
                  </p>
                  <p className="text-xs text-gray-500">open rate</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}