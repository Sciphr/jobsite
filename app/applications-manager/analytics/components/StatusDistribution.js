"use client";

import { motion } from "framer-motion";
import { PieChart } from "lucide-react";

const StatusDistribution = ({ analytics }) => {
  return (
    <div className="admin-card rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
          <PieChart className="h-5 w-5 text-green-600" />
          <span>Application Status</span>
        </h3>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {Object.entries(analytics.statusCounts).map(([status, count]) => {
            const percentage = analytics.totalApplications > 0
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
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${colors[status]}`}></div>
                  <span className="text-sm font-medium text-gray-700">{status}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900">{count}</div>
                  <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StatusDistribution;