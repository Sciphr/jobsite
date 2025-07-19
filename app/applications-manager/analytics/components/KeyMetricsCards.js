"use client";

import { motion } from "framer-motion";
import { Users, Target, Clock, Briefcase, TrendingUp, TrendingDown } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";

const KeyMetricsCards = ({ analytics }) => {
  const { getStatCardClasses } = useThemeClasses();

  const statCardVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
      },
    },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3,
        staggerChildren: 0.08,
      },
    },
  };

  const metrics = [
    {
      title: "Total Applications",
      value: analytics.totalApplications,
      icon: Users,
      growth: analytics.weeklyGrowth,
      growthText: `${analytics.weeklyGrowth >= 0 ? "+" : ""}${analytics.weeklyGrowth.toFixed(1)}% this week`,
      index: 0
    },
    {
      title: "Overall Hire Rate",
      value: `${analytics.conversionRates.overallConversion.toFixed(1)}%`,
      icon: Target,
      subtitle: `${analytics.statusCounts.Hired || 0} hired from ${analytics.totalApplications} applications`,
      index: 1
    },
    {
      title: "Avg. Days to Hire",
      value: analytics.timeToHire.average,
      icon: Clock,
      subtitle: `Median: ${analytics.timeToHire.median} days`,
      index: 2
    },
    {
      title: "Active Jobs",
      value: analytics.activeJobs,
      icon: Briefcase,
      subtitle: `${analytics.totalJobs} total positions`,
      index: 3
    }
  ];

  return (
    <motion.div
      variants={containerVariants}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
    >
      {metrics.map((metric) => (
        <motion.div
          key={metric.title}
          variants={statCardVariants}
          whileHover={{
            scale: 1.02,
            y: -4,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
          }}
          className={`stat-card admin-card p-6 rounded-lg shadow ${getStatCardClasses(metric.index).border}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold admin-text">
                {metric.value}
              </div>
              <div className="text-sm admin-text-light font-medium">
                {metric.title}
              </div>
              {metric.growth !== undefined && (
                <div className="flex items-center mt-2">
                  {metric.growth >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span
                    className={`text-sm ${metric.growth >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {metric.growthText}
                  </span>
                </div>
              )}
              {metric.subtitle && (
                <div className="text-xs admin-text-light mt-2">
                  {metric.subtitle}
                </div>
              )}
            </div>
            <div
              className={`stat-icon p-3 rounded-lg ${getStatCardClasses(metric.index).bg}`}
            >
              <metric.icon className={`h-6 w-6 ${getStatCardClasses(metric.index).icon}`} />
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default KeyMetricsCards;