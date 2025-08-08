// app/admin/approvals/page.js - General approvals page with tabs
"use client";

import { useState, useEffect } from "react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { usePermissions } from "@/app/hooks/usePermissions";
import { motion } from "framer-motion";
import { 
  UserCheck, 
  Briefcase, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  RefreshCw 
} from "lucide-react";
import HireApprovalsTab from "./components/HireApprovalsTab";
import JobApprovalsTab from "./components/JobApprovalsTab";

function ApprovalsContent() {
  const { getStatCardClasses, getButtonClasses } = useThemeClasses();
  const { hasPermission, loading: permissionsLoading, refreshPermissions } = usePermissions();
  
  // Define all possible tabs
  const allTabs = [
    {
      id: "hire-approvals",
      label: "Hire Approvals",
      icon: UserCheck,
      description: "Review candidate hire requests",
      color: "blue",
      permission: { resource: "applications", action: "approve_hire" },
    },
    {
      id: "job-approvals", 
      label: "Job Approvals",
      icon: Briefcase,
      description: "Review job posting requests",
      color: "green",
      permission: { resource: "jobs", action: "approve" },
    },
  ];

  // Filter tabs based on user permissions with debug logging
  const availableTabs = allTabs.filter(tab => {
    const hasAccess = hasPermission(tab.permission.resource, tab.permission.action);
    console.log(`Permission check for ${tab.label}: ${tab.permission.resource}:${tab.permission.action} = ${hasAccess}`);
    return hasAccess;
  });

  const [activeTab, setActiveTab] = useState("");

  // Update active tab when available tabs change
  useEffect(() => {
    if (availableTabs.length > 0) {
      // If current active tab is still available, keep it
      const isCurrentTabAvailable = availableTabs.some(tab => tab.id === activeTab);
      if (!isCurrentTabAvailable || !activeTab) {
        setActiveTab(availableTabs[0].id);
      }
    }
  }, [availableTabs.length, hasPermission, activeTab]);

  const tabs = availableTabs;

  // Show loading while permissions are being checked
  if (permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading approvals...</p>
        </div>
      </div>
    );
  }

  // Handle case where user has no permissions for any tabs
  if (availableTabs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No Approvals Available
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            You don't have permission to view any approval sections.
          </p>
        </div>
      </div>
    );
  }

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

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold admin-text">
              Approvals Management
            </h1>
            <p className="text-sm admin-text-light mt-1">
              Review and approve hire requests and job postings
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={refreshPermissions}
              className={`${getButtonClasses("secondary")} inline-flex items-center`}
              title="Refresh permissions"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
            <div className="flex items-center space-x-1 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Pending Reviews
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div variants={itemVariants}>
        <div className="admin-card rounded-lg border admin-border">
          <div className="p-6">
            <nav className="flex space-x-8" aria-label="Approval Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                      isActive
                        ? "border-blue-500 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                    }`}
                  >
                    <Icon
                      className={`-ml-0.5 mr-2 h-5 w-5 ${
                        isActive
                          ? "text-blue-500 dark:text-blue-400"
                          : "text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400"
                      }`}
                    />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </motion.div>

      {/* Tab Content */}
      <motion.div variants={itemVariants}>
        <div className="admin-card rounded-lg border admin-border">
          <div className="p-6">
            {activeTab === "hire-approvals" && <HireApprovalsTab />}
            {activeTab === "job-approvals" && <JobApprovalsTab />}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ApprovalsPage() {
  const { hasPermission, loading } = usePermissions();

  // Show loading while permissions are being checked
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading permissions...</p>
        </div>
      </div>
    );
  }

  // Check if user has either hire approval or job approval permissions
  const canAccessApprovals = hasPermission("applications", "approve_hire") || hasPermission("jobs", "approve");

  if (!canAccessApprovals) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            You don't have permission to access the approvals system.
          </p>
        </div>
      </div>
    );
  }

  return <ApprovalsContent />;
}