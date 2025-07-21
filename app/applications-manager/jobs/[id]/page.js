// app/applications-manager/job/[jobId]/page.js
"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { useApplications, useJob } from "@/app/hooks/useAdminData";
import BulkActionsBar from "../../components/BulkActionsBar";
import QuickActions from "../../components/QuickActions";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Eye,
  Download,
  MoreHorizontal,
  Search,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Briefcase,
  MapPin,
  DollarSign,
  Users,
} from "lucide-react";

export default function JobSpecificApplications() {
  const { id: jobId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getStatCardClasses, getButtonClasses } = useThemeClasses();

  // Track where user came from
  const [referrer, setReferrer] = useState("overview");

  useEffect(() => {
    const from = searchParams.get("from");
    if (from) {
      setReferrer(from);
    }
  }, [searchParams]);

  // Data fetching
  const { data: allApplications = [], isLoading: applicationsLoading } =
    useApplications();
  const { data: job, isLoading: jobLoading } = useJob(jobId);

  // Add these debug lines:
  console.log("🔍 Debug - jobId from URL:", jobId);
  console.log("🔍 Debug - job data:", job);
  console.log("🔍 Debug - jobLoading:", jobLoading);
  console.log("🔍 Debug - API URL would be:", `/api/admin/jobs/${jobId}`);

  // Local state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedApplications, setSelectedApplications] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Filter applications for this specific job
  const jobApplications = useMemo(() => {
    return allApplications.filter((app) => app.jobId === jobId);
  }, [allApplications, jobId]);

  // Apply filters and search
  const filteredApplications = useMemo(() => {
    let filtered = jobApplications;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (app) =>
          app.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.appliedAt) - new Date(a.appliedAt);
        case "oldest":
          return new Date(a.appliedAt) - new Date(b.appliedAt);
        case "name":
          return (a.name || a.email).localeCompare(b.name || b.email);
        default:
          return 0;
      }
    });

    return filtered;
  }, [jobApplications, searchTerm, statusFilter, sortBy]);

  // Calculate statistics
  const stats = useMemo(() => {
    const statusCounts = jobApplications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});

    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentApplications = jobApplications.filter(
      (app) => new Date(app.appliedAt) >= weekAgo
    ).length;

    return {
      total: jobApplications.length,
      applied: statusCounts.Applied || 0,
      reviewing: statusCounts.Reviewing || 0,
      interview: statusCounts.Interview || 0,
      hired: statusCounts.Hired || 0,
      rejected: statusCounts.Rejected || 0,
      recentApplications,
      conversionRate:
        jobApplications.length > 0
          ? Math.round(
              ((statusCounts.Hired || 0) / jobApplications.length) * 100
            )
          : 0,
    };
  }, [jobApplications]);

  const statusOptions = [
    "Applied",
    "Reviewing",
    "Interview",
    "Hired",
    "Rejected",
  ];

  // Handle bulk selection
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedApplications(filteredApplications.map((app) => app.id));
    } else {
      setSelectedApplications([]);
    }
  };

  const handleSelectApplication = (applicationId, checked) => {
    if (checked) {
      setSelectedApplications((prev) => [...prev, applicationId]);
    } else {
      setSelectedApplications((prev) =>
        prev.filter((id) => id !== applicationId)
      );
    }
  };

  const updateApplicationStatus = async (applicationId, newStatus) => {
    try {
      const response = await fetch(`/api/admin/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      // Handle success/error - could add toast notifications here
    } catch (error) {
      console.error("Error updating application status:", error);
    }
  };

  const handleBulkStatusChange = async (status) => {
    if (selectedApplications.length === 0) return;

    const statusLabels = {
      Applied: "Applied",
      Reviewing: "Under Review", 
      Interview: "Interview",
      Hired: "Hired",
      Rejected: "Rejected"
    };

    const confirmMessage = `Are you sure you want to mark ${selectedApplications.length} application(s) as ${statusLabels[status]}?`;
    if (!confirm(confirmMessage)) return;

    setBulkLoading(true);
    try {
      await Promise.all(
        selectedApplications.map((id) =>
          fetch(`/api/admin/applications/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          })
        )
      );
      setSelectedApplications([]);
      // Note: React Query should automatically refetch and update the UI
    } catch (error) {
      console.error("Error performing bulk status change:", error);
      alert("Failed to update application statuses. Please try again.");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkEmail = async (emailType, templateId = null) => {
    if (selectedApplications.length === 0) return;
    
    // Get selected applications with full details
    const selectedApps = filteredApplications.filter(app => 
      selectedApplications.includes(app.id)
    );
    
    // Navigate to communication hub with selected recipients and email type
    const params = new URLSearchParams({
      recipients: selectedApps.map(app => app.email).join(','),
      emailType: emailType,
      jobId: jobId
    });
    
    // Add template ID if provided
    if (templateId) {
      params.set('templateId', templateId);
    }
    
    router.push(`/applications-manager/communication?${params}`);
  };

  const handleStatusChange = async (applicationId, newStatus) => {
    try {
      await fetch(`/api/admin/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      // React Query will handle the UI update
    } catch (error) {
      console.error("Error updating application status:", error);
      alert("Failed to update application status. Please try again.");
    }
  };

  const handleViewApplication = (application) => {
    // Navigate to application details or open modal
    router.push(`/admin/applications/${application.id}`);
  };

  const handleEmailApplication = (application) => {
    // Navigate to communication page with pre-filled recipient
    router.push(`/applications-manager/communication?recipient=${application.id}`);
  };

  // Legacy handler for backward compatibility
  const handleBulkAction = async (action) => {
    await handleBulkStatusChange(action);
  };

  const getStatusColor = (status) => {
    const statusMap = {
      Applied: 0,
      Reviewing: 1, 
      Interview: 2,
      Hired: 3,
      Rejected: 4,
    };
    const statIndex = statusMap[status] || 0;
    return `${getStatCardClasses(statIndex).bg} ${getStatCardClasses(statIndex).icon} ${getStatCardClasses(statIndex).border}`;
  };

  const formatSalary = (min, max, currency) => {
    if (!min && !max) return "Not specified";
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "CAD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    if (min && max) {
      return `${formatter.format(min)} - ${formatter.format(max)}`;
    }
    return formatter.format(min || max);
  };

  if (applicationsLoading || jobLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="h-32 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Job Not Found
        </h3>
        <p className="text-gray-500 mb-4">
          The job you're looking for doesn't exist or has been removed.
        </p>
        <button
          onClick={() => router.push("/applications-manager")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${getButtonClasses("primary")}`}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Overview</span>
        </button>
      </div>
    );
  }

  // Determine back navigation based on referrer
  const getBackNavigation = () => {
    switch (referrer) {
      case "pipeline":
        return {
          path: "/applications-manager/pipeline",
          label: "Back to Pipeline"
        };
      case "analytics":
        return {
          path: "/applications-manager/analytics", 
          label: "Back to Analytics"
        };
      default:
        return {
          path: "/applications-manager",
          label: "Back to Overview"
        };
    }
  };

  const backNav = getBackNavigation();

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => router.push(backNav.path)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{backNav.label}</span>
        </button>
      </div>

      {/* Job Context Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg overflow-hidden text-white">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                  <Briefcase className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{job.title}</h1>
                  <p className="text-blue-100">{job.department}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-blue-200" />
                  <span>
                    {job.location} • {job.remotePolicy}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-blue-200" />
                  <span>
                    {formatSalary(
                      job.salaryMin,
                      job.salaryMax,
                      job.salaryCurrency
                    )}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-200" />
                  <span>
                    Posted {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-2xl font-bold">{job.applicationCount}</div>
                <div className="text-blue-200 text-sm">Total Applications</div>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  job.status === "Active"
                    ? "bg-green-100 text-green-800"
                    : job.status === "Paused"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                }`}
              >
                {job.status}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div
          className={`stat-card admin-card p-4 rounded-lg shadow ${getStatCardClasses(0).border} ${getStatCardClasses(0).hover}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold admin-text">{stats.total}</div>
              <div className="text-sm admin-text-light font-medium">Total</div>
            </div>
            <User className={`h-5 w-5 ${getStatCardClasses(0).icon}`} />
          </div>
        </div>

        <div
          className={`stat-card admin-card p-4 rounded-lg shadow ${getStatCardClasses(1).border} ${getStatCardClasses(1).hover}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold admin-text">
                {stats.applied}
              </div>
              <div className="text-sm admin-text-light font-medium">New</div>
            </div>
            <Mail className={`h-5 w-5 ${getStatCardClasses(1).icon}`} />
          </div>
        </div>

        <div
          className={`stat-card admin-card p-4 rounded-lg shadow ${getStatCardClasses(2).border} ${getStatCardClasses(2).hover}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold admin-text">
                {stats.reviewing}
              </div>
              <div className="text-sm admin-text-light font-medium">
                Reviewing
              </div>
            </div>
            <Eye className={`h-5 w-5 ${getStatCardClasses(2).icon}`} />
          </div>
        </div>

        <div
          className={`stat-card admin-card p-4 rounded-lg shadow ${getStatCardClasses(3).border} ${getStatCardClasses(3).hover}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold admin-text">
                {stats.interview}
              </div>
              <div className="text-sm admin-text-light font-medium">
                Interview
              </div>
            </div>
            <Calendar className={`h-5 w-5 ${getStatCardClasses(3).icon}`} />
          </div>
        </div>

        <div
          className={`stat-card admin-card p-4 rounded-lg shadow ${getStatCardClasses(4).border} ${getStatCardClasses(4).hover}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold admin-text">{stats.hired}</div>
              <div className="text-sm admin-text-light font-medium">Hired</div>
            </div>
            <CheckCircle className={`h-5 w-5 ${getStatCardClasses(4).icon}`} />
          </div>
        </div>

        <div
          className={`stat-card admin-card p-4 rounded-lg shadow ${getStatCardClasses(5).border} ${getStatCardClasses(5).hover}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold admin-text">
                {stats.conversionRate}%
              </div>
              <div className="text-sm admin-text-light font-medium">
                Hire Rate
              </div>
            </div>
            <TrendingUp className={`h-5 w-5 ${getStatCardClasses(5).icon}`} />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="admin-card p-6 rounded-lg shadow">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search applicants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text"
            >
              <option value="all">All Statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name A-Z</option>
            </select>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm admin-text-light">
              Showing {filteredApplications.length} of {jobApplications.length}{" "}
              applications
            </div>
            {selectedApplications.length > 0 && (
              <div className="text-sm text-blue-600 font-medium">
                {selectedApplications.length} selected
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Bulk Actions */}
      <BulkActionsBar
        selectedCount={selectedApplications.length}
        onBulkStatusChange={handleBulkStatusChange}
        onBulkEmail={handleBulkEmail}
        onClearSelection={() => setSelectedApplications([])}
        isLoading={bulkLoading}
      />

      {/* Applications Table */}
      <div className="admin-card rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold admin-text">Applications</h2>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={
                  selectedApplications.length === filteredApplications.length &&
                  filteredApplications.length > 0
                }
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm admin-text-light">Select all</span>
            </div>
          </div>
        </div>

        {filteredApplications.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-12 px-6 py-3 text-left">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium admin-text-light uppercase tracking-wider">
                    Applicant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium admin-text-light uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium admin-text-light uppercase tracking-wider">
                    Applied
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium admin-text-light uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="admin-card divide-y divide-gray-200">
                {filteredApplications.map((application) => (
                  <tr key={application.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedApplications.includes(application.id)}
                        onChange={(e) =>
                          handleSelectApplication(
                            application.id,
                            e.target.checked
                          )
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-semibold ${getButtonClasses("primary")}`}
                        >
                          {application.name?.charAt(0)?.toUpperCase() ||
                            application.email?.charAt(0)?.toUpperCase() ||
                            "A"}
                        </div>
                        <div>
                          <div className="text-sm font-medium admin-text">
                            {application.name || "Anonymous"}
                          </div>
                          <div className="text-sm admin-text-light flex items-center space-x-1">
                            <Mail className="h-3 w-3" />
                            <span>{application.email}</span>
                          </div>
                          {application.phone && (
                            <div className="text-sm admin-text-light flex items-center space-x-1">
                              <Phone className="h-3 w-3" />
                              <span>{application.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={application.status}
                        onChange={(e) =>
                          updateApplicationStatus(
                            application.id,
                            e.target.value
                          )
                        }
                        className={`px-2 py-1 rounded text-xs font-medium border-0 focus:ring-2 focus:ring-blue-500 ${getStatusColor(application.status)}`}
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm admin-text flex items-center space-x-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span>
                          {new Date(application.appliedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-xs admin-text-light">
                        {new Date(application.appliedAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <QuickActions
                        application={application}
                        onStatusChange={handleStatusChange}
                        onEmail={handleEmailApplication}
                        onView={handleViewApplication}
                        compact={true}
                        showLabels={false}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium admin-text mb-2">
              {searchTerm || statusFilter !== "all"
                ? "No applications match your filters"
                : "No applications yet"}
            </h3>
            <p className="admin-text-light">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your search or filters to see more results."
                : "Applications for this job will appear here when candidates apply."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
