"use client";

import { motion } from "framer-motion";
import { 
  Users, 
  Eye, 
  Clock, 
  MousePointer, 
  TrendingUp, 
  Calendar, 
  Globe,
  Zap
} from "lucide-react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";

export default function OverviewTab({ analyticsData }) {
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

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Key Metrics Cards */}
      <motion.div 
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6"
      >
        {[
          {
            title: "Active Users",
            value: formatNumber(analyticsData?.overview?.activeUsers),
            icon: Users,
            color: "bg-blue-500",
            bgColor: "bg-blue-50 dark:bg-blue-900/20",
            textColor: "text-blue-600 dark:text-blue-400"
          },
          {
            title: "Sessions",
            value: formatNumber(analyticsData?.overview?.sessions),
            icon: Eye,
            color: "bg-green-500",
            bgColor: "bg-green-50 dark:bg-green-900/20",
            textColor: "text-green-600 dark:text-green-400"
          },
          {
            title: "Page Views",
            value: formatNumber(analyticsData?.overview?.pageViews),
            icon: MousePointer,
            color: "bg-purple-500",
            bgColor: "bg-purple-50 dark:bg-purple-900/20",
            textColor: "text-purple-600 dark:text-purple-400"
          },
          {
            title: "Avg. Session Duration",
            value: formatDuration(analyticsData?.overview?.averageSessionDuration),
            icon: Clock,
            color: "bg-orange-500",
            bgColor: "bg-orange-50 dark:bg-orange-900/20",
            textColor: "text-orange-600 dark:text-orange-400"
          }
        ].map((metric, index) => (
          <motion.div
            key={metric.title}
            whileHover={{ scale: 1.02, y: -2 }}
            className={`admin-card rounded-lg p-4 lg:p-6 shadow-sm ${getStatCardClasses(index).hover}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm admin-text-light font-medium">{metric.title}</p>
                <p className="text-xl lg:text-2xl font-bold admin-text mt-1">{metric.value}</p>
              </div>
              <div className={`p-3 rounded-full ${metric.bgColor}`}>
                <metric.icon className={`h-5 w-5 lg:h-6 lg:w-6 ${metric.textColor}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Additional Insights */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="admin-card rounded-lg p-4 lg:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold admin-text">Bounce Rate</h3>
            <TrendingUp className="h-5 w-5 admin-text-light" />
          </div>
          <div className="text-2xl font-bold admin-text">
            {formatPercentage(analyticsData?.overview?.bounceRate)}
          </div>
          <p className="text-sm admin-text-light mt-1">
            Percentage of single-page sessions
          </p>
        </div>

        <div className="admin-card rounded-lg p-4 lg:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold admin-text">Job Page Views</h3>
            <Calendar className="h-5 w-5 admin-text-light" />
          </div>
          <div className="text-2xl font-bold admin-text">
            {formatNumber(analyticsData?.overview?.totalJobPageViews)}
          </div>
          <p className="text-sm admin-text-light mt-1">
            {analyticsData?.insights?.jobPagesPercentage}% of total page views
          </p>
        </div>

        <div className="admin-card rounded-lg p-4 lg:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold admin-text">Top Traffic Source</h3>
            <Globe className="h-5 w-5 admin-text-light" />
          </div>
          <div className="text-xl font-bold admin-text">
            {analyticsData?.insights?.topTrafficSource}
          </div>
          <p className="text-sm admin-text-light mt-1">
            Primary source of website traffic
          </p>
        </div>
      </motion.div>

      {/* Quick Insights */}
      <motion.div variants={itemVariants} className="admin-card rounded-lg shadow-sm">
        <div className="p-4 lg:p-6 border-b admin-border">
          <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
            <Zap className="h-5 w-5 text-blue-600" />
            <span>Key Insights</span>
          </h3>
        </div>
        <div className="p-4 lg:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium admin-text mb-2">Performance Highlights</h4>
                <ul className="space-y-2 text-sm admin-text-light">
                  <li>• Most viewed page: {analyticsData?.insights?.mostViewedPage}</li>
                  <li>• Top performing job: {analyticsData?.insights?.topJobPage}</li>
                  <li>• Primary audience: {analyticsData?.insights?.topCountry}</li>
                  <li>• Most used device: {analyticsData?.insights?.topDevice}</li>
                </ul>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium admin-text mb-2">Quick Stats</h4>
                <ul className="space-y-2 text-sm admin-text-light">
                  <li>• Peak traffic hour: {analyticsData?.insights?.peakHour}:00</li>
                  <li>• Job pages represent {analyticsData?.insights?.jobPagesPercentage}% of traffic</li>
                  <li>• Average job page bounce: {formatPercentage(analyticsData?.overview?.avgJobPageBounceRate)}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Traffic Sources Preview */}
      {analyticsData?.trafficSources && analyticsData.trafficSources.length > 0 && (
        <motion.div variants={itemVariants} className="admin-card rounded-lg shadow-sm">
          <div className="p-4 lg:p-6 border-b admin-border">
            <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
              <Zap className="h-5 w-5 text-green-600" />
              <span>Top Traffic Sources</span>
            </h3>
          </div>
          <div className="p-4 lg:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {analyticsData.trafficSources.slice(0, 6).map((source, index) => (
                <div key={source.source} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full"
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
    </motion.div>
  );
}