"use client";

import { motion } from "framer-motion";
import { Award } from "lucide-react";
import { useRouter } from "next/navigation";

const JobPerformance = ({ analytics, selectedMetric }) => {
  const router = useRouter();

  if (selectedMetric === "performance") {
    return (
      <div className="admin-card rounded-lg shadow">
        <div className="p-6 border-b admin-border">
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
                className="p-6 border admin-border rounded-lg hover:shadow-lg transition-all cursor-pointer admin-card"
                onClick={() => router.push(`/applications-manager/jobs/${job.id}`)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded-full flex items-center justify-center text-lg font-bold">
                    {index + 1}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold admin-text">{job.applicationsCount}</div>
                    <div className="text-xs admin-text-light">applications</div>
                  </div>
                </div>
                <h4 className="font-semibold admin-text mb-2">{job.title}</h4>
                <p className="text-sm admin-text-light mb-4">{job.department}</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm admin-text-light">Hire Rate</span>
                    <span className="font-medium text-green-600">{job.conversionRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm admin-text-light">Hired</span>
                    <span className="font-medium admin-text">{job.hiredCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm admin-text-light">Avg. Time</span>
                    <span className="font-medium admin-text">{job.avgTimeToHire} days</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Regular job performance for overview
  return (
    <div className="admin-card rounded-lg shadow">
      <div className="p-6 border-b admin-border">
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
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
              onClick={() => router.push(`/applications-manager/jobs/${job.id}`)}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <div>
                  <h4 className="font-medium admin-text">{job.title}</h4>
                  <p className="text-sm admin-text-light">{job.department}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold admin-text">{job.applicationsCount}</div>
                <div className="text-xs admin-text-light">applications</div>
                <div className="text-xs text-green-600 font-medium">
                  {job.conversionRate.toFixed(1)}% hire rate
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default JobPerformance;