// app/applications-manager/layout.js
"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AdminThemeProvider,
  useThemeClasses,
} from "@/app/contexts/AdminThemeContext";
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
  const { data: session } = useSession();
  const { getButtonClasses } = useThemeClasses();
  const { data: jobs = [] } = useJobsSimple();
  const [showJobPicker, setShowJobPicker] = useState(false);

  // Check admin permissions
  if (!session?.user?.privilegeLevel || session.user.privilegeLevel < 1) {
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

  // Navigation structure
  const navigationItems = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutGrid,
      path: "/applications-manager",
      active: pathname === "/applications-manager",
      description: "Main dashboard and quick stats",
    },
    {
      id: "pipeline",
      label: "Pipeline",
      icon: Kanban,
      path: "/applications-manager/pipeline",
      active: pathname === "/applications-manager/pipeline",
      description: "Kanban-style workflow management",
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
      path: "/applications-manager/analytics",
      active: pathname === "/applications-manager/analytics",
      description: "Detailed insights and reports",
    },
    {
      id: "communication",
      label: "Communication",
      icon: Mail,
      path: "/applications-manager/communication",
      active: pathname.startsWith("/applications-manager/communication"),
      description: "Email templates and history",
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      path: "/applications-manager/settings",
      active: pathname === "/applications-manager/settings",
      description: "Configure workflows and automation",
    },
  ];

  // Determine current context
  const isJobSpecific = pathname.includes("/job/");
  const isCandidateSpecific = pathname.includes("/candidate/");
  const jobId = isJobSpecific
    ? pathname.split("/job/")[1]?.split("/")[0]
    : null;
  const currentJob = jobId ? jobs.find((job) => job.id === jobId) : null;

  const handleJobSelect = (selectedJobId) => {
    router.push(`/applications-manager/job/${selectedJobId}`);
    setShowJobPicker(false);
  };

  const handleBackToDashboard = () => {
    router.push("/admin/dashboard");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Logo/Brand and breadcrumb */}
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToDashboard}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">Back to Dashboard</span>
              </button>

              <div className="h-6 border-l border-gray-300"></div>

              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">
                    Applications Manager
                  </h1>
                  {isJobSpecific && currentJob && (
                    <p className="text-xs text-gray-500">
                      {currentJob.title} • {currentJob.department}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right side - Quick actions */}
            <div className="flex items-center space-x-3">
              {/* Quick Job Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowJobPicker(!showJobPicker)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-sm ${getButtonClasses("secondary")}`}
                >
                  <Search className="h-4 w-4" />
                  <span>Jump to Job</span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {showJobPicker && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-80 overflow-y-auto">
                    <div className="p-3 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Select Job
                      </h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {jobs.map((job) => (
                        <button
                          key={job.id}
                          onClick={() => handleJobSelect(job.id)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="text-sm font-medium text-gray-900">
                            {job.title}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 flex items-center space-x-2">
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
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-sm text-gray-500">
                {session.user.firstName} {session.user.lastName}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex space-x-6">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600">
                <div className="flex items-center space-x-2 text-white">
                  <Zap className="h-5 w-5" />
                  <span className="font-semibold">Navigation</span>
                </div>
              </div>

              <nav className="p-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => router.push(item.path)}
                      className={`w-full text-left px-3 py-3 rounded-lg transition-colors mb-1 ${
                        item.active
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon
                          className={`h-5 w-5 ${item.active ? "text-blue-600" : "text-gray-400"}`}
                        />
                        <div className="flex-1">
                          <div
                            className={`text-sm font-medium ${item.active ? "text-blue-900" : "text-gray-900"}`}
                          >
                            {item.label}
                          </div>
                          <div
                            className={`text-xs ${item.active ? "text-blue-600" : "text-gray-500"}`}
                          >
                            {item.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </nav>

              {/* Quick Stats in Sidebar */}
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  Quick Stats
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Applications</span>
                    <span className="font-medium text-gray-900">
                      {jobs.reduce((sum, job) => sum + job.applicationCount, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Active Jobs</span>
                    <span className="font-medium text-gray-900">
                      {jobs.filter((job) => job.status === "Active").length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function ApplicationsManagerLayout({ children }) {
  return (
    <AdminThemeProvider>
      <ApplicationsManagerLayoutContent>
        {children}
      </ApplicationsManagerLayoutContent>
    </AdminThemeProvider>
  );
}
