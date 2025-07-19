"use client";

import { motion } from "framer-motion";
import { Building } from "lucide-react";

const DepartmentPerformance = ({ analytics, selectedMetric }) => {
  if (selectedMetric === "performance") {
    return (
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
              {Object.entries(analytics.departmentStats).map(([dept, stats], index) => (
                <motion.div
                  key={dept}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{dept}</h4>
                    <span className="text-sm bg-gray-100 px-2 py-1 rounded">{stats.jobs} jobs</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center mb-3">
                    <div>
                      <div className="text-xl font-bold text-blue-600">{stats.applications}</div>
                      <div className="text-xs text-gray-500">Applications</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-green-600">{stats.hired}</div>
                      <div className="text-xs text-gray-500">Hired</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-purple-600">
                        {stats.applications > 0 ? ((stats.hired / stats.applications) * 100).toFixed(1) : 0}%
                      </div>
                      <div className="text-xs text-gray-500">Success Rate</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
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
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold admin-text">Performance Insights</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h5 className="font-medium text-green-900 mb-2">Top Performer</h5>
                <p className="text-sm text-green-700">
                  {analytics.jobPerformance[0]?.title || "N/A"} leads with {analytics.jobPerformance[0]?.applicationsCount || 0} applications
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h5 className="font-medium text-blue-900 mb-2">Best Conversion</h5>
                <p className="text-sm text-blue-700">
                  Highest hire rate: {Math.max(...analytics.jobPerformance.map(j => j.conversionRate)).toFixed(1)}%
                </p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h5 className="font-medium text-yellow-900 mb-2">Opportunity</h5>
                <p className="text-sm text-yellow-700">
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
      <div className="p-6 border-b border-gray-200">
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
              className="p-4 border border-gray-200 rounded-lg"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">{dept}</h4>
                <span className="text-sm text-gray-500">{stats.jobs} jobs</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-lg font-bold text-blue-600">{stats.applications}</div>
                  <div className="text-xs text-gray-500">Applications</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">{stats.hired}</div>
                  <div className="text-xs text-gray-500">Hired</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-purple-600">
                    {stats.applications > 0 ? ((stats.hired / stats.applications) * 100).toFixed(1) : 0}%
                  </div>
                  <div className="text-xs text-gray-500">Success Rate</div>
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