// app/applications-manager/layout.js - Fixed animation timing issues
"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AdminThemeProvider,
  useThemeClasses,
} from "@/app/contexts/AdminThemeContext";
import { ThemeProvider } from "@/app/contexts/ThemeContext";
import ThemeToggle from "@/app/components/ThemeToggle";
import { useJobsSimple } from "@/app/hooks/useAdminData";
import {
  LayoutGrid,
  Kanban,
  BarChart3,
  Mail,
  Settings,
  Search,
  ChevronDown,
  ArrowLeft,
  Target,
  Zap,
} from "lucide-react";

function ApplicationsManagerLayoutContent({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { getButtonClasses, getStatCardClasses } = useThemeClasses();
  const { data: jobs = [] } = useJobsSimple();
  const [showJobPicker, setShowJobPicker] = useState(false);

  // Show loading state while session is being fetched
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check admin permissions only after session is loaded
  if (
    status === "authenticated" &&
    (!session?.user?.privilegeLevel || session.user.privilegeLevel < 1)
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You need admin privileges to access the Applications Manager.
          </p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect or show login prompt
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Authentication Required
          </h1>
          <p className="text-gray-600">
            Please log in to access the Applications Manager.
          </p>
        </div>
      </div>
    );
  }

  // Navigation structure with enhanced metadata for animations
  const navigationItems = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutGrid,
      path: "/applications-manager",
      active:
        pathname === "/applications-manager" ||
        pathname.startsWith("/applications-manager/jobs/"),
      description: "Main dashboard and quick stats",
      color: "blue",
    },
    {
      id: "pipeline",
      label: "Pipeline",
      icon: Kanban,
      path: "/applications-manager/pipeline",
      active: pathname === "/applications-manager/pipeline",
      description: "Kanban-style workflow management",
      color: "green",
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
      path: "/applications-manager/analytics",
      active: pathname === "/applications-manager/analytics",
      description: "Detailed insights and reports",
      color: "indigo",
    },
    {
      id: "communication",
      label: "Communication",
      icon: Mail,
      path: "/applications-manager/communication",
      active: pathname.startsWith("/applications-manager/communication"),
      description: "Email templates and history",
      color: "orange",
    },
    {
      id: "automation",
      label: "Automation",
      icon: Zap,
      path: "/applications-manager/automation",
      active: pathname === "/applications-manager/automation",
      description: "Automated email triggers and rules",
      color: "purple",
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      path: "/applications-manager/settings",
      active: pathname === "/applications-manager/settings",
      description: "Configure workflows and automation",
      color: "gray",
    },
  ];

  // Determine current context
  const isJobSpecific = pathname.includes("/jobs/");
  const isCandidateSpecific = pathname.includes("/candidate/");
  const jobId = isJobSpecific
    ? pathname.split("/jobs/")[1]?.split("/")[0]
    : null;
  const currentJob = jobId ? jobs.find((job) => job.id === jobId) : null;

  const handleJobSelect = (selectedJobId) => {
    router.push(`/applications-manager/jobs/${selectedJobId}`);
    setShowJobPicker(false);
  };

  const handleBackToDashboard = () => {
    router.push("/admin/dashboard");
  };

  // Fixed animation variants - prevent layout shifts
  const pageVariants = {
    initial: {
      opacity: 0,
      x: 3,
    },
    in: {
      opacity: 1,
      x: 0,
    },
    out: {
      opacity: 0,
      x: -3,
    },
  };

  const pageTransition = {
    type: "tween",
    ease: "easeOut",
    duration: 0.15,
  };
  const sidebarVariants = {
    hidden: {
      x: -20,
      opacity: 0,
    },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: "easeOut",
        staggerChildren: 0.05, // Faster stagger
      },
    },
  };

  const navItemVariants = {
    hidden: {
      x: -10,
      opacity: 0,
    },
    visible: {
      x: 0,
      opacity: 1,
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation Bar */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="admin-card shadow-sm border-b admin-border"
      >
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Logo/Brand and breadcrumb */}
            <div className="flex items-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleBackToDashboard}
                className="flex items-center space-x-2 admin-text-light hover:admin-text transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">Back to Dashboard</span>
              </motion.button>

              <div className="h-6 border-l admin-border"></div>

              <div className="flex items-center space-x-3">
                <motion.div
                  whileHover={{ rotate: 5 }}
                  className={`p-2 rounded-lg ${getStatCardClasses(0).bg}`}
                >
                  <Target className={`h-5 w-5 ${getStatCardClasses(0).icon}`} />
                </motion.div>
                <div>
                  <h1 className="text-lg font-bold admin-text">
                    Applications Manager
                  </h1>
                  {isJobSpecific && currentJob && (
                    <motion.p
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs admin-text-light"
                    >
                      {currentJob.title} • {currentJob.department}
                    </motion.p>
                  )}
                </div>
              </div>
            </div>

            {/* Right side - Quick actions */}
            <div className="flex items-center space-x-3">
              {/* Quick Job Selector */}
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowJobPicker(!showJobPicker)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-sm ${getButtonClasses("secondary")}`}
                >
                  <Search className="h-4 w-4" />
                  <span>Jump to Job</span>
                  <motion.div
                    animate={{ rotate: showJobPicker ? 180 : 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </motion.div>
                </motion.button>

                <AnimatePresence>
                  {showJobPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -5, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-80 admin-card rounded-lg shadow-lg border admin-border z-50 max-h-80 overflow-y-auto"
                    >
                      <div className="p-3 border-b admin-border">
                        <h3 className="text-sm font-semibold admin-text">
                          Select Job
                        </h3>
                      </div>
                      <div className="divide-y admin-border">
                        {jobs.map((job, index) => (
                          <motion.button
                            key={job.id}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.02 }}
                            whileHover={{ backgroundColor: "#f3f4f6" }}
                            onClick={() => handleJobSelect(job.id)}
                            className="w-full text-left px-4 py-3 transition-colors"
                          >
                            <div className="text-sm font-medium admin-text">
                              {job.title}
                            </div>
                            <div className="text-xs admin-text-light mt-1 flex items-center space-x-2">
                              <span>{job.department}</span>
                              <span>•</span>
                              <span>{job.applicationCount} applications</span>
                              <span>•</span>
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  job.status === "Active"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {job.status}
                              </span>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="text-sm admin-text-light">
                {session.user.firstName} {session.user.lastName}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex space-x-6">
          {/* Sidebar Navigation with Animation */}
          <motion.div
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            className="w-64 flex-shrink-0"
          >
            <div className="admin-card rounded-lg shadow-sm border admin-border overflow-hidden">
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className={`p-4 ${getStatCardClasses(1).bg}`}
              >
                <div
                  className={`flex items-center space-x-2 ${getStatCardClasses(1).icon}`}
                >
                  <Zap className="h-5 w-5" />
                  <span className="font-semibold">Navigation</span>
                </div>
              </motion.div>

              <nav className="p-2">
                {navigationItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.id}
                      variants={navItemVariants}
                      transition={{ delay: index * 0.03 }}
                    >
                      <motion.button
                        whileHover={{ scale: 1.01, x: 2 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => router.push(item.path)}
                        className={`w-full text-left px-3 py-3 rounded-lg transition-colors mb-1 relative ${
                          item.active
                            ? "text-white"
                            : "admin-text hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                        style={{ zIndex: item.active ? 10 : 1 }}
                      >
                        {/* Animated background for active state */}
                        {item.active && (
                          <motion.div
                            layoutId="activeNavBackground"
                            className="absolute inset-0 rounded-lg admin-active-tab-bg-dark"
                            style={{ zIndex: -1 }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 30,
                            }}
                            initial={false}
                          />
                        )}

                        <div className="relative flex items-center space-x-3">
                          <Icon
                            className={`h-5 w-5 transition-transform duration-150 ${
                              item.active
                                ? "text-white scale-105"
                                : "text-gray-400"
                            }`}
                          />
                          <div className="flex-1">
                            <div
                              className={`text-sm font-medium ${
                                item.active ? "text-white" : "admin-text"
                              }`}
                            >
                              {item.label}
                            </div>
                            <div
                              className={`text-xs ${
                                item.active
                                  ? "text-white text-opacity-80"
                                  : "admin-text-light"
                              }`}
                            >
                              {item.description}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    </motion.div>
                  );
                })}
              </nav>

              {/* Quick Stats in Sidebar with Animation */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-4 border-t admin-border bg-gray-50 dark:bg-gray-800"
              >
                <h4 className="text-xs font-semibold admin-text-light uppercase tracking-wide mb-3">
                  Quick Stats
                </h4>
                <div className="space-y-2">
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="flex justify-between text-sm"
                  >
                    <span className="admin-text-light">Total Applications</span>
                    <span className="font-medium admin-text">
                      {jobs.reduce((sum, job) => sum + job.applicationCount, 0)}
                    </span>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="flex justify-between text-sm"
                  >
                    <span className="admin-text-light">Active Jobs</span>
                    <span className="font-medium admin-text">
                      {jobs.filter((job) => job.status === "Active").length}
                    </span>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Main Content Area with Fixed Page Transitions */}
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function ApplicationsManagerLayout({ children }) {
  return (
    <ThemeProvider>
      <AdminThemeProvider>
        <ApplicationsManagerLayoutContent>
          {children}
        </ApplicationsManagerLayoutContent>
      </AdminThemeProvider>
    </ThemeProvider>
  );
}
