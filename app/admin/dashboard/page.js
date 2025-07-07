"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
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
} from "lucide-react";

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalApplications: 0,
    totalUsers: 0,
    recentApplications: [],
    recentJobs: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch("/api/admin/dashboard-stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const userPrivilegeLevel = session?.user?.privilegeLevel || 0;
  const userRole = session?.user?.role || "user";

  if (loading) {
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

  const quickStats = [
    {
      title: "Total Applications",
      value: stats.totalApplications || 0,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      change: "+12%",
      visible: userPrivilegeLevel >= 1,
      href: "/admin/applications",
    },
    {
      title: "Active Jobs",
      value: stats.totalJobs || 0,
      icon: Briefcase,
      color: "text-green-600",
      bgColor: "bg-green-100",
      change: "+3%",
      visible: userPrivilegeLevel >= 2,
      href: "/admin/jobs",
    },
    {
      title: "Total Users",
      value: stats.totalUsers || 0,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      change: "+8%",
      visible: userPrivilegeLevel >= 3,
      href: "/admin/users",
    },
    {
      title: "Job Views",
      value: "2,847",
      icon: Eye,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      change: "+15%",
      visible: userPrivilegeLevel >= 2,
      href: "/admin/analytics",
    },
  ];

  const visibleStats = quickStats.filter((stat) => stat.visible);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {session?.user?.name?.split(" ")[0] || "Admin"}!
          </h1>
          <p className="text-gray-600 mt-2">
            Here's what's happening with your job board today.
          </p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500">Your Role</div>
          <div className="font-semibold text-gray-900 capitalize">
            {userRole.replace("_", " ")}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {visibleStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link
              key={index}
              href={stat.href}
              className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:shadow-md transition-all duration-200 group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stat.value}
                  </p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600 ml-1">
                      {stat.change}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">
                      vs last month
                    </span>
                  </div>
                </div>
                <div
                  className={`p-3 rounded-lg ${stat.bgColor} group-hover:scale-110 transition-transform duration-200`}
                >
                  <Icon className={`h-6 w-6 ${stat.color}`} />
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
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Applications
              </h2>
              <Link
                href="/admin/applications"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
              >
                <span>View all</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="p-6">
              {stats.recentApplications?.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentApplications
                    .slice(0, 5)
                    .map((application, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {application.name || "Anonymous"}
                          </div>
                          <div className="text-sm text-gray-600">
                            {application.jobTitle}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
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
                  <p className="text-gray-500 mb-2">No recent applications</p>
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
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Jobs
              </h2>
              <Link
                href="/admin/jobs"
                className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center space-x-1"
              >
                <span>View all</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="p-6">
              {stats.recentJobs?.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentJobs.slice(0, 5).map((job, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {job.title}
                        </div>
                        <div className="text-sm text-gray-600">
                          {job.department}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
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
                        <span className="text-sm text-gray-500">
                          {job.applicationCount} apps
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">No recent jobs</p>
                  <p className="text-sm text-gray-400">
                    Create your first job posting to get started
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {userPrivilegeLevel >= 1 && (
            <Link
              href="/admin/applications"
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors duration-200 text-center group"
            >
              <FileText className="h-8 w-8 text-gray-400 group-hover:text-blue-600 mx-auto mb-2 transition-colors duration-200" />
              <div className="text-sm font-medium text-gray-900">
                Review Applications
              </div>
              <div className="text-xs text-gray-500">
                Check new applications
              </div>
            </Link>
          )}

          {userPrivilegeLevel >= 2 && (
            <Link
              href="/admin/jobs/create"
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors duration-200 text-center group"
            >
              <div className="flex items-center justify-center mb-2">
                <Briefcase className="h-6 w-6 text-gray-400 group-hover:text-green-600 transition-colors duration-200" />
                <Plus className="h-4 w-4 text-gray-400 group-hover:text-green-600 ml-1 transition-colors duration-200" />
              </div>
              <div className="text-sm font-medium text-gray-900">
                Create Job
              </div>
              <div className="text-xs text-gray-500">Post a new position</div>
            </Link>
          )}

          {userPrivilegeLevel >= 3 && (
            <Link
              href="/admin/users"
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors duration-200 text-center group"
            >
              <Users className="h-8 w-8 text-gray-400 group-hover:text-purple-600 mx-auto mb-2 transition-colors duration-200" />
              <div className="text-sm font-medium text-gray-900">
                Manage Users
              </div>
              <div className="text-xs text-gray-500">Add or edit users</div>
            </Link>
          )}
        </div>
      </div>

      {/* System Status (Super Admin only) */}
      {userPrivilegeLevel >= 3 && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            System Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  Database
                </div>
                <div className="text-xs text-green-600">Connected</div>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  Email Service
                </div>
                <div className="text-xs text-green-600">Operational</div>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <div className="text-sm font-medium text-gray-900">Backup</div>
                <div className="text-xs text-yellow-600">Last: 2 hours ago</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
