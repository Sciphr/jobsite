"use client";

import { motion } from "framer-motion";
import { Globe } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";

const SourceAnalysis = ({ analytics, selectedMetric }) => {
  const { getStatCardClasses } = useThemeClasses();

  if (selectedMetric === "sources") {
    return (
      <div className="space-y-6">
        {/* Enhanced Source Analysis */}
        <div className="admin-card rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
              <Globe className="h-5 w-5 text-cyan-600" />
              <span>Recruitment Source Analysis</span>
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {analytics.sourceAnalysis.map((source, index) => (
                <motion.div
                  key={source.source}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -4 }}
                  className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-all"
                >
                  <div className="text-center mb-4">
                    <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-3 ${getStatCardClasses(index % 4).bg}`}>
                      <Globe className={`h-8 w-8 ${getStatCardClasses(index % 4).icon}`} />
                    </div>
                    <h4 className="font-semibold text-gray-900">{source.source}</h4>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900">{source.applications}</div>
                      <div className="text-sm text-gray-500">Total Applications</div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium text-green-800">Hired</span>
                      <span className="text-lg font-bold text-green-600">{source.hired}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium text-blue-800">Success Rate</span>
                      <span className="text-lg font-bold text-blue-600">
                        {source.applications > 0 ? ((source.hired / source.applications) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-3 rounded-full"
                        style={{ 
                          width: `${source.applications > 0 ? ((source.hired / source.applications) * 100) : 0}%` 
                        }}
                      ></div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-xs text-gray-500">
                        {((source.applications / analytics.totalApplications) * 100).toFixed(1)}% of total volume
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Source Performance Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="admin-card rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold admin-text">Source Performance Ranking</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {analytics.sourceAnalysis
                  .sort((a, b) => (b.hired / b.applications) - (a.hired / a.applications))
                  .map((source, index) => {
                    const successRate = source.applications > 0 ? (source.hired / source.applications) * 100 : 0;
                    return (
                      <div key={source.source} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-yellow-100 text-yellow-800' :
                            index === 1 ? 'bg-gray-100 text-gray-800' :
                            index === 2 ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{source.source}</div>
                            <div className="text-sm text-gray-500">{source.applications} applications</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">{successRate.toFixed(1)}%</div>
                          <div className="text-sm text-gray-500">{source.hired} hired</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          <div className="admin-card rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold admin-text">Source Optimization</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h5 className="font-medium text-green-900 mb-2">High Performer</h5>
                <p className="text-sm text-green-700">
                  LinkedIn shows the best conversion rate - consider increasing investment here
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h5 className="font-medium text-blue-900 mb-2">Volume Leader</h5>
                <p className="text-sm text-blue-700">
                  Company Website generates the most applications - optimize the career page
                </p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h5 className="font-medium text-yellow-900 mb-2">Underutilized</h5>
                <p className="text-sm text-yellow-700">
                  Referrals have good conversion but low volume - expand referral program
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h5 className="font-medium text-purple-900 mb-2">Cost Analysis</h5>
                <p className="text-sm text-purple-700">
                  Focus budget on high-conversion, low-cost channels for better ROI
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular source analysis for overview
  return (
    <div className="admin-card rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
          <Globe className="h-5 w-5 text-cyan-600" />
          <span>Application Sources</span>
        </h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {analytics.sourceAnalysis.map((source, index) => (
            <motion.div
              key={source.source}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05, y: -2 }}
              className="text-center"
            >
              <div className="mb-4">
                <div
                  className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${getStatCardClasses(index % 4).bg}`}
                >
                  <Globe
                    className={`h-8 w-8 ${getStatCardClasses(index % 4).icon}`}
                  />
                </div>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">{source.source}</h4>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-gray-900">{source.applications}</div>
                <div className="text-sm text-gray-500">applications</div>
                <div className="text-sm font-medium text-green-600">{source.hired} hired</div>
                <div className="text-xs text-gray-500">
                  {source.applications > 0
                    ? ((source.hired / source.applications) * 100).toFixed(1)
                    : 0}
                  % success
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SourceAnalysis;