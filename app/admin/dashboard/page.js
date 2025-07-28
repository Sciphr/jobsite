// app/admin/dashboard/page.js - Updated to use React Query
"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import Link from "next/link";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { useAnimationSettings } from "@/app/hooks/useAnimationSettings";
import {
  useDashboardStats,
  usePrefetchAdminData,
} from "@/app/hooks/useAdminData";
import {
  Users,
  Briefcase,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Plus,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function AdminDashboard() {
  const { data: session } = useSession();
  const { getStatCardClasses, getButtonClasses, getThemeClasses } =
    useThemeClasses();

  const { prefetchAll } = usePrefetchAdminData();

  // Use React Query for dashboard stats
  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch,
  } = useDashboardStats();

  // Check if user is admin (privilege level 1 or higher)
  const isAdmin = session?.user?.privilegeLevel >= 1;

  if (!session || !isAdmin) {
    redirect("/auth/signin");
    return null;
  }

  const userPrivilegeLevel = session.user.privilegeLevel;
  const userRole = session.user.role;

  useEffect(() => {
    prefetchAll();
  }, [prefetchAll]);

  // Loading state (much faster now with React Query cache!)
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow border">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state with retry option
  if (isError) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-900 mb-2">
            Failed to Load Dashboard
          </h2>
          <p className="text-red-700 mb-6 max-w-md mx-auto">
            {error?.message || "There was an error loading the dashboard data."}
          </p>
          <button
            onClick={() => refetch()}
            className={`px-4 py-2 rounded-lg transition-colors duration-200 ${getButtonClasses("primary")}`}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const quickStats = [
    {
      title: "Total Applications",
      value: stats?.totalApplications || 0,
      icon: FileText,
      change: "+12%",
      visible: userPrivilegeLevel >= 1,
      href: "/admin/applications",
      statIndex: 0,
    },
    {
      title: "Active Jobs",
      value: stats?.totalJobs || 0,
      icon: Briefcase,
      change: "+3%",
      visible: userPrivilegeLevel >= 2,
      href: "/admin/jobs",
      statIndex: 1,
    },
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      change: "+8%",
      visible: userPrivilegeLevel >= 3,
      href: "/admin/users",
      statIndex: 2,
    },
    {
      title: "Job Views",
      value: 2847,
      icon: Eye,
      change: "+15%",
      visible: userPrivilegeLevel >= 2,
      href: "/admin/analytics",
      statIndex: 3,
    },
  ];

  const visibleStats = quickStats.filter((stat) => stat.visible);

  return (
    <div className="space-y-8 dark:bg-gray-900">
      {/* Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0 dark:bg-gray-900">
        <div className="flex-1">
          <h1 className="text-2xl lg:text-3xl font-bold admin-text">
            Welcome back, {session?.user?.name?.split(" ")[0] || "Admin"}!
          </h1>
          <p className="admin-text-light mt-2 text-sm lg:text-base">
            Here's what's happening with your job board today.
          </p>
        </div>
        <div className="admin-card px-4 py-3 rounded-lg shadow-sm bg-white dark:bg-gray-800 border dark:border-gray-700 self-start lg:self-auto">
          <div className="text-sm admin-text-light">Your Role</div>
          <div className="font-semibold admin-text capitalize">
            {userRole.replace("_", " ")}
          </div>
        </div>
      </div>

      {/* Quick Stats with Theme Support */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {visibleStats.map((stat, index) => {
          const Icon = stat.icon;
          const statClasses = getStatCardClasses(stat.statIndex);

          return (
            <Link
              key={index}
              href={stat.href}
              className={`stat-card admin-card p-4 lg:p-6 rounded-lg shadow ${statClasses.border} ${statClasses.hover} hover:shadow-md transition-all duration-200 group cursor-pointer`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium admin-text-light">
                    {stat.title}
                  </p>
                  <p className="text-2xl lg:text-3xl font-bold admin-text mt-2">
                    {typeof stat.value === "number"
                      ? stat.value.toLocaleString()
                      : stat.value}
                  </p>
                  <div className="flex items-center mt-2 flex-wrap">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600 ml-1">
                      {stat.change}
                    </span>
                    <span className="text-xs lg:text-sm admin-text-light ml-1">
                      vs last month
                    </span>
                  </div>
                </div>
                <div className={`stat-icon p-2 lg:p-3 rounded-lg ${statClasses.bg} flex-shrink-0`}>
                  <Icon className={`h-5 w-5 lg:h-6 lg:w-6 ${statClasses.icon}`} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Applications (HR and above) */}
        {userPrivilegeLevel >= 1 && (
          <div className="admin-card rounded-lg shadow">
            <div className="p-4 lg:p-6 border-b admin-text-light flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <h2 className="text-lg font-semibold admin-text">
                Recent Applications
              </h2>
              <Link
                href="/admin/applications"
                className="theme-primary-text hover:opacity-80 text-sm font-medium flex items-center space-x-1 transition-colors duration-200 self-start sm:self-auto"
              >
                <span>View all</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="p-4 lg:p-6">
              {stats?.recentApplications?.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentApplications
                    .slice(0, 5)
                    .map((application, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                      >
                        <div className="flex-1">
                          <div className="font-medium admin-text">
                            {application.name || "Anonymous"}
                          </div>
                          <div className="text-sm admin-text-light">
                            {application.jobTitle}
                          </div>
                          <div className="text-xs admin-text-light mt-1">
                            {new Date(
                              application.appliedAt
                            ).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              application.status === "Applied"
                                ? "bg-blue-100 text-blue-800"
                                : application.status === "Reviewing"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : application.status === "Interview"
                                    ? "bg-green-100 text-green-800"
                                    : application.status === "Hired"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : application.status === "Rejected"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {application.status}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="admin-text-light mb-2">
                    No recent applications
                  </p>
                  <p className="text-sm text-gray-400">
                    Applications will appear here when users apply to jobs
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent Jobs (Admin and above) */}
        {userPrivilegeLevel >= 2 && (
          <div className="admin-card rounded-lg shadow">
            <div className="p-4 lg:p-6 border-b admin-text-light flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <h2 className="text-lg font-semibold admin-text">Recent Jobs</h2>
              <Link
                href="/admin/jobs"
                className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center space-x-1 transition-colors duration-200 self-start sm:self-auto"
              >
                <span>View all</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="p-4 lg:p-6">
              {stats?.recentJobs?.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentJobs.slice(0, 5).map((job, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                    >
                      <div className="flex-1">
                        <div className="font-medium admin-text">
                          {job.title}
                        </div>
                        <div className="text-sm admin-text-light">
                          {job.department}
                        </div>
                        <div className="text-xs admin-text-light mt-1">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            job.status === "Active"
                              ? "bg-green-100 text-green-800"
                              : job.status === "Draft"
                                ? "bg-yellow-100 text-yellow-800"
                                : job.status === "Paused"
                                  ? "bg-orange-100 text-orange-800"
                                  : job.status === "Closed"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {job.status}
                        </span>
                        <span className="text-sm admin-text-light">
                          {job.applicationCount} apps
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="admin-text-light mb-2">No recent jobs</p>
                  <p className="text-sm text-gray-400">
                    Create your first job posting to get started
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions with Theme Support */}
      <div className="admin-card rounded-lg shadow p-4 lg:p-6">
        <h2 className="text-lg font-semibold admin-text mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {userPrivilegeLevel >= 1 && (
            <Link
              href="/admin/applications"
              className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-200 text-center group"
            >
              <FileText className="h-8 w-8 text-gray-400 group-hover:text-blue-600 mx-auto mb-2 transition-colors duration-200" />
              <div className="text-sm font-medium admin-text">
                Review Applications
              </div>
              <div className="text-xs admin-text-light">
                Check new applications
              </div>
            </Link>
          )}

          {userPrivilegeLevel >= 2 && (
            <Link
              href="/admin/jobs/create"
              className={`p-4 border-2 border-dashed border-gray-300 rounded-lg transition-colors duration-200 text-center group ${getButtonClasses("primary")} hover:border-opacity-0`}
            >
              <div className="flex items-center justify-center mb-2">
                <Briefcase className="h-6 w-6 text-white transition-colors duration-200" />
                <Plus className="h-4 w-4 text-white ml-1 transition-colors duration-200" />
              </div>
              <div className="text-sm font-medium text-white">Create Job</div>
              <div className="text-xs text-white text-opacity-80">
                Post a new position
              </div>
            </Link>
          )}

          {userPrivilegeLevel >= 3 && (
            <Link
              href="/admin/users"
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors duration-200 text-center group"
            >
              <Users className="h-8 w-8 text-gray-400 group-hover:text-purple-600 mx-auto mb-2 transition-colors duration-200" />
              <div className="text-sm font-medium admin-text">Manage Users</div>
              <div className="text-xs admin-text-light">Add or edit users</div>
            </Link>
          )}
        </div>
      </div>

      {/* System Status (Super Admin only) */}
      {userPrivilegeLevel >= 3 && (
        <div className="admin-card rounded-lg shadow p-4 lg:p-6">
          <h2 className="text-lg font-semibold admin-text mb-4">
            System Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-sm font-medium admin-text">Database</div>
                <div className="text-xs text-green-600">Connected</div>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-sm font-medium admin-text">
                  Email Service
                </div>
                <div className="text-xs text-green-600">Operational</div>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <div className="text-sm font-medium admin-text">Backup</div>
                <div className="text-xs text-yellow-600">Last: 2 hours ago</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
