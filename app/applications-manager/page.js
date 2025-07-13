// app/applications-manager/page.js
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { useApplications, useJobsSimple } from "@/app/hooks/useAdminData";
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
} from "lucide-react";

export default function ApplicationsManagerMain() {
  const router = useRouter();
  const { getStatCardClasses, getButtonClasses } = useThemeClasses();

  // Data fetching
  const { data: applications = [], isLoading: applicationsLoading } =
    useApplications();
  const { data: jobs = [], isLoading: jobsLoading } = useJobsSimple();

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

  if (applicationsLoading || jobsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 rounded"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold admin-text flex items-center space-x-3">
            <Target className="h-8 w-8 text-blue-600" />
            <span>Applications Manager</span>
          </h1>
          <p className="admin-text-light mt-2">
            Enterprise-level application management and hiring workflows
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push("/applications-manager/pipeline")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${getButtonClasses("secondary")}`}
          >
            <Filter className="h-4 w-4" />
            <span>Pipeline View</span>
          </button>
          <button
            onClick={() => router.push("/applications-manager/analytics")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${getButtonClasses("primary")}`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div
          className={`stat-card admin-card p-6 rounded-lg shadow ${getStatCardClasses(0).border} ${getStatCardClasses(0).hover}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold admin-text">{stats.total}</div>
              <div className="text-sm admin-text-light font-medium">
                Total Applications
              </div>
              <div className="text-xs admin-text-light mt-1">
                {stats.thisWeek} this week (+
                {Math.round((stats.thisWeek / stats.total) * 100) || 0}%)
              </div>
            </div>
            <div
              className={`stat-icon p-3 rounded-lg ${getStatCardClasses(0).bg}`}
            >
              <Users className={`h-6 w-6 ${getStatCardClasses(0).icon}`} />
            </div>
          </div>
        </div>

        <div
          className={`stat-card admin-card p-6 rounded-lg shadow ${getStatCardClasses(1).border} ${getStatCardClasses(1).hover}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold admin-text">
                {stats.statusCounts.Interview || 0}
              </div>
              <div className="text-sm admin-text-light font-medium">
                In Interview
              </div>
              <div className="text-xs admin-text-light mt-1">
                Active pipeline stage
              </div>
            </div>
            <div
              className={`stat-icon p-3 rounded-lg ${getStatCardClasses(1).bg}`}
            >
              <Calendar className={`h-6 w-6 ${getStatCardClasses(1).icon}`} />
            </div>
          </div>
        </div>

        <div
          className={`stat-card admin-card p-6 rounded-lg shadow ${getStatCardClasses(2).border} ${getStatCardClasses(2).hover}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold admin-text">
                {stats.conversionRate}%
              </div>
              <div className="text-sm admin-text-light font-medium">
                Hire Rate
              </div>
              <div className="text-xs admin-text-light mt-1">
                Application to hire conversion
              </div>
            </div>
            <div
              className={`stat-icon p-3 rounded-lg ${getStatCardClasses(2).bg}`}
            >
              <TrendingUp className={`h-6 w-6 ${getStatCardClasses(2).icon}`} />
            </div>
          </div>
        </div>

        <div
          className={`stat-card admin-card p-6 rounded-lg shadow ${getStatCardClasses(3).border} ${getStatCardClasses(3).hover}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold admin-text">
                {stats.avgTimeToHire}
              </div>
              <div className="text-sm admin-text-light font-medium">
                Avg. Days to Hire
              </div>
              <div className="text-xs admin-text-light mt-1">
                From application to offer
              </div>
            </div>
            <div
              className={`stat-icon p-3 rounded-lg ${getStatCardClasses(3).bg}`}
            >
              <Clock className={`h-6 w-6 ${getStatCardClasses(3).icon}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Performing Jobs */}
        <div className="lg:col-span-2">
          <div className="admin-card rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span>Top Performing Jobs</span>
                </h3>
                <button
                  onClick={() => router.push("/applications-manager/analytics")}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
                >
                  <span>View All</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-6">
              {topJobs.length > 0 ? (
                <div className="space-y-4">
                  {topJobs.map((job, index) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() =>
                        router.push(`/applications-manager/jobs/${job.id}`)
                      }
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
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
                      <div className="text-right">
                        <div className="text-lg font-bold admin-text">
                          {job.applicationCount}
                        </div>
                        <div className="text-xs admin-text-light">
                          total applications
                        </div>
                        {job.weeklyApplications > 0 && (
                          <div className="text-xs text-green-600">
                            +{job.weeklyApplications} this week
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="admin-text-light">
                    No job performance data available yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Jobs Needing Attention */}
        <div>
          <div className="admin-card rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold admin-text flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <span>Needs Attention</span>
              </h3>
            </div>
            <div className="p-6">
              {jobsNeedingAttention.length > 0 ? (
                <div className="space-y-4">
                  {jobsNeedingAttention.map((job) => (
                    <div
                      key={job.id}
                      className="p-3 border border-orange-200 bg-orange-50 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors"
                      onClick={() =>
                        router.push(`/applications-manager/jobs/${job.id}`)
                      }
                    >
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
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <p className="admin-text-light text-sm">
                    All jobs performing well!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="admin-card rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold admin-text">
              Recent Activity
            </h3>
            <button
              onClick={() => router.push("/applications-manager/pipeline")}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
            >
              <span>View Pipeline</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="p-6">
          {recentActivity.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentActivity.map((application) => (
                <div
                  key={application.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() =>
                    router.push(
                      `/applications-manager/jobs/${application.jobId}`
                    )
                  }
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium admin-text text-sm">
                        {application.name || "Anonymous"}
                      </h4>
                      <p className="text-xs admin-text-light mt-1">
                        {application.job?.title}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span
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
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs admin-text-light mt-3">
                    {new Date(application.appliedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="admin-text-light">No recent applications.</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => router.push("/applications-manager/pipeline")}
          className="admin-card p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left group"
        >
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 p-3 rounded-lg group-hover:bg-blue-200 transition-colors">
              <Filter className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold admin-text">Pipeline Management</h3>
              <p className="text-sm admin-text-light">
                Kanban-style workflow view
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push("/applications-manager/communication")}
          className="admin-card p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left group"
        >
          <div className="flex items-center space-x-4">
            <div className="bg-green-100 p-3 rounded-lg group-hover:bg-green-200 transition-colors">
              <Mail className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold admin-text">Communication Hub</h3>
              <p className="text-sm admin-text-light">
                Templates and messaging
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push("/applications-manager/analytics")}
          className="admin-card p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left group"
        >
          <div className="flex items-center space-x-4">
            <div className="bg-purple-100 p-3 rounded-lg group-hover:bg-purple-200 transition-colors">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold admin-text">Advanced Analytics</h3>
              <p className="text-sm admin-text-light">Insights and reporting</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
