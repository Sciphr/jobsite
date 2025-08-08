"use client";

import { motion } from "framer-motion";
import { 
  FileText, 
  Search, 
  Eye, 
  TrendingUp,
  Clock,
  Target,
  Zap,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Hash,
  Globe
} from "lucide-react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";

export default function ContentTab({ analyticsData }) {
  const { getStatCardClasses } = useThemeClasses();

  // Format numbers with commas
  const formatNumber = (num) => {
    if (num === undefined || num === null) return "0";
    return new Intl.NumberFormat().format(num);
  };

  // Format percentage
  const formatPercentage = (num) => {
    if (num === undefined || num === null) return "0%";
    return `${Math.round(num * 100) / 100}%`;
  };

  // Format duration
  const formatDuration = (seconds) => {
    if (!seconds) return "0s";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
  };

  // Clean page title for display
  const cleanPageTitle = (title, path) => {
    if (!title || title === "(not set)") {
      // Generate title from path
      if (path === '/') return 'Homepage';
      if (path.includes('/jobs/')) return 'Job Page: ' + path.replace('/jobs/', '').replace(/-/g, ' ');
      return path.charAt(1).toUpperCase() + path.slice(2).replace(/[-_]/g, ' ');
    }
    return title.replace(/^\(not set\)|\s+\|\s+.*$/, "").trim() || "Untitled Page";
  };

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

  const topPages = analyticsData?.topPages || [];
  const trafficSources = analyticsData?.trafficSources || [];

  // Calculate content insights
  const totalPageViews = topPages.reduce((sum, page) => sum + page.pageViews, 0);
  const avgBounceRate = topPages.length > 0 
    ? topPages.reduce((sum, page) => sum + page.bounceRate, 0) / topPages.length
    : 0;
  const avgTimeOnPage = topPages.length > 0 
    ? topPages.reduce((sum, page) => sum + page.avgTimeOnPage, 0) / topPages.length
    : 0;

  // Categorize pages
  const jobPages = topPages.filter(page => page.path.includes('/jobs'));
  const otherPages = topPages.filter(page => !page.path.includes('/jobs'));
  const searchTraffic = trafficSources.filter(source => 
    source.source.toLowerCase().includes('search') || 
    source.source.toLowerCase().includes('google') ||
    source.source.toLowerCase().includes('bing')
  );

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {topPages.length === 0 ? (
        <motion.div variants={itemVariants} className="text-center py-12">
          <div className="admin-card rounded-lg p-8 max-w-md mx-auto">
            <FileText className="h-16 w-16 admin-text-light mx-auto mb-4" />
            <h3 className="text-lg font-semibold admin-text mb-2">No Content Data</h3>
            <p className="admin-text-light">
              No content performance data available for the selected time period. This may take some time to populate.
            </p>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Content Overview Cards */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className={`admin-card rounded-lg p-4 lg:p-6 shadow-sm ${getStatCardClasses(0).hover}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm admin-text-light font-medium">Total Pages</p>
                  <p className="text-xl lg:text-2xl font-bold admin-text mt-1">{topPages.length}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-900/20">
                  <FileText className="h-5 w-5 lg:h-6 lg:w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className={`admin-card rounded-lg p-4 lg:p-6 shadow-sm ${getStatCardClasses(1).hover}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm admin-text-light font-medium">Job Content</p>
                  <p className="text-xl lg:text-2xl font-bold admin-text mt-1">{jobPages.length}</p>
                </div>
                <div className="p-3 rounded-full bg-green-50 dark:bg-green-900/20">
                  <Hash className="h-5 w-5 lg:h-6 lg:w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className={`admin-card rounded-lg p-4 lg:p-6 shadow-sm ${getStatCardClasses(2).hover}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm admin-text-light font-medium">Avg. Bounce Rate</p>
                  <p className="text-xl lg:text-2xl font-bold admin-text mt-1">{formatPercentage(avgBounceRate)}</p>
                </div>
                <div className="p-3 rounded-full bg-orange-50 dark:bg-orange-900/20">
                  <TrendingUp className="h-5 w-5 lg:h-6 lg:w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className={`admin-card rounded-lg p-4 lg:p-6 shadow-sm ${getStatCardClasses(3).hover}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm admin-text-light font-medium">Avg. Time on Page</p>
                  <p className="text-xl lg:text-2xl font-bold admin-text mt-1">{formatDuration(avgTimeOnPage)}</p>
                </div>
                <div className="p-3 rounded-full bg-purple-50 dark:bg-purple-900/20">
                  <Clock className="h-5 w-5 lg:h-6 lg:w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Content & Search Insights */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="admin-card rounded-lg p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold admin-text">Top Performer</h3>
              </div>
              {topPages[0] && (
                <div>
                  <p className="font-medium admin-text text-sm mb-2">{cleanPageTitle(topPages[0].title, topPages[0].path)}</p>
                  <div className="space-y-1 text-xs admin-text-light">
                    <div className="flex justify-between">
                      <span>Page Views:</span>
                      <span className="font-medium">{formatNumber(topPages[0].pageViews)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bounce Rate:</span>
                      <span className="font-medium">{formatPercentage(topPages[0].bounceRate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg. Time:</span>
                      <span className="font-medium">{formatDuration(topPages[0].avgTimeOnPage)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="admin-card rounded-lg p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold admin-text">Search Traffic</h3>
              </div>
              <div className="space-y-3">
                {searchTraffic.slice(0, 3).map((source, index) => (
                  <div key={source.source} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: source.color }}
                      ></div>
                      <span className="text-sm admin-text font-medium">{source.source}</span>
                    </div>
                    <span className="text-sm admin-text">{formatPercentage(source.percentage)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-card rounded-lg p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold admin-text">Content Stats</h3>
              </div>
              <div className="space-y-2 text-sm admin-text-light">
                <div className="flex justify-between">
                  <span>Job pages:</span>
                  <span className="font-medium">{formatPercentage((jobPages.length / topPages.length) * 100)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Best performer views:</span>
                  <span className="font-medium">{formatNumber(topPages[0]?.pageViews || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Lowest bounce rate:</span>
                  <span className="font-medium text-green-600">{formatPercentage(Math.min(...topPages.map(p => p.bounceRate)))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Search traffic:</span>
                  <span className="font-medium">{formatPercentage(searchTraffic.reduce((sum, s) => sum + s.percentage, 0))}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Top Content Performance Table */}
          <motion.div variants={itemVariants} className="admin-card rounded-lg shadow-sm">
            <div className="p-4 lg:p-6 border-b admin-border">
              <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
                <Zap className="h-5 w-5 text-indigo-600" />
                <span>Content Performance</span>
              </h3>
              <p className="text-sm admin-text-light mt-1">Individual page performance metrics and user engagement</p>
            </div>
            <div className="p-4 lg:p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="border-b admin-border">
                    <tr>
                      <th className="text-left py-3 admin-text font-medium">Page Title</th>
                      <th className="text-right py-3 admin-text font-medium">Views</th>
                      <th className="text-right py-3 admin-text font-medium">% of Total</th>
                      <th className="text-right py-3 admin-text font-medium">Bounce Rate</th>
                      <th className="text-right py-3 admin-text font-medium">Avg. Time</th>
                      <th className="text-right py-3 admin-text font-medium">Quality</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPages.slice(0, 10).map((page, index) => {
                      const viewPercentage = totalPageViews > 0 ? (page.pageViews / totalPageViews) * 100 : 0;
                      const isGoodBounceRate = page.bounceRate < avgBounceRate;
                      const isLongTime = page.avgTimeOnPage > avgTimeOnPage;
                      
                      // Quality score based on bounce rate and time on page
                      let qualityScore = 'Poor';
                      let qualityColor = 'text-red-600';
                      
                      if (isGoodBounceRate && isLongTime) {
                        qualityScore = 'Excellent';
                        qualityColor = 'text-green-600';
                      } else if (isGoodBounceRate || isLongTime) {
                        qualityScore = 'Good';
                        qualityColor = 'text-yellow-600';
                      }
                      
                      return (
                        <motion.tr
                          key={page.path}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b last:border-b-0 admin-border hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <td className="py-3 pr-4">
                            <div>
                              <p className="font-medium admin-text text-sm line-clamp-2">{cleanPageTitle(page.title, page.path)}</p>
                              <p className="text-xs admin-text-light truncate">{page.path}</p>
                            </div>
                          </td>
                          <td className="py-3 text-right font-semibold admin-text">{formatNumber(page.pageViews)}</td>
                          <td className="py-3 text-right admin-text">{viewPercentage.toFixed(1)}%</td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              {isGoodBounceRate ? (
                                <ArrowDownRight className="h-3 w-3 text-green-600" />
                              ) : (
                                <ArrowUpRight className="h-3 w-3 text-red-600" />
                              )}
                              <span className={`font-medium ${isGoodBounceRate ? 'text-green-600' : 'text-red-600'}`}>
                                {formatPercentage(page.bounceRate)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 text-right admin-text">{formatDuration(page.avgTimeOnPage)}</td>
                          <td className="py-3 text-right">
                            <span className={`font-medium text-sm ${qualityColor}`}>
                              {qualityScore}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {topPages.length > 10 && (
                <div className="mt-4 text-center">
                  <p className="text-sm admin-text-light">
                    Showing top 10 pages. Total: {topPages.length} pages tracked
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Search Traffic Sources */}
          {searchTraffic.length > 0 && (
            <motion.div variants={itemVariants} className="admin-card rounded-lg shadow-sm">
              <div className="p-4 lg:p-6 border-b admin-border">
                <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
                  <Search className="h-5 w-5 text-green-600" />
                  <span>Search Traffic Sources</span>
                </h3>
                <p className="text-sm admin-text-light mt-1">How users find your content through search engines</p>
              </div>
              <div className="p-4 lg:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchTraffic.map((source, index) => (
                    <div key={source.source} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: source.color }}
                        ></div>
                        <div>
                          <p className="font-medium admin-text text-sm">{source.source}</p>
                          <p className="text-xs admin-text-light">{formatNumber(source.sessions)} sessions</p>
                        </div>
                      </div>
                      <div className="text-sm font-semibold admin-text">
                        {formatPercentage(source.percentage)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}