"use client";

import { motion } from "framer-motion";
import { Activity, PieChart, AlertTriangle, Timer, CheckCircle } from "lucide-react";

const ConversionFunnel = ({ analytics, selectedMetric }) => {
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

  if (selectedMetric === "conversion") {
    return (
      <div className="space-y-6">
        {/* Detailed Conversion Funnel */}
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
                  <h4 className="font-medium text-gray-900 mb-4">Conversion Stages</h4>
                  
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Applications Received</span>
                      <span className="text-sm font-bold text-gray-900">{analytics.totalApplications}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div className="bg-blue-600 h-4 rounded-full" style={{ width: "100%" }}></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">100% of total volume</div>
                  </div>

                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Under Review</span>
                      <span className="text-sm font-bold text-gray-900">
                        {analytics.statusCounts.Reviewing || 0} ({analytics.conversionRates.applicationToReview.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${analytics.conversionRates.applicationToReview}%` }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="bg-yellow-500 h-4 rounded-full"
                      ></motion.div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Drop-off: {(100 - analytics.conversionRates.applicationToReview).toFixed(1)}%
                    </div>
                  </div>

                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Interview Stage</span>
                      <span className="text-sm font-bold text-gray-900">
                        {analytics.statusCounts.Interview || 0} ({analytics.conversionRates.reviewToInterview.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${analytics.conversionRates.reviewToInterview}%` }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="bg-green-500 h-4 rounded-full"
                      ></motion.div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      From previous stage: {analytics.conversionRates.reviewToInterview.toFixed(1)}%
                    </div>
                  </div>

                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Hired</span>
                      <span className="text-sm font-bold text-gray-900">
                        {analytics.statusCounts.Hired || 0} ({analytics.conversionRates.interviewToHire.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${analytics.conversionRates.interviewToHire}%` }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                        className="bg-emerald-600 h-4 rounded-full"
                      ></motion.div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Final conversion: {analytics.conversionRates.overallConversion.toFixed(1)}% overall
                    </div>
                  </div>
                </div>

                {/* Conversion Insights */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Conversion Insights</h4>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h5 className="font-medium text-blue-900 mb-2">Overall Performance</h5>
                      <div className="text-2xl font-bold text-blue-600 mb-1">
                        {analytics.conversionRates.overallConversion.toFixed(1)}%
                      </div>
                      <div className="text-sm text-blue-700">End-to-end conversion rate</div>
                    </div>

                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <h5 className="font-medium text-yellow-900 mb-2">Biggest Bottleneck</h5>
                      <div className="text-sm text-yellow-700">
                        {analytics.conversionRates.applicationToReview < analytics.conversionRates.reviewToInterview
                          ? "Application screening - many applications not progressing to review"
                          : "Interview process - review stage has good throughput but interview conversion is low"}
                      </div>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg">
                      <h5 className="font-medium text-green-900 mb-2">Strongest Stage</h5>
                      <div className="text-sm text-green-700">
                        Interview to hire conversion is performing well at {analytics.conversionRates.interviewToHire.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Status Distribution and Recommendations */}
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
                {Object.entries(analytics.statusCounts).map(([status, count]) => {
                  const percentage = analytics.totalApplications > 0 ? (count / analytics.totalApplications) * 100 : 0;
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
                          <div className={`w-4 h-4 rounded-full ${colors[status]}`}></div>
                          <span className="text-sm font-medium text-gray-700">{status}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">{count}</div>
                          <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
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
                })}
              </div>
            </div>
          </div>

          <div className="admin-card rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold admin-text">Conversion Recommendations</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Priority Action</p>
                  <p className="text-sm text-red-700">
                    Focus on improving {analytics.conversionRates.applicationToReview < 50 ? "initial screening process" : "interview scheduling"}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                <Timer className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">Time Optimization</p>
                  <p className="text-sm text-yellow-700">
                    Reduce time between application and first review to improve candidate experience
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">Success Pattern</p>
                  <p className="text-sm text-green-700">
                    Candidates who reach interview stage have a {analytics.conversionRates.interviewToHire.toFixed(1)}% hire rate
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular funnel for overview mode
  return (
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
                <span className="text-sm font-medium text-gray-700">Applications Received</span>
                <span className="text-sm font-bold text-gray-900">{analytics.totalApplications}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-blue-600 h-3 rounded-full" style={{ width: "100%" }}></div>
              </div>
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Under Review</span>
                <span className="text-sm font-bold text-gray-900">
                  {analytics.statusCounts.Reviewing || 0} ({analytics.conversionRates.applicationToReview.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${analytics.conversionRates.applicationToReview}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="bg-yellow-500 h-3 rounded-full"
                ></motion.div>
              </div>
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Interview Stage</span>
                <span className="text-sm font-bold text-gray-900">
                  {analytics.statusCounts.Interview || 0} ({analytics.conversionRates.reviewToInterview.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${analytics.conversionRates.reviewToInterview}%` }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="bg-green-500 h-3 rounded-full"
                ></motion.div>
              </div>
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Hired</span>
                <span className="text-sm font-bold text-gray-900">
                  {analytics.statusCounts.Hired || 0} ({analytics.conversionRates.interviewToHire.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${analytics.conversionRates.interviewToHire}%` }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  className="bg-emerald-600 h-3 rounded-full"
                ></motion.div>
              </div>
            </div>
          </div>

          {/* Funnel Insights */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Funnel Insights</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-blue-700">Biggest drop-off:</span>
                <span className="font-medium text-blue-900">
                  {analytics.conversionRates.applicationToReview < analytics.conversionRates.reviewToInterview
                    ? "Application → Review"
                    : "Review → Interview"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-700">Strongest conversion:</span>
                <span className="font-medium text-blue-900">Interview → Hire</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ConversionFunnel;