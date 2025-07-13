// app/applications-manager/page.js - Enhanced with smooth animations
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { useApplications, useJobsSimple } from "@/app/hooks/useAdminData";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Users,
  Briefcase,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  ArrowRight,
  Filter,
  BarChart3,
  Zap,
  Target,
  Mail,
  AlertTriangle,
  Star,
  Plus,
  ExternalLink,
} from "lucide-react";

export default function ApplicationsManagerMain() {
  const router = useRouter();
  const { getStatCardClasses, getButtonClasses } = useThemeClasses();

  // Data fetching
  const { data: applications = [], isLoading: applicationsLoading } =
    useApplications();
  const { data: jobs = [], isLoading: jobsLoading } = useJobsSimple();

  // Animation state
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Calculate comprehensive statistics
  const stats = useMemo(() => {
    const statusCounts = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});

    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentApplications = applications.filter(
      (app) => new Date(app.appliedAt) >= weekAgo
    );

    const monthlyApplications = applications.filter(
      (app) => new Date(app.appliedAt) >= monthAgo
    );

    // Calculate conversion funnel
    const totalApplied = statusCounts.Applied || 0;
    const reviewing = statusCounts.Reviewing || 0;
    const interviewing = statusCounts.Interview || 0;
    const hired = statusCounts.Hired || 0;
    const rejected = statusCounts.Rejected || 0;

    return {
      total: applications.length,
      thisWeek: recentApplications.length,
      thisMonth: monthlyApplications.length,
      statusCounts,
      conversionRate:
        applications.length > 0
          ? Math.round((hired / applications.length) * 100)
          : 0,
      avgTimeToHire: 12, // This could be calculated from actual data
      activeJobs: jobs.filter((job) => job.status === "Active").length,
      totalJobs: jobs.length,
    };
  }, [applications, jobs]);

  // Get top performing jobs
  const topJobs = useMemo(() => {
    return jobs
      .filter((job) => job.applicationCount > 0)
      .sort((a, b) => b.applicationCount - a.applicationCount)
      .slice(0, 5)
      .map((job) => ({
        ...job,
        weeklyApplications: applications.filter(
          (app) =>
            app.jobId === job.id &&
            new Date(app.appliedAt) >=
              new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length,
      }));
  }, [jobs, applications]);

  // Get jobs needing attention (low applications)
  const jobsNeedingAttention = useMemo(() => {
    return jobs
      .filter((job) => job.status === "Active" && job.applicationCount < 3)
      .sort((a, b) => a.applicationCount - b.applicationCount)
      .slice(0, 3);
  }, [jobs]);

  // Get recent applications for activity feed
  const recentActivity = useMemo(() => {
    return applications
      .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt))
      .slice(0, 8);
  }, [applications]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1,
      },
    },
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
    hover: {
      scale: 1.02,
      y: -4,
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 17,
      },
    },
  };

  const jobCardVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24,
      },
    },
    hover: {
      scale: 1.02,
      x: 4,
      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 17,
      },
    },
  };

  const activityCardVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
      },
    },
    hover: {
      scale: 1.03,
      y: -2,
      boxShadow: "0 8px 25px -5px rgba(0, 0, 0, 0.1)",
    },
  };

  const quickActionVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
      },
    },
    hover: {
      scale: 1.02,
      y: -2,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 17,
      },
    },
  };

  if (applicationsLoading || jobsLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="h-32 bg-gray-200 rounded"
              ></motion.div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="h-96 bg-gray-200 rounded"
            ></motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="h-96 bg-gray-200 rounded"
            ></motion.div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      <div className="space-y-6">
        {/* Enhanced Header */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold admin-text flex items-center space-x-3">
              <motion.div
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.6 }}
              >
                <Target className="h-8 w-8 text-blue-600" />
              </motion.div>
              <span>Applications Manager</span>
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="admin-text-light mt-2"
            >
              Enterprise-level application management and hiring workflows
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center space-x-3"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/applications-manager/pipeline")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${getButtonClasses("secondary")}`}
            >
              <Filter className="h-4 w-4" />
              <span>Pipeline View</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/applications-manager/analytics")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${getButtonClasses("primary")}`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Enhanced Key Metrics */}
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          {[
            {
              value: stats.total,
              label: "Total Applications",
              subtitle: `${stats.thisWeek} this week (+${Math.round((stats.thisWeek / stats.total) * 100) || 0}%)`,
              icon: Users,
              index: 0,
            },
            {
              value: stats.statusCounts.Interview || 0,
              label: "In Interview",
              subtitle: "Active pipeline stage",
              icon: Calendar,
              index: 1,
            },
            {
              value: `${stats.conversionRate}%`,
              label: "Hire Rate",
              subtitle: "Application to hire conversion",
              icon: TrendingUp,
              index: 2,
            },
            {
              value: stats.avgTimeToHire,
              label: "Avg. Days to Hire",
              subtitle: "From application to offer",
              icon: Clock,
              index: 3,
            },
          ].map((metric) => (
            <motion.div
              key={metric.label}
              variants={statCardVariants}
              whileHover="hover"
              onHoverStart={() => setHoveredCard(metric.index)}
              onHoverEnd={() => setHoveredCard(null)}
              className={`stat-card admin-card p-6 rounded-lg shadow cursor-pointer ${getStatCardClasses(metric.index).border} overflow-hidden relative`}
            >
              {/* Animated background effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: hoveredCard === metric.index ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              />

              <div className="relative flex items-center justify-between">
                <div>
                  <motion.div
                    initial={{ scale: 1 }}
                    animate={{ scale: hoveredCard === metric.index ? 1.05 : 1 }}
                    className="text-3xl font-bold admin-text"
                  >
                    {metric.value}
                  </motion.div>
                  <div className="text-sm admin-text-light font-medium">
                    {metric.label}
                  </div>
                  <motion.div
                    initial={{ opacity: 0.7 }}
                    animate={{
                      opacity: hoveredCard === metric.index ? 1 : 0.7,
                    }}
                    className="text-xs admin-text-light mt-1"
                  >
                    {metric.subtitle}
                  </motion.div>
                </div>
                <motion.div
                  className={`stat-icon p-3 rounded-lg ${getStatCardClasses(metric.index).bg}`}
                  whileHover={{ rotate: 5, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <metric.icon
                    className={`h-6 w-6 ${getStatCardClasses(metric.index).icon}`}
                  />
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Enhanced Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Enhanced Top Performing Jobs */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <div className="admin-card rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
                    <motion.div
                      whileHover={{ rotate: 180, scale: 1.1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Star className="h-5 w-5 text-yellow-500" />
                    </motion.div>
                    <span>Top Performing Jobs</span>
                  </h3>
                  <motion.button
                    whileHover={{ scale: 1.05, x: 2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() =>
                      router.push("/applications-manager/analytics")
                    }
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
                  >
                    <span>View All</span>
                    <motion.div
                      whileHover={{ x: 2 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </motion.div>
                  </motion.button>
                </div>
              </div>
              <div className="p-6">
                {topJobs.length > 0 ? (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-4"
                  >
                    {topJobs.map((job, index) => (
                      <motion.div
                        key={job.id}
                        variants={jobCardVariants}
                        whileHover="hover"
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg transition-colors cursor-pointer overflow-hidden relative"
                        onClick={() =>
                          router.push(`/applications-manager/jobs/${job.id}`)
                        }
                      >
                        {/* Hover background effect */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50"
                          initial={{ opacity: 0, x: "-100%" }}
                          whileHover={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3 }}
                        />

                        <div className="relative flex-1">
                          <div className="flex items-center space-x-3">
                            <motion.div
                              whileHover={{ scale: 1.1, rotate: 5 }}
                              className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-bold"
                            >
                              {index + 1}
                            </motion.div>
                            <div>
                              <h4 className="font-medium admin-text">
                                {job.title}
                              </h4>
                              <p className="text-sm admin-text-light">
                                {job.department}
                              </p>
                            </div>
                          </div>
                        </div>
                        <motion.div
                          className="relative text-right"
                          whileHover={{ scale: 1.05 }}
                        >
                          <div className="text-lg font-bold admin-text">
                            {job.applicationCount}
                          </div>
                          <div className="text-xs admin-text-light">
                            total applications
                          </div>
                          {job.weeklyApplications > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-xs text-green-600"
                            >
                              +{job.weeklyApplications} this week
                            </motion.div>
                          )}
                        </motion.div>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                  >
                    <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="admin-text-light">
                      No job performance data available yet.
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Enhanced Jobs Needing Attention */}
          <motion.div variants={itemVariants}>
            <div className="admin-card rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 3,
                    }}
                  >
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                  </motion.div>
                  <span>Needs Attention</span>
                </h3>
              </div>
              <div className="p-6">
                {jobsNeedingAttention.length > 0 ? (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-4"
                  >
                    {jobsNeedingAttention.map((job, index) => (
                      <motion.div
                        key={job.id}
                        variants={itemVariants}
                        whileHover={{
                          scale: 1.02,
                          y: -2,
                          boxShadow: "0 8px 25px -5px rgba(251, 146, 60, 0.3)",
                        }}
                        className="p-3 border border-orange-200 bg-orange-50 rounded-lg cursor-pointer transition-colors overflow-hidden relative"
                        onClick={() =>
                          router.push(`/applications-manager/jobs/${job.id}`)
                        }
                      >
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-orange-100 to-red-50"
                          initial={{ opacity: 0, scale: 0 }}
                          whileHover={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3 }}
                        />

                        <div className="relative">
                          <h4 className="font-medium text-orange-900">
                            {job.title}
                          </h4>
                          <p className="text-sm text-orange-700">
                            {job.department}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-orange-600">
                              {job.applicationCount} applications
                            </span>
                            <span className="text-xs text-orange-600">
                              {Math.floor(
                                (Date.now() - new Date(job.createdAt)) /
                                  (1000 * 60 * 60 * 24)
                              )}{" "}
                              days old
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                  >
                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                    <p className="admin-text-light text-sm">
                      All jobs performing well!
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Enhanced Recent Activity */}
        <motion.div variants={itemVariants}>
          <div className="admin-card rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold admin-text">
                  Recent Activity
                </h3>
                <motion.button
                  whileHover={{ scale: 1.05, x: 2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push("/applications-manager/pipeline")}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
                >
                  <span>View Pipeline</span>
                  <motion.div
                    whileHover={{ x: 2 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </motion.div>
                </motion.button>
              </div>
            </div>
            <div className="p-6">
              {recentActivity.length > 0 ? (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                  {recentActivity.map((application, index) => (
                    <motion.div
                      key={application.id}
                      variants={activityCardVariants}
                      whileHover="hover"
                      className="p-4 border border-gray-200 rounded-lg transition-all cursor-pointer overflow-hidden relative"
                      onClick={() =>
                        router.push(
                          `/applications-manager/jobs/${application.jobId}`
                        )
                      }
                    >
                      {/* Hover background effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50"
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                      />

                      <div className="relative flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium admin-text text-sm">
                            {application.name || "Anonymous"}
                          </h4>
                          <p className="text-xs admin-text-light mt-1">
                            {application.job?.title}
                          </p>
                          <div className="flex items-center space-x-2 mt-2">
                            <motion.span
                              whileHover={{ scale: 1.05 }}
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                application.status === "Applied"
                                  ? "bg-blue-100 text-blue-800"
                                  : application.status === "Reviewing"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : application.status === "Interview"
                                      ? "bg-green-100 text-green-800"
                                      : application.status === "Hired"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-red-100 text-red-800"
                              }`}
                            >
                              {application.status}
                            </motion.span>
                          </div>
                        </div>
                      </div>
                      <div className="relative text-xs admin-text-light mt-3">
                        {new Date(application.appliedAt).toLocaleDateString()}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="admin-text-light">No recent applications.</p>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Enhanced Quick Actions */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {[
            {
              title: "Pipeline Management",
              description: "Kanban-style workflow view",
              icon: Filter,
              color: "blue",
              path: "/applications-manager/pipeline",
            },
            {
              title: "Communication Hub",
              description: "Templates and messaging",
              icon: Mail,
              color: "green",
              path: "/applications-manager/communication",
            },
            {
              title: "Advanced Analytics",
              description: "Insights and reporting",
              icon: BarChart3,
              color: "purple",
              path: "/applications-manager/analytics",
            },
          ].map((action, index) => (
            <motion.button
              key={action.title}
              variants={quickActionVariants}
              whileHover="hover"
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push(action.path)}
              className="admin-card p-6 rounded-lg shadow text-left group overflow-hidden relative"
            >
              {/* Animated background gradient */}
              <motion.div
                className={`absolute inset-0 bg-gradient-to-br from-${action.color}-50 to-${action.color}-100`}
                initial={{ opacity: 0, scale: 0.8 }}
                whileHover={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              />

              <div className="relative flex items-center space-x-4">
                <motion.div
                  className={`bg-${action.color}-100 p-3 rounded-lg group-hover:bg-${action.color}-200 transition-colors`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <action.icon className={`h-6 w-6 text-${action.color}-600`} />
                </motion.div>
                <div>
                  <motion.h3
                    className="font-semibold admin-text"
                    whileHover={{ scale: 1.02 }}
                  >
                    {action.title}
                  </motion.h3>
                  <p className="text-sm admin-text-light">
                    {action.description}
                  </p>
                </div>
                <motion.div
                  className="ml-auto"
                  whileHover={{ x: 4, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </motion.div>
              </div>
            </motion.button>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
