// app/applications-manager/page.js - Fixed hydration issue
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { useApplications, useJobsSimple, useArchiveApplications, useAutoArchive, useAutoArchivePreview, useAutoProgress, useAutoProgressPreview } from "@/app/hooks/useAdminData";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import BulkAIRating from "./components/BulkAIRating";
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
  Archive,
  ArchiveRestore,
  Settings,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

export default function ApplicationsManagerMain() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getStatCardClasses, getButtonClasses } = useThemeClasses();

  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedApplications, setSelectedApplications] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Data fetching
  const { data: applications = [], isLoading: applicationsLoading } =
    useApplications(showArchived);
  const { data: jobs = [], isLoading: jobsLoading } = useJobsSimple();

  // Archive functionality
  const { mutate: archiveApplications, isLoading: archiving } = useArchiveApplications();
  const { mutate: autoArchive, isLoading: autoArchiving } = useAutoArchive();
  const { data: autoArchivePreview } = useAutoArchivePreview();

  // Auto-progress functionality
  const { mutate: autoProgress, isLoading: autoProgressing } = useAutoProgress();
  const { data: autoProgressPreview } = useAutoProgressPreview();

  // Add mounted state to prevent hydration issues
  const [isMounted, setIsMounted] = useState(false);

  // Animation state
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showQuickActions, setShowQuickActions] = useState(false);

  useEffect(() => {
    // Only mark as loaded when we have actual data OR confirmed empty state after loading
    if (!applicationsLoading && !jobsLoading) {
      const timer = setTimeout(() => {
        setHasInitiallyLoaded(true);
      }, 100); // Small delay to ensure data is settled
      return () => clearTimeout(timer);
    }
  }, [applicationsLoading, jobsLoading]);

  // Clear selected applications when showArchived changes
  useEffect(() => {
    setSelectedApplications(new Set());
    setShowBulkActions(false);
  }, [showArchived]);

  // Bulk selection handlers
  const handleSelectApplication = (applicationId, checked) => {
    const newSelected = new Set(selectedApplications);
    if (checked) {
      newSelected.add(applicationId);
    } else {
      newSelected.delete(applicationId);
    }
    setSelectedApplications(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const allIds = new Set(recentActivity.map(app => app.id));
      setSelectedApplications(allIds);
      setShowBulkActions(allIds.size > 0);
    } else {
      setSelectedApplications(new Set());
      setShowBulkActions(false);
    }
  };

  const handleBulkArchive = (shouldArchive = true) => {
    if (selectedApplications.size === 0) return;

    const applicationIds = Array.from(selectedApplications);
    archiveApplications(
      {
        applicationIds,
        archive: shouldArchive,
        reason: shouldArchive ? 'manual_bulk' : undefined,
      },
      {
        onSuccess: (data) => {
          alert(data.message);
          setSelectedApplications(new Set());
          setShowBulkActions(false);
        },
        onError: (error) => {
          alert(`Error: ${error.message}`);
        },
      }
    );
  };

  const handleAutoArchive = () => {
    if (!autoArchivePreview?.count || autoArchivePreview.count === 0) {
      alert('No applications found for auto-archiving');
      return;
    }

    const confirmMessage = `Are you sure you want to auto-archive ${autoArchivePreview.count} rejected applications older than ${autoArchivePreview.daysThreshold} days?`;
    
    if (confirm(confirmMessage)) {
      autoArchive(undefined, {
        onSuccess: (data) => {
          alert(data.message);
        },
        onError: (error) => {
          alert(`Error: ${error.message}`);
        },
      });
    }
  };

  const handleAutoProgress = () => {
    if (!autoProgressPreview?.count || autoProgressPreview.count === 0) {
      alert('No applications found for auto-progress');
      return;
    }

    const confirmMessage = `Are you sure you want to auto-progress ${autoProgressPreview.count} applications from Applied to Reviewing after ${autoProgressPreview.daysThreshold} days?`;
    
    if (confirm(confirmMessage)) {
      autoProgress(undefined, {
        onSuccess: (data) => {
          alert(data.message);
        },
        onError: (error) => {
          alert(`Error: ${error.message}`);
        },
      });
    }
  };

  // Calculate comprehensive statistics
  const stats = useMemo(() => {
    if (applicationsLoading || jobsLoading) {
      return {
        total: 0,
        thisWeek: 0,
        thisMonth: 0,
        statusCounts: {},
        conversionRate: 0,
        avgTimeToHire: 0,
        activeJobs: 0,
        totalJobs: 0,
      };
    }

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

    const hired = statusCounts.Hired || 0;

    // Calculate real average time to hire for hired candidates
    const hiredApplications = applications.filter(
      (app) => app.status === "Hired"
    );
    const avgTimeToHire =
      hiredApplications.length > 0
        ? Math.round(
            hiredApplications.reduce((sum, app) => {
              const daysDiff = Math.floor(
                (new Date() - new Date(app.appliedAt)) / (1000 * 60 * 60 * 24)
              );
              return sum + daysDiff;
            }, 0) / hiredApplications.length
          )
        : 0;

    return {
      total: applications.length,
      thisWeek: recentApplications.length,
      thisMonth: monthlyApplications.length,
      statusCounts,
      conversionRate:
        applications.length > 0
          ? Math.round((hired / applications.length) * 100)
          : 0,
      avgTimeToHire: avgTimeToHire || 14, // fallback to 14 if no hired candidates
      activeJobs: jobs.filter((job) => job.status === "Active").length,
      totalJobs: jobs.length,
    };
  }, [applications, jobs, applicationsLoading, jobsLoading]);

  // Get top performing jobs
  const topJobs = useMemo(() => {
    if (jobsLoading || !jobs.length) {
      return [];
    }

    return jobs
      .map((job) => {
        // Get applications for this job
        const jobApplications = applications.filter(
          (app) => app.jobId === job.id
        );

        // Calculate weekly applications
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const weeklyApplications = jobApplications.filter(
          (app) => new Date(app.appliedAt) >= weekAgo
        ).length;

        return {
          ...job,
          applicationCount: jobApplications.length, // Use real count
          weeklyApplications,
        };
      })
      .filter((job) => job.applicationCount > 0) // Only show jobs with applications
      .sort((a, b) => b.applicationCount - a.applicationCount)
      .slice(0, 5);
  }, [jobs, applications, jobsLoading]);

  // Get jobs needing attention (low applications)
  const jobsNeedingAttention = useMemo(() => {
    if (jobsLoading || !jobs.length) {
      return [];
    }

    return jobs
      .map((job) => {
        // Get real application count for this job
        const jobApplications = applications.filter(
          (app) => app.jobId === job.id
        );
        return {
          ...job,
          applicationCount: jobApplications.length,
        };
      })
      .filter((job) => job.status === "Active" && job.applicationCount < 3)
      .sort((a, b) => a.applicationCount - b.applicationCount)
      .slice(0, 3);
  }, [jobs, applications, jobsLoading]);

  // Get recent applications for activity feed
  const recentActivity = useMemo(() => {
    if (applicationsLoading || !applications.length) {
      return [];
    }

    return applications
      .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt))
      .slice(0, 8);
  }, [applications, applicationsLoading]);

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

  // Show loading state if not mounted or data is loading

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
          className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0"
        >
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold admin-text flex items-center space-x-2 lg:space-x-3">
              <motion.div
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.6 }}
              >
                <Target className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600" />
              </motion.div>
              <span>Applications Manager</span>
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="admin-text-light mt-2 text-sm lg:text-base"
            >
              Enterprise-level application management and hiring workflows
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3"
          >
            {/* Show Archived Toggle */}
            <motion.label
              whileHover={{ scale: 1.02 }}
              className="flex items-center space-x-2 px-3 py-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
              <Archive className="h-4 w-4 admin-text-light" />
              <span className="text-sm admin-text">Show Archived</span>
            </motion.label>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/applications-manager/pipeline")}
              className={`flex items-center justify-center space-x-2 px-3 py-2 lg:px-4 lg:py-2 rounded-lg transition-colors text-sm ${getButtonClasses("secondary")}`}
            >
              <Filter className="h-4 w-4" />
              <span>Pipeline View</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/applications-manager/analytics")}
              className={`flex items-center justify-center space-x-2 px-3 py-2 lg:px-4 lg:py-2 rounded-lg transition-colors text-sm ${getButtonClasses("primary")}`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Enhanced Key Metrics */}
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6"
        >
          {[
            {
              value: stats.total,
              label: "Total Applications",
              subtitle: `${stats.thisWeek} this week${stats.total > 0 ? ` (+${Math.round((stats.thisWeek / Math.max(stats.total - stats.thisWeek, 1)) * 100)}%)` : ""}`,
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
              className={`stat-card admin-card p-4 lg:p-6 rounded-lg shadow cursor-pointer ${getStatCardClasses(metric.index).border} overflow-hidden relative`}
            >
              {/* Animated background effect */}
              <motion.div
                className={`absolute inset-0 bg-gradient-to-br ${getStatCardClasses(metric.index).bg}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: hoveredCard === metric.index ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              />

              <div className="relative flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <motion.div
                    initial={{ scale: 1 }}
                    animate={{ scale: hoveredCard === metric.index ? 1.05 : 1 }}
                    className="text-xl sm:text-2xl lg:text-3xl font-bold admin-text"
                  >
                    {metric.value}
                  </motion.div>
                  <div className="text-xs sm:text-sm admin-text-light font-medium">
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
                  className={`stat-icon p-2 lg:p-3 rounded-lg ${getStatCardClasses(metric.index).bg} flex-shrink-0`}
                  whileHover={{ rotate: 5, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <metric.icon
                    className={`h-5 w-5 lg:h-6 lg:w-6 ${getStatCardClasses(metric.index).icon}`}
                  />
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Enhanced Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Enhanced Top Performing Jobs */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <div className="admin-card rounded-lg shadow overflow-hidden">
              <div className="p-4 lg:p-6 border-b admin-border">
                <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <h3 className="text-base lg:text-lg font-semibold admin-text flex items-center space-x-2">
                    <motion.div
                      whileHover={{ rotate: 180, scale: 1.1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Star className={`h-4 w-4 lg:h-5 lg:w-5 ${getStatCardClasses(2).icon}`} />
                    </motion.div>
                    <span>Top Performing Jobs</span>
                  </h3>
                  <motion.button
                    whileHover={{ scale: 1.05, x: 2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() =>
                      router.push("/applications-manager/analytics")
                    }
                    className={`text-sm font-medium flex items-center space-x-1 ${getStatCardClasses(0).icon} hover:opacity-80 transition-opacity self-start sm:self-auto`}
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
              <div className="p-4 lg:p-6">
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
                        className={`flex items-center justify-between p-3 lg:p-4 rounded-lg transition-colors cursor-pointer overflow-hidden relative ${getStatCardClasses(index).bg}`}
                        onClick={() => {
                          if (!job.id) {
                            console.error('No id found for job:', job);
                            return;
                          }
                          router.push(`/applications-manager/jobs/${job.id}`);
                        }}
                      >
                        {/* Hover background effect */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50"
                          initial={{ opacity: 0, x: "-100%" }}
                          whileHover={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3 }}
                        />

                        <div className="relative flex-1 min-w-0">
                          <div className="flex items-center space-x-2 lg:space-x-3">
                            <motion.div
                              whileHover={{ scale: 1.1, rotate: 5 }}
                              className="w-6 h-6 lg:w-8 lg:h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs lg:text-sm font-bold flex-shrink-0"
                            >
                              {index + 1}
                            </motion.div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-medium admin-text text-sm lg:text-base truncate">
                                {job.title}
                              </h4>
                              <p className="text-xs lg:text-sm admin-text-light truncate">
                                {job.department}
                              </p>
                            </div>
                          </div>
                        </div>
                        <motion.div
                          className="relative text-right flex-shrink-0 ml-2"
                          whileHover={{ scale: 1.05 }}
                        >
                          <div className="text-base lg:text-lg font-bold admin-text">
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
                    <Briefcase className="h-12 w-12 admin-text-light mx-auto mb-4" />
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
              <div className="p-4 lg:p-6 border-b admin-border">
                <h3 className="text-base lg:text-lg font-semibold admin-text flex items-center space-x-2">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 3,
                    }}
                  >
                    <AlertTriangle className="h-4 w-4 lg:h-5 lg:w-5 text-orange-500" />
                  </motion.div>
                  <span>Needs Attention</span>
                </h3>
              </div>
              <div className="p-4 lg:p-6">
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
                        className="p-3 lg:p-4 border border-orange-200 bg-orange-50 rounded-lg cursor-pointer transition-colors overflow-hidden relative"
                        onClick={() => {
                          if (!job.id) {
                            console.error('No id found for job:', job);
                            return;
                          }
                          router.push(`/applications-manager/jobs/${job.id}`);
                        }}
                      >
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-orange-100 to-red-50"
                          initial={{ opacity: 0, scale: 0 }}
                          whileHover={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3 }}
                        />

                        <div className="relative">
                          <h4 className="font-medium text-orange-900 text-sm lg:text-base truncate">
                            {job.title}
                          </h4>
                          <p className="text-xs lg:text-sm text-orange-700 truncate">
                            {job.department}
                          </p>
                          <div className="flex items-center justify-between mt-2 text-xs">
                            <span className="text-orange-600">
                              {job.applicationCount} applications
                            </span>
                            <span className="text-orange-600">
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
            <div className="p-4 lg:p-6 border-b border-gray-200">
              <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <div className="flex items-center space-x-4">
                  <h3 className="text-base lg:text-lg font-semibold admin-text">
                    Recent Activity
                  </h3>
                  {recentActivity.length > 0 && (
                    <motion.label
                      whileHover={{ scale: 1.02 }}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedApplications.size === recentActivity.length && recentActivity.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                      />
                      <span className="text-sm admin-text">Select All</span>
                    </motion.label>
                  )}
                </div>
                <motion.button
                  whileHover={{ scale: 1.05, x: 2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push("/applications-manager/pipeline")}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1 self-start sm:self-auto"
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
              
              {/* Bulk Actions */}
              <AnimatePresence>
                {showBulkActions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm admin-text">
                        {selectedApplications.size} application{selectedApplications.size !== 1 ? 's' : ''} selected
                      </span>
                      <div className="flex items-center space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleBulkArchive(true)}
                          disabled={archiving}
                          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            archiving 
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          <Archive className="h-4 w-4" />
                          <span>Archive Selected</span>
                        </motion.button>
                        
                        {showArchived && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleBulkArchive(false)}
                            disabled={archiving}
                            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              archiving 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300'
                            }`}
                          >
                            <ArchiveRestore className="h-4 w-4" />
                            <span>Unarchive Selected</span>
                          </motion.button>
                        )}
                        
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setSelectedApplications(new Set());
                            setShowBulkActions(false);
                          }}
                          className="text-sm admin-text-light hover:admin-text"
                        >
                          Cancel
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="p-4 lg:p-6">
              {recentActivity.length > 0 ? (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4"
                >
                  {recentActivity.map((application, index) => (
                    <motion.div
                      key={application.id}
                      variants={activityCardVariants}
                      whileHover="hover"
                      className="p-3 lg:p-4 border admin-border rounded-lg transition-all cursor-pointer overflow-hidden relative"
                      onClick={(e) => {
                        // Don't navigate if clicking on checkbox
                        if (e.target.type === 'checkbox') return;
                        if (!application.jobId) {
                          console.error('No jobId found for application:', application);
                          return;
                        }
                        router.push(
                          `/applications-manager/jobs/${application.jobId}`
                        );
                      }}
                    >
                      {/* Hover background effect */}
                      <motion.div
                        className={`absolute inset-0 bg-gradient-to-br ${getStatCardClasses(index % 4).bg}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                      />

                      <div className="relative flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1 min-w-0">
                          <motion.input
                            whileHover={{ scale: 1.1 }}
                            type="checkbox"
                            checked={selectedApplications.has(application.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleSelectApplication(application.id, e.target.checked);
                            }}
                            className="mt-1 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium admin-text text-xs lg:text-sm truncate">
                              {application.name || "Anonymous"}
                            </h4>
                            <p className="text-xs admin-text-light mt-1 truncate">
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
                              {application.is_archived && (
                                <motion.span
                                  whileHover={{ scale: 1.05 }}
                                  className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                                >
                                  Archived
                                </motion.span>
                              )}
                            </div>
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
                  <Users className="h-12 w-12 admin-text-light mx-auto mb-4" />
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
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6"
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
              className="admin-card p-4 lg:p-6 rounded-lg shadow text-left group overflow-hidden relative"
            >
              {/* Animated background gradient */}
              <motion.div
                className={`absolute inset-0 bg-gradient-to-br from-${action.color}-50 to-${action.color}-100`}
                initial={{ opacity: 0, scale: 0.8 }}
                whileHover={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              />

              <div className="relative flex items-center space-x-3 lg:space-x-4">
                <motion.div
                  className={`bg-${action.color}-100 p-2 lg:p-3 rounded-lg group-hover:bg-${action.color}-200 transition-colors flex-shrink-0`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <action.icon className={`h-5 w-5 lg:h-6 lg:w-6 text-${action.color}-600`} />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <motion.h3
                    className="font-semibold admin-text text-sm lg:text-base"
                    whileHover={{ scale: 1.02 }}
                  >
                    {action.title}
                  </motion.h3>
                  <p className="text-xs lg:text-sm admin-text-light">
                    {action.description}
                  </p>
                </div>
                <motion.div
                  className="flex-shrink-0"
                  whileHover={{ x: 4, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <ArrowRight className="h-4 w-4 lg:h-5 lg:w-5 admin-text-light" />
                </motion.div>
              </div>
            </motion.button>
          ))}
        </motion.div>

        {/* AI Rating Section */}
        <motion.div variants={itemVariants}>
          <div className="admin-card rounded-lg shadow overflow-hidden">
            <div className="p-4 lg:p-6 border-b admin-border">
              <h3 className="text-base lg:text-lg font-semibold admin-text flex items-center space-x-2">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Sparkles className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
                </motion.div>
                <span>AI Rating Management</span>
              </h3>
              <p className="text-sm admin-text-light mt-1">
                Automatically rate applications using AI analysis
              </p>
            </div>
            <div className="p-4 lg:p-6">
              <BulkAIRating 
                applications={applications}
                onRatingComplete={(summary) => {
                  // Refresh applications data after rating
                  queryClient.invalidateQueries(['applications']);
                  console.log(`Bulk rating completed: ${summary.successful} successful, ${summary.failed} failed`);
                }}
              />
            </div>
          </div>
        </motion.div>

        {/* Auto-Archive Admin Section */}
        {autoArchivePreview && (
          <motion.div variants={itemVariants}>
            <div className="admin-card rounded-lg shadow overflow-hidden">
              <div className="p-4 lg:p-6 border-b admin-border">
                <h3 className="text-base lg:text-lg font-semibold admin-text flex items-center space-x-2">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Settings className="h-4 w-4 lg:h-5 lg:w-5 text-purple-600" />
                  </motion.div>
                  <span>Auto-Archive Management</span>
                </h3>
              </div>
              <div className="p-4 lg:p-6">
                <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-3">
                      <div className="text-center">
                        <div className="text-2xl font-bold admin-text">
                          {autoArchivePreview.count || 0}
                        </div>
                        <div className="text-xs admin-text-light">
                          Applications Ready
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold admin-text text-orange-600">
                          {autoArchivePreview.daysThreshold || 0}
                        </div>
                        <div className="text-xs admin-text-light">
                          Days Threshold
                        </div>
                      </div>
                    </div>
                    <p className="text-sm admin-text-light">
                      {autoArchivePreview.count > 0 
                        ? `${autoArchivePreview.count} rejected applications are older than ${autoArchivePreview.daysThreshold} days and ready for auto-archiving.`
                        : `No rejected applications older than ${autoArchivePreview.daysThreshold || 0} days found.`
                      }
                    </p>
                    {autoArchivePreview.count > 0 && autoArchivePreview.applications?.length > 0 && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="text-xs font-medium admin-text mb-2">Preview (showing first 5):</div>
                        <div className="space-y-1">
                          {autoArchivePreview.applications.slice(0, 5).map((app) => (
                            <div key={app.id} className="text-xs admin-text-light flex items-center justify-between">
                              <span>{app.name} ({app.email})</span>
                              <span>{app.daysRejected} days ago</span>
                            </div>
                          ))}
                          {autoArchivePreview.applications.length > 5 && (
                            <div className="text-xs admin-text-light text-center pt-1">
                              ...and {autoArchivePreview.applications.length - 5} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col space-y-2 lg:ml-6">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleAutoArchive}
                      disabled={autoArchiving || !autoArchivePreview.count || autoArchivePreview.count === 0}
                      className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        autoArchiving || !autoArchivePreview.count || autoArchivePreview.count === 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
                      }`}
                    >
                      {autoArchiving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Archive className="h-4 w-4" />
                          <span>Run Auto-Archive</span>
                        </>
                      )}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => router.push("/admin/settings")}
                      className="flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Auto-Progress Admin Section */}
        {autoProgressPreview && (
          <motion.div
            variants={itemVariants}
            className="admin-card rounded-xl shadow-sm border admin-border overflow-hidden"
          >
            <div className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <ArrowUpRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold admin-text">
                        <span>Auto-Progress Management</span>
                      </h3>
                      <p className="text-sm admin-text-light">
                        Automatically move applications from Applied to Reviewing
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-lg admin-text">
                        {autoProgressPreview.count || 0}
                      </div>
                      <div className="admin-text-light">Ready</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-lg admin-text">
                        {autoProgressPreview.daysThreshold || 0}
                      </div>
                      <div className="admin-text-light">Days</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                  <p className="text-sm admin-text-light mb-3">
                    {autoProgressPreview.count > 0 
                      ? `${autoProgressPreview.count} applications in "Applied" status are older than ${autoProgressPreview.daysThreshold} days and ready for auto-progression to "Reviewing".`
                      : `No applications in "Applied" status older than ${autoProgressPreview.daysThreshold || 0} days found.`
                    }
                  </p>

                  {autoProgressPreview.count > 0 && autoProgressPreview.applications?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs admin-text-light font-medium mb-2">Recent applications to be progressed:</p>
                      <div className="space-y-1">
                        {autoProgressPreview.applications.slice(0, 5).map((app) => (
                          <div key={app.id} className="text-xs admin-text-light flex justify-between">
                            <span>{app.name} - {app.jobTitle}</span>
                            <span>{app.daysApplied} days ago</span>
                          </div>
                        ))}
                        {autoProgressPreview.applications.length > 5 && (
                          <div className="text-xs admin-text-light font-medium">
                            ...and {autoProgressPreview.applications.length - 5} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs admin-text-light">
                    Applications will automatically progress at midnight daily
                  </div>
                  <div className="flex items-center space-x-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleAutoProgress}
                      disabled={autoProgressing || !autoProgressPreview.count || autoProgressPreview.count === 0}
                      className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        autoProgressing || !autoProgressPreview.count || autoProgressPreview.count === 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                      }`}
                    >
                      {autoProgressing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="h-4 w-4" />
                          <span>Run Auto-Progress</span>
                        </>
                      )}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => router.push("/applications-manager/settings")}
                      className="flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </motion.div>
  );
}
