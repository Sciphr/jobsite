"use client";

import { motion } from "framer-motion";
import { Building } from "lucide-react";

const DepartmentPerformance = ({ analytics, selectedMetric }) => {
  if (selectedMetric === "performance") {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="admin-card rounded-lg shadow">
          <div className="p-6 border-b admin-border">
            <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
              <Building className="h-5 w-5 text-indigo-600" />
              <span>Department Performance</span>
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {Object.entries(analytics.departmentStats).map(([dept, stats], index) => (
                <motion.div
                  key={dept}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 border admin-border rounded-lg admin-card"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium admin-text">{dept}</h4>
                    <span className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded admin-text">{stats.jobs} jobs</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center mb-3">
                    <div>
                      <div className="text-xl font-bold text-blue-600">{stats.applications}</div>
                      <div className="text-xs admin-text-light">Applications</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-green-600">{stats.hired}</div>
                      <div className="text-xs admin-text-light">Hired</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-purple-600">
                        {stats.applications > 0 ? ((stats.hired / stats.applications) * 100).toFixed(1) : 0}%
                      </div>
                      <div className="text-xs admin-text-light">Success Rate</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                      style={{ 
                        width: `${stats.applications > 0 ? ((stats.hired / stats.applications) * 100) : 0}%` 
                      }}
                    ></div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="admin-card rounded-lg shadow">
          <div className="p-6 border-b admin-border">
            <h3 className="text-lg font-semibold admin-text">Performance Insights</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h5 className="font-medium text-green-900 dark:text-green-300 mb-2">Top Performer</h5>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {analytics.jobPerformance[0]?.title || "N/A"} leads with {analytics.jobPerformance[0]?.applicationsCount || 0} applications
                </p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h5 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Best Conversion</h5>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Highest hire rate: {Math.max(...analytics.jobPerformance.map(j => j.conversionRate)).toFixed(1)}%
                </p>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <h5 className="font-medium text-yellow-900 dark:text-yellow-300 mb-2">Opportunity</h5>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Focus recruitment efforts on departments with high success rates
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular department performance for overview
  return (
    <motion.div className="admin-card rounded-lg shadow">
      <div className="p-6 border-b admin-border">
        <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
          <Building className="h-5 w-5 text-indigo-600" />
          <span>Department Performance</span>
        </h3>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {Object.entries(analytics.departmentStats).map(([dept, stats], index) => (
            <motion.div
              key={dept}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="p-4 border admin-border rounded-lg admin-card"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium admin-text">{dept}</h4>
                <span className="text-sm admin-text-light">{stats.jobs} jobs</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-lg font-bold text-blue-600">{stats.applications}</div>
                  <div className="text-xs admin-text-light">Applications</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">{stats.hired}</div>
                  <div className="text-xs admin-text-light">Hired</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-purple-600">
                    {stats.applications > 0 ? ((stats.hired / stats.applications) * 100).toFixed(1) : 0}%
                  </div>
                  <div className="text-xs admin-text-light">Success Rate</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default DepartmentPerformance;