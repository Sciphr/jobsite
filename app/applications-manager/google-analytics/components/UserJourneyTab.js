"use client";

import { motion } from "framer-motion";
import {
  Users,
  Briefcase,
  Clock,
  TrendingUp,
  Heart,
  Eye,
  Target,
  Navigation,
  Zap,
  Activity,
} from "lucide-react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";

export default function UserJourneyTab({ analyticsData }) {
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

  // Clean page path for display
  const cleanPagePath = (path) => {
    if (!path) return "Unknown Page";
    // Remove query parameters and clean up the path
    const cleanPath = path.split("?")[0];
    if (cleanPath === "/") return "Homepage";
    if (cleanPath.includes("/jobs/"))
      return "Job Page: " + cleanPath.replace("/jobs/", "");
    return (
      cleanPath.charAt(0).toUpperCase() +
      cleanPath.slice(1).replace(/[-_]/g, " ")
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

  const userJourney = analyticsData?.userJourney || {};
  const landingPages = userJourney.landingPages || [];
  const engagement = userJourney.engagement || {};

  // Calculate journey insights
  const totalSessions = landingPages.reduce(
    (sum, page) => sum + page.sessions,
    0
  );
  const avgBounceRate =
    landingPages.length > 0
      ? landingPages.reduce((sum, page) => sum + page.bounceRate, 0) /
        landingPages.length
      : 0;
  const avgSessionDuration =
    landingPages.length > 0
      ? landingPages.reduce((sum, page) => sum + page.avgSessionDuration, 0) /
        landingPages.length
      : 0;

  // Categorize landing pages
  const jobPages = landingPages.filter((page) => page.page.includes("/jobs"));
  const homepageTraffic = landingPages.find(
    (page) => page.page === "/" || page.page === "/home"
  );
  const otherPages = landingPages.filter(
    (page) =>
      !page.page.includes("/jobs") && page.page !== "/" && page.page !== "/home"
  );

  return (
    <motion.div initial="hidden" animate="visible" className="space-y-6">
      {landingPages.length === 0 ? (
        <motion.div variants={itemVariants} className="text-center py-12">
          <div className="admin-card rounded-lg p-8 max-w-md mx-auto">
            <Users className="h-16 w-16 admin-text-light mx-auto mb-4" />
            <h3 className="text-lg font-semibold admin-text mb-2">
              No Journey Data
            </h3>
            <p className="admin-text-light">
              No user journey data available for the selected time period. This
              may take some time to populate.
            </p>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Journey Overview Cards */}
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
                    Engaged Sessions
                  </p>
                  <p className="text-xl lg:text-2xl font-bold admin-text mt-1">
                    {formatNumber(engagement.engagedSessions)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-green-50 dark:bg-green-900/20">
                  <Heart className="h-5 w-5 lg:h-6 lg:w-6 text-green-600 dark:text-green-400" />
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
                    Sessions/User
                  </p>
                  <p className="text-xl lg:text-2xl font-bold admin-text mt-1">
                    {engagement.sessionsPerUser?.toFixed(1) || "0.0"}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-900/20">
                  <Activity className="h-5 w-5 lg:h-6 lg:w-6 text-blue-600 dark:text-blue-400" />
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
                    Engagement Duration
                  </p>
                  <p className="text-xl lg:text-2xl font-bold admin-text mt-1">
                    {formatDuration(engagement.userEngagementDuration)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-purple-50 dark:bg-purple-900/20">
                  <Clock className="h-5 w-5 lg:h-6 lg:w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Journey Insights */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="admin-card rounded-lg p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold admin-text">Entry Points</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm admin-text">Job Pages</span>
                    <span className="text-sm font-medium admin-text">
                      {jobPages.length} pages
                    </span>
                  </div>
                  <div className="text-xs admin-text-light">
                    {formatNumber(
                      jobPages.reduce((sum, page) => sum + page.sessions, 0)
                    )}{" "}
                    sessions
                  </div>
                </div>

                {homepageTraffic && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm admin-text">Homepage</span>
                      <span className="text-sm font-medium admin-text">
                        {formatNumber(homepageTraffic.sessions)}
                      </span>
                    </div>
                    <div className="text-xs admin-text-light">
                      {formatPercentage(homepageTraffic.bounceRate)} bounce rate
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm admin-text">Other Pages</span>
                    <span className="text-sm font-medium admin-text">
                      {otherPages.length} pages
                    </span>
                  </div>
                  <div className="text-xs admin-text-light">
                    {formatNumber(
                      otherPages.reduce((sum, page) => sum + page.sessions, 0)
                    )}{" "}
                    sessions
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-card rounded-lg p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Eye className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold admin-text">Best Performers</h3>
              </div>
              <div className="space-y-3">
                {landingPages.slice(0, 3).map((page, index) => {
                  const isLowBounce = page.bounceRate < avgBounceRate;
                  return (
                    <div
                      key={page.page}
                      className="border-b last:border-b-0 pb-2 last:pb-0"
                    >
                      <p className="text-sm font-medium admin-text truncate">
                        {cleanPagePath(page.page)}
                      </p>
                      <div className="flex justify-between text-xs admin-text-light mt-1">
                        <span>{formatNumber(page.sessions)} sessions</span>
                        <span
                          className={
                            isLowBounce ? "text-green-600" : "admin-text-light"
                          }
                        >
                          {formatPercentage(page.bounceRate)} bounce
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="admin-card rounded-lg p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Navigation className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold admin-text">Journey Insights</h3>
              </div>
              <div className="space-y-2 text-sm admin-text-light">
                <div className="flex justify-between">
                  <span>Avg. session duration:</span>
                  <span className="font-medium">
                    {formatDuration(avgSessionDuration)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Best bounce rate:</span>
                  <span className="font-medium text-green-600">
                    {formatPercentage(
                      Math.min(...landingPages.map((p) => p.bounceRate))
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total entry points:</span>
                  <span className="font-medium">{landingPages.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Job page entries:</span>
                  <span className="font-medium">
                    {formatPercentage(
                      (jobPages.reduce((sum, page) => sum + page.sessions, 0) /
                        totalSessions) *
                        100
                    )}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Detailed Landing Pages Table */}
          <motion.div
            variants={itemVariants}
            className="admin-card rounded-lg shadow-sm"
          >
            <div className="p-4 lg:p-6 border-b admin-border">
              <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
                <Zap className="h-5 w-5 text-indigo-600" />
                <span>Landing Page Performance</span>
              </h3>
              <p className="text-sm admin-text-light mt-1">
                How users enter your website and their initial experience
              </p>
            </div>
            <div className="p-4 lg:p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="border-b admin-border">
                    <tr>
                      <th className="text-left py-3 admin-text font-medium">
                        Landing Page
                      </th>
                      <th className="text-right py-3 admin-text font-medium">
                        Sessions
                      </th>
                      <th className="text-right py-3 admin-text font-medium">
                        % of Total
                      </th>
                      <th className="text-right py-3 admin-text font-medium">
                        Bounce Rate
                      </th>
                      <th className="text-right py-3 admin-text font-medium">
                        Avg. Duration
                      </th>
                      <th className="text-right py-3 admin-text font-medium">
                        Quality
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {landingPages.slice(0, 10).map((page, index) => {
                      const sessionPercentage =
                        totalSessions > 0
                          ? (page.sessions / totalSessions) * 100
                          : 0;
                      const isGoodBounceRate = page.bounceRate < avgBounceRate;
                      const isLongSession =
                        page.avgSessionDuration > avgSessionDuration;

                      // Quality score based on bounce rate and session duration
                      let qualityScore = "Poor";
                      let qualityColor = "text-red-600";

                      if (isGoodBounceRate && isLongSession) {
                        qualityScore = "Excellent";
                        qualityColor = "text-green-600";
                      } else if (isGoodBounceRate || isLongSession) {
                        qualityScore = "Good";
                        qualityColor = "text-yellow-600";
                      }

                      return (
                        <motion.tr
                          key={page.page}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b last:border-b-0 admin-border hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <td className="py-3 pr-4">
                            <div className="flex items-center space-x-2">
                              {page.page.includes("/jobs") && (
                                <Briefcase className="h-4 w-4 admin-text-light flex-shrink-0" />
                              )}
                              <div>
                                <p className="font-medium admin-text text-sm">
                                  {cleanPagePath(page.page)}
                                </p>
                                <p className="text-xs admin-text-light truncate">
                                  {page.page}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 text-right font-semibold admin-text">
                            {formatNumber(page.sessions)}
                          </td>
                          <td className="py-3 text-right admin-text">
                            {sessionPercentage.toFixed(1)}%
                          </td>
                          <td className="py-3 text-right">
                            <span
                              className={`font-medium ${isGoodBounceRate ? "text-green-600" : "text-red-600"}`}
                            >
                              {formatPercentage(page.bounceRate)}
                            </span>
                          </td>
                          <td className="py-3 text-right admin-text">
                            {formatDuration(page.avgSessionDuration)}
                          </td>
                          <td className="py-3 text-right">
                            <span
                              className={`font-medium text-sm ${qualityColor}`}
                            >
                              {qualityScore}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {landingPages.length > 10 && (
                <div className="mt-4 text-center">
                  <p className="text-sm admin-text-light">
                    Showing top 10 landing pages. Total: {landingPages.length}{" "}
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
