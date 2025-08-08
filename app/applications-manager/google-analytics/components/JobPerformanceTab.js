"use client";

import { motion } from "framer-motion";
import {
  Briefcase,
  Eye,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  Trophy,
  Target,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
} from "lucide-react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";

export default function JobPerformanceTab({ analyticsData }) {
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
    return minutes > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${remainingSeconds}s`;
  };

  // Extract job ID from path
  const extractJobId = (path) => {
    const match = path.match(/\/jobs\/([^\/]+)/);
    return match ? match[1] : null;
  };

  // Clean job title
  const cleanJobTitle = (title) => {
    if (!title || title === "(not set)") return "Unknown Job";
    return (
      title.replace(/^\(not set\)|\s+\|\s+.*$/, "").trim() || "Unknown Job"
    );
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

  const jobPerformance = analyticsData?.jobPerformance || [];
  const topJobs = jobPerformance.slice(0, 10);

  // Calculate performance metrics
  const totalJobViews = jobPerformance.reduce(
    (sum, job) => sum + job.pageViews,
    0
  );
  const avgBounceRate =
    jobPerformance.length > 0
      ? jobPerformance.reduce((sum, job) => sum + job.bounceRate, 0) /
        jobPerformance.length
      : 0;
  const avgEngagement =
    jobPerformance.length > 0
      ? jobPerformance.reduce((sum, job) => sum + job.engagementDuration, 0) /
        jobPerformance.length
      : 0;

  // Identify top and bottom performers
  const bestPerformer = jobPerformance.length > 0 ? jobPerformance[0] : null;
  const worstBounceRate =
    jobPerformance.length > 0
      ? jobPerformance.reduce((worst, job) =>
          job.bounceRate > worst.bounceRate ? job : worst
        )
      : null;

  return (
    <motion.div initial="hidden" animate="visible" className="space-y-6">
      {jobPerformance.length === 0 ? (
        <motion.div variants={itemVariants} className="text-center py-12">
          <div className="admin-card rounded-lg p-8 max-w-md mx-auto">
            <Briefcase className="h-16 w-16 admin-text-light mx-auto mb-4" />
            <h3 className="text-lg font-semibold admin-text mb-2">
              No Job Data Found
            </h3>
            <p className="admin-text-light">
              No job page analytics data available for the selected time period.
              Make sure your job pages include '/jobs/' in the URL path.
            </p>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Performance Summary Cards */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6"
          >
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className={`admin-card rounded-lg p-4 lg:p-6 shadow-sm ${getStatCardClasses(0).hover}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm admin-text-light font-medium">
                    Total Job Views
                  </p>
                  <p className="text-xl lg:text-2xl font-bold admin-text mt-1">
                    {formatNumber(totalJobViews)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-900/20">
                  <Eye className="h-5 w-5 lg:h-6 lg:w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className={`admin-card rounded-lg p-4 lg:p-6 shadow-sm ${getStatCardClasses(1).hover}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm admin-text-light font-medium">
                    Active Jobs
                  </p>
                  <p className="text-xl lg:text-2xl font-bold admin-text mt-1">
                    {jobPerformance.length}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-green-50 dark:bg-green-900/20">
                  <Briefcase className="h-5 w-5 lg:h-6 lg:w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className={`admin-card rounded-lg p-4 lg:p-6 shadow-sm ${getStatCardClasses(2).hover}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm admin-text-light font-medium">
                    Avg. Bounce Rate
                  </p>
                  <p className="text-xl lg:text-2xl font-bold admin-text mt-1">
                    {formatPercentage(avgBounceRate)}
                  </p>
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
                  <p className="text-sm admin-text-light font-medium">
                    Avg. Engagement
                  </p>
                  <p className="text-xl lg:text-2xl font-bold admin-text mt-1">
                    {formatDuration(avgEngagement)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-purple-50 dark:bg-purple-900/20">
                  <Clock className="h-5 w-5 lg:h-6 lg:w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Performance Insights */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="admin-card rounded-lg p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Trophy className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold admin-text">Top Performer</h3>
              </div>
              {bestPerformer && (
                <div>
                  <p className="font-medium admin-text text-sm mb-2">
                    {cleanJobTitle(bestPerformer.title)}
                  </p>
                  <div className="space-y-1 text-xs admin-text-light">
                    <div className="flex justify-between">
                      <span>Page Views:</span>
                      <span className="font-medium">
                        {formatNumber(bestPerformer.pageViews)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bounce Rate:</span>
                      <span className="font-medium">
                        {formatPercentage(bestPerformer.bounceRate)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Engagement:</span>
                      <span className="font-medium">
                        {formatDuration(bestPerformer.engagementDuration)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="admin-card rounded-lg p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                  <Target className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="font-semibold admin-text">Needs Attention</h3>
              </div>
              {worstBounceRate && (
                <div>
                  <p className="font-medium admin-text text-sm mb-2">
                    {cleanJobTitle(worstBounceRate.title)}
                  </p>
                  <div className="space-y-1 text-xs admin-text-light">
                    <div className="flex justify-between">
                      <span>Bounce Rate:</span>
                      <span className="font-medium text-red-600">
                        {formatPercentage(worstBounceRate.bounceRate)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Page Views:</span>
                      <span className="font-medium">
                        {formatNumber(worstBounceRate.pageViews)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs admin-text-light mt-2">
                    Consider improving job description or requirements
                  </p>
                </div>
              )}
            </div>

            <div className="admin-card rounded-lg p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold admin-text">Quick Stats</h3>
              </div>
              <div className="space-y-2 text-sm admin-text-light">
                <div className="flex justify-between">
                  <span>Avg. views per job:</span>
                  <span className="font-medium">
                    {formatNumber(
                      Math.round(totalJobViews / jobPerformance.length)
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Best bounce rate:</span>
                  <span className="font-medium text-green-600">
                    {formatPercentage(
                      Math.min(...jobPerformance.map((j) => j.bounceRate))
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Highest engagement:</span>
                  <span className="font-medium">
                    {formatDuration(
                      Math.max(
                        ...jobPerformance.map((j) => j.engagementDuration)
                      )
                    )}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Detailed Job Performance Table */}
          <motion.div
            variants={itemVariants}
            className="admin-card rounded-lg shadow-sm"
          >
            <div className="p-4 lg:p-6 border-b admin-border">
              <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
                <Zap className="h-5 w-5 text-indigo-600" />
                <span>Job Performance Details</span>
              </h3>
              <p className="text-sm admin-text-light mt-1">
                Individual performance metrics for each job posting
              </p>
            </div>
            <div className="p-4 lg:p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="border-b admin-border">
                    <tr>
                      <th className="text-left py-3 admin-text font-medium">
                        Job Title
                      </th>
                      <th className="text-right py-3 admin-text font-medium">
                        Views
                      </th>
                      <th className="text-right py-3 admin-text font-medium">
                        Users
                      </th>
                      <th className="text-right py-3 admin-text font-medium">
                        Sessions
                      </th>
                      <th className="text-right py-3 admin-text font-medium">
                        Bounce Rate
                      </th>
                      <th className="text-right py-3 admin-text font-medium">
                        Avg. Duration
                      </th>
                      <th className="text-right py-3 admin-text font-medium">
                        Engagement
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topJobs.map((job, index) => {
                      const title = cleanJobTitle(job.title);
                      const bounceRate = job.bounceRate;
                      const isGoodBounceRate = bounceRate < avgBounceRate;
                      const isHighEngagement =
                        job.engagementDuration > avgEngagement;

                      return (
                        <motion.tr
                          key={job.path + index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b last:border-b-0 admin-border hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <td className="py-3 pr-4">
                            <div>
                              <p className="font-medium admin-text text-sm line-clamp-2">
                                {title}
                              </p>
                              <p className="text-xs admin-text-light">
                                {job.path}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 text-right font-semibold admin-text">
                            {formatNumber(job.pageViews)}
                          </td>
                          <td className="py-3 text-right admin-text">
                            {formatNumber(job.activeUsers)}
                          </td>
                          <td className="py-3 text-right admin-text">
                            {formatNumber(job.sessions)}
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              {isGoodBounceRate ? (
                                <ArrowDownRight className="h-3 w-3 text-green-600" />
                              ) : (
                                <ArrowUpRight className="h-3 w-3 text-red-600" />
                              )}
                              <span
                                className={`font-medium ${isGoodBounceRate ? "text-green-600" : "text-red-600"}`}
                              >
                                {formatPercentage(bounceRate)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 text-right admin-text">
                            {formatDuration(job.avgSessionDuration)}
                          </td>
                          <td className="py-3 text-right">
                            <span
                              className={`font-medium ${isHighEngagement ? "text-green-600" : "admin-text"}`}
                            >
                              {formatDuration(job.engagementDuration)}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {jobPerformance.length > 10 && (
                <div className="mt-4 text-center">
                  <p className="text-sm admin-text-light">
                    Showing top 10 jobs. Total: {jobPerformance.length} job
                    pages tracked
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
