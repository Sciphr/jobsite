// app/admin/applications/page.js - FIXED to prevent unnecessary effects + Added Pagination
"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { usePermissions } from "@/app/hooks/usePermissions";
import { ResourcePermissionGuard } from "@/app/components/guards/PagePermissionGuard";
import {
  useApplications,
  useJobsSimple,
  usePrefetchAdminData,
  useUpdateApplicationStatus,
  useDeleteApplication,
} from "@/app/hooks/useAdminData";
import { useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Search,
  Eye,
  Download,
  Mail,
  Phone,
  Calendar,
  User,
  Briefcase,
  RefreshCw,
  Trash2,
  X,
  CheckCircle,
  XCircle,
  Settings,
  BarChart3,
  Zap,
  ArrowRight,
  Target,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileDown,
} from "lucide-react";
import { exportApplicationsToExcel, exportApplicationsToCSV } from "@/app/utils/applicationsExport";

function AdminApplicationsContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getStatCardClasses, getButtonClasses } = useThemeClasses();
  const queryClient = useQueryClient();
  const updateApplicationMutation = useUpdateApplicationStatus();
  const deleteApplicationMutation = useDeleteApplication();

  // ✅ FIXED: Remove array-dependent useEffect + Added URL parameter support
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");

  // ✅ NEW: Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [selectedApplications, setSelectedApplications] = useState([]);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);

  const { prefetchAll } = usePrefetchAdminData();
  const {
    data: applications = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useApplications();
  const { data: jobs = [] } = useJobsSimple();
  const [refreshing, setRefreshing] = useState(false);

  // ✅ NEW: Initialize filters from URL parameters
  useEffect(() => {
    const jobParam = searchParams.get('job');
    const statusParam = searchParams.get('status');
    const searchParam = searchParams.get('search');
    
    if (jobParam) {
      setJobFilter(jobParam);
    }
    if (statusParam) {
      setStatusFilter(statusParam);
    }
    if (searchParam) {
      setSearchTerm(searchParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (showApplicationModal) {
      // Store current scroll position
      const scrollY = window.scrollY;

      // Scroll to top and prevent body scroll
      window.scrollTo(0, 0);
      document.body.style.overflow = "hidden";

      // Store scroll position for restoration
      document.body.setAttribute("data-scroll-y", scrollY.toString());
    } else {
      // Restore body scroll
      document.body.style.overflow = "unset";

      // Restore previous scroll position
      const scrollY = document.body.getAttribute("data-scroll-y");
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY));
        document.body.removeAttribute("data-scroll-y");
      }
    }

    // Cleanup function to restore scroll on unmount
    return () => {
      document.body.style.overflow = "unset";
      document.body.removeAttribute("data-scroll-y");
    };
  }, [showApplicationModal]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // ✅ FIXED: Use useMemo instead of useEffect to prevent unnecessary calls
  const filteredApplications = useMemo(() => {
    let filtered = applications;

    if (searchTerm) {
      filtered = filtered.filter(
        (app) =>
          app.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.job?.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }

    if (jobFilter !== "all") {
      filtered = filtered.filter((app) => app.jobId === jobFilter);
    }

    return filtered;
  }, [applications, searchTerm, statusFilter, jobFilter]); // ✅ FIXED: Depend on actual data, not .length

  // ✅ NEW: Pagination calculations
  const paginationData = useMemo(() => {
    const totalItems = filteredApplications.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = filteredApplications.slice(startIndex, endIndex);

    return {
      totalItems,
      totalPages,
      startIndex,
      endIndex,
      currentItems,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    };
  }, [filteredApplications, currentPage, itemsPerPage]);

  // ✅ NEW: Reset to first page when filters change
  const resetPagination = () => {
    setCurrentPage(1);
    setSelectedApplications([]); // Clear selections when changing pages
  };

  // Update filter handlers to reset pagination
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    resetPagination();
  };

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    resetPagination();
  };

  const handleJobFilterChange = (value) => {
    setJobFilter(value);
    resetPagination();
  };

  // ✅ OPTIMIZED: Use React Query mutation for instant UI updates
  const updateApplicationStatus = async (applicationId, newStatus) => {
    updateApplicationMutation.mutate({ applicationId, status: newStatus });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      // Only select items on current page
      setSelectedApplications(paginationData.currentItems.map((app) => app.id));
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

  // ✅ OPTIMIZED: Single delete with React Query mutation
  const deleteApplication = async (applicationId) => {
    if (
      !confirm(
        "Are you sure you want to delete this application? This action cannot be undone."
      )
    ) {
      return;
    }

    // Remove from selected applications immediately
    setSelectedApplications((prev) =>
      prev.filter((id) => id !== applicationId)
    );

    // Use the optimized delete mutation
    deleteApplicationMutation.mutate(applicationId);
  };

  // ✅ OPTIMIZED: Bulk actions with optimistic updates
  const handleBulkAction = async (action) => {
    if (selectedApplications.length === 0) return;

    const confirmMessage =
      action === "delete"
        ? `Are you sure you want to delete ${selectedApplications.length} application(s)? This cannot be undone.`
        : `Are you sure you want to ${action} ${selectedApplications.length} application(s)?`;

    if (!confirm(confirmMessage)) return;

    try {
      if (action === "delete") {
        // Optimistically remove from cache
        queryClient.setQueryData(["admin", "applications"], (oldData) => {
          if (!oldData) return oldData;
          return oldData.filter((app) => !selectedApplications.includes(app.id));
        });

        await Promise.all(
          selectedApplications.map((id) =>
            fetch(`/api/admin/applications/${id}`, { method: "DELETE" })
          )
        );
      } else {
        // Optimistically update status in cache
        queryClient.setQueryData(["admin", "applications"], (oldData) => {
          if (!oldData) return oldData;
          return oldData.map((app) =>
            selectedApplications.includes(app.id) ? { ...app, status: action } : app
          );
        });

        await Promise.all(
          selectedApplications.map((id) =>
            fetch(`/api/admin/applications/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: action }),
            })
          )
        );
      }
      setSelectedApplications([]);
    } catch (error) {
      console.error("Error performing bulk action:", error);
      // Revert optimistic update on error
      refetch();
    }
  };

  const viewApplicationDetails = async (applicationId) => {
    try {
      const response = await fetch(`/api/admin/applications/${applicationId}`);
      if (response.ok) {
        const application = await response.json();
        setSelectedApplication(application);
        setShowApplicationModal(true);
      }
    } catch (error) {
      console.error("Error fetching application details:", error);
    }
  };

  const downloadResume = async (storagePath, applicantName) => {
    console.log("🔍 Download attempt:", { storagePath, applicantName });

    if (!storagePath) {
      console.error("❌ No storage path provided");
      alert("No resume file path found");
      return;
    }

    try {
      const url = `/api/resume-download?path=${encodeURIComponent(storagePath)}`;
      console.log("🌐 Calling API:", url);

      const response = await fetch(url);
      console.log("📡 Response:", response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ API Error:", errorData);
        throw new Error(`API Error: ${errorData.error}`);
      }

      const { downloadUrl } = await response.json();
      console.log("✅ Got download URL");

      // Create download link
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${applicantName || "applicant"}_resume.pdf`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("❌ Download error:", error);
      alert(`Failed to download resume: ${error.message}`);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      Applied: "bg-blue-100 text-blue-800",
      Reviewing: "bg-yellow-100 text-yellow-800",
      Interview: "bg-green-100 text-green-800",
      Hired: "bg-emerald-100 text-emerald-800",
      Rejected: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const statusOptions = [
    "Applied",
    "Reviewing",
    "Interview",
    "Hired",
    "Rejected",
  ];

  // ✅ NEW: Export functionality
  const handleExport = (format) => {
    const filters = {
      searchTerm,
      statusFilter: statusFilter === 'all' ? null : statusFilter,
      jobFilter: jobFilter === 'all' ? null : jobFilter
    };

    if (format === 'excel') {
      exportApplicationsToExcel(filteredApplications, filters);
    } else if (format === 'csv') {
      exportApplicationsToCSV(filteredApplications, filters);
    }
  };

  // ✅ Show cache status in development
  if (process.env.NODE_ENV === "development") {
    console.log("📊 Applications Component Render:", {
      applicationsCount: applications.length,
      isLoading,
      filteredCount: filteredApplications.length,
      currentPageItems: paginationData.currentItems.length,
      currentPage,
      totalPages: paginationData.totalPages,
      searchTerm,
      statusFilter,
      jobFilter,
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="admin-card rounded-lg shadow border">
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Applications Manager CTA */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold admin-text">Applications</h1>
          <p className="admin-text-light mt-2 text-sm lg:text-base">
            Quick overview and basic application management
          </p>
        </div>
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
          {/* NEW: Applications Manager CTA */}
          <button
            onClick={() => router.push("/applications-manager")}
            className={`flex items-center justify-center space-x-2 px-4 lg:px-6 py-3 rounded-lg transition-all duration-200 shadow-md ${getButtonClasses("primary")} hover:shadow-lg transform hover:-translate-y-0.5 w-full sm:w-auto`}
          >
            <Zap className="h-5 w-5" />
            <span className="font-semibold text-sm lg:text-base">Applications Manager</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          {/* ✅ NEW: Export Dropdown */}
          <div className="relative group">
            <button
              className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 shadow-sm ${getButtonClasses("secondary")} w-full sm:w-auto`}
            >
              <FileDown className="h-4 w-4" />
              <span className="text-sm lg:text-base">Export</span>
            </button>
            <div className="absolute right-0 top-10 w-48 admin-card rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 border">
              <div className="p-2">
                <button
                  onClick={() => handleExport('excel')}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-left text-sm admin-text hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                >
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  <span>Export to Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-left text-sm admin-text hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                >
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span>Export to CSV</span>
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 shadow-sm ${getButtonClasses("secondary")} ${refreshing ? "opacity-50" : ""} w-full sm:w-auto`}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            <span className="text-sm lg:text-base">{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* NEW: Applications Manager Promotion Card */}
      <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 rounded-xl shadow-lg overflow-hidden">
        <div className="px-4 py-6 lg:px-6 lg:py-8 text-white">
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                  <Target className="h-6 w-6" />
                </div>
                <h3 className="text-lg lg:text-xl font-bold">
                  Upgrade to Applications Manager
                </h3>
              </div>
              <p className="text-blue-100 mb-4 text-sm lg:text-base max-w-2xl">
                Get enterprise-level application management with job-specific
                views, pipeline workflows, advanced analytics, bulk operations,
                and automated communication tools.
              </p>
              <div className="flex flex-wrap gap-3 lg:gap-6 text-sm text-blue-100">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Advanced Analytics</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Pipeline Management</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>Automated Communications</span>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 mt-4 lg:mt-0 lg:ml-6">
              <button
                onClick={() => router.push("/applications-manager")}
                className="bg-white text-blue-600 px-4 lg:px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors duration-200 flex items-center space-x-2 shadow-lg w-full lg:w-auto justify-center"
              >
                <span>Open Manager</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {statusOptions.map((status, index) => {
          const count = applications.filter(
            (app) => app.status === status
          ).length;
          const statusConfig = {
            Applied: {
              icon: User,
              color: "text-blue-600",
              bgColor: "bg-blue-100",
              borderColor: "border-blue-200",
            },
            Reviewing: {
              icon: Eye,
              color: "text-yellow-600",
              bgColor: "bg-yellow-100",
              borderColor: "border-yellow-200",
            },
            Interview: {
              icon: Calendar,
              color: "text-green-600",
              bgColor: "bg-green-100",
              borderColor: "border-green-200",
            },
            Hired: {
              icon: CheckCircle,
              color: "text-emerald-600",
              bgColor: "bg-emerald-100",
              borderColor: "border-emerald-200",
            },
            Rejected: {
              icon: XCircle,
              color: "text-red-600",
              bgColor: "bg-red-100",
              borderColor: "border-red-200",
            },
          }[status];

          const StatusIcon = statusConfig.icon;
          const statClasses = getStatCardClasses(index);

          return (
            <div
              key={status}
              className={`stat-card admin-card p-4 lg:p-6 rounded-lg shadow ${statClasses.border} ${statClasses.hover} hover:shadow-md transition-shadow duration-200 cursor-pointer`}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-xl lg:text-2xl font-bold admin-text">{count}</div>
                  <div className="text-sm admin-text-light font-medium">
                    {status}
                  </div>
                </div>
                <div className={`stat-icon p-2 lg:p-3 rounded-lg ${statClasses.bg} flex-shrink-0`}>
                  <StatusIcon className={`h-5 w-5 lg:h-6 lg:w-6 ${statClasses.icon}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="admin-card p-4 lg:p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="relative md:col-span-2 xl:col-span-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search applications..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500 dark:placeholder-gray-400 admin-text bg-white dark:bg-gray-700"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none admin-text bg-white dark:bg-gray-700"
          >
            <option value="all">All Statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            value={jobFilter}
            onChange={(e) => handleJobFilterChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none admin-text"
          >
            <option value="all">All Jobs</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>

          {/* ✅ NEW: Items per page selector */}
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none admin-text"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedApplications.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-800 dark:text-blue-200 font-medium">
              {selectedApplications.length} application
              {selectedApplications.length !== 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkAction("Reviewing")}
                className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
              >
                Mark as Reviewing
              </button>
              <button
                onClick={() => handleBulkAction("Interview")}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                Schedule Interview
              </button>
              <button
                onClick={() => handleBulkAction("Rejected")}
                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
              >
                Reject
              </button>
              <button
                onClick={() => handleBulkAction("delete")}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Applications Table */}
      <div className="admin-card rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b admin-text-light">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold admin-text">
                Applications ({paginationData.totalItems})
              </h2>
              {/* ✅ NEW: Current page info */}
              <span className="text-sm admin-text-light">
                Showing {paginationData.startIndex + 1}-
                {Math.min(paginationData.endIndex, paginationData.totalItems)}{" "}
                of {paginationData.totalItems}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={
                  selectedApplications.length ===
                    paginationData.currentItems.length &&
                  paginationData.currentItems.length > 0
                }
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm admin-text-light">
                Select all (current page)
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {paginationData.currentItems.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="w-12 px-6 py-3 text-left">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium admin-text-light uppercase tracking-wider">
                    Candidate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium admin-text-light uppercase tracking-wider">
                    Job
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
                {paginationData.currentItems.map((application) => (
                  <tr
                    key={application.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
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
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
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
                            <a 
                              href={`mailto:${application.email}`}
                              className="hover:text-blue-600 hover:underline transition-colors duration-200"
                              title="Send email"
                            >
                              {application.email}
                            </a>
                          </div>
                          {application.phone && (
                            <div className="text-sm admin-text-light flex items-center space-x-1">
                              <Phone className="h-3 w-3" />
                              <a 
                                href={`tel:${application.phone}`}
                                className="hover:text-green-600 hover:underline transition-colors duration-200"
                                title="Call phone"
                              >
                                {application.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium admin-text">
                        {application.job?.title}
                      </div>
                      <div className="text-sm admin-text-light">
                        {application.job?.department}
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
                        className={`px-2 py-1 rounded text-xs font-medium border-0 focus:ring-2 focus:ring-blue-500 ${getStatusColor(
                          application.status
                        )} dark:border-gray-600`}
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
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => viewApplicationDetails(application.id)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {application.resumeUrl && (
                          <button
                            onClick={() =>
                              downloadResume(
                                application.resumeUrl,
                                application.name
                              )
                            }
                            className="p-1 text-gray-400 hover:text-green-600 transition-colors duration-200"
                            title="Download resume"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteApplication(application.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors duration-200"
                          title="Delete application"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium admin-text mb-2">
                No applications found
              </h3>
              <p className="admin-text-light">
                {searchTerm || statusFilter !== "all" || jobFilter !== "all"
                  ? "Try adjusting your filters to see more results."
                  : "Applications will appear here when candidates apply to your jobs."}
              </p>
            </div>
          )}
        </div>

        {/* ✅ NEW: Pagination Controls */}
        {paginationData.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-sm admin-text-light">
                Showing {paginationData.startIndex + 1} to{" "}
                {Math.min(paginationData.endIndex, paginationData.totalItems)}{" "}
                of {paginationData.totalItems} results
              </div>

              <div className="flex items-center space-x-2">
                {/* Previous button */}
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={!paginationData.hasPrevPage}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm transition-colors duration-200 ${
                    paginationData.hasPrevPage
                      ? "admin-text hover:bg-gray-200 dark:hover:bg-gray-700"
                      : "admin-text-light cursor-not-allowed opacity-50"
                  }`}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>

                {/* Page numbers */}
                <div className="flex items-center space-x-1">
                  {(() => {
                    const pages = [];
                    const totalPages = paginationData.totalPages;
                    const current = currentPage;

                    // Always show first page
                    if (totalPages > 1) {
                      pages.push(
                        <button
                          key={1}
                          onClick={() => setCurrentPage(1)}
                          className={`px-3 py-2 rounded-lg text-sm transition-colors duration-200 ${
                            current === 1
                              ? "bg-blue-600 text-white"
                              : "admin-text hover:bg-gray-200 dark:hover:bg-gray-700"
                          }`}
                        >
                          1
                        </button>
                      );
                    }

                    // Show ellipsis if there's a gap
                    if (current > 3) {
                      pages.push(
                        <span
                          key="ellipsis1"
                          className="px-2 py-2 text-sm admin-text-light"
                        >
                          ...
                        </span>
                      );
                    }

                    // Show pages around current page
                    const start = Math.max(2, current - 1);
                    const end = Math.min(totalPages - 1, current + 1);

                    for (let i = start; i <= end; i++) {
                      if (i !== 1 && i !== totalPages) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i)}
                            className={`px-3 py-2 rounded-lg text-sm transition-colors duration-200 ${
                              current === i
                                ? "bg-blue-600 text-white"
                                : "admin-text hover:bg-gray-200 dark:hover:bg-gray-700"
                            }`}
                          >
                            {i}
                          </button>
                        );
                      }
                    }

                    // Show ellipsis if there's a gap
                    if (current < totalPages - 2) {
                      pages.push(
                        <span
                          key="ellipsis2"
                          className="px-2 py-2 text-sm admin-text-light"
                        >
                          ...
                        </span>
                      );
                    }

                    // Always show last page
                    if (totalPages > 1) {
                      pages.push(
                        <button
                          key={totalPages}
                          onClick={() => setCurrentPage(totalPages)}
                          className={`px-3 py-2 rounded-lg text-sm transition-colors duration-200 ${
                            current === totalPages
                              ? "bg-blue-600 text-white"
                              : "admin-text hover:bg-gray-200 dark:hover:bg-gray-700"
                          }`}
                        >
                          {totalPages}
                        </button>
                      );
                    }

                    return pages;
                  })()}
                </div>

                {/* Next button */}
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!paginationData.hasNextPage}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm transition-colors duration-200 ${
                    paginationData.hasNextPage
                      ? "admin-text hover:bg-gray-200 dark:hover:bg-gray-700"
                      : "admin-text-light cursor-not-allowed opacity-50"
                  }`}
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Application Details Modal */}
      {showApplicationModal && selectedApplication && (
        <>
          <div
            className="fixed inset-0 bg-gray-200 bg-opacity-30 backdrop-blur-sm z-50"
            onClick={() => setShowApplicationModal(false)}
          ></div>

          <div className="fixed inset-0 z-50">
            <div className="flex items-center justify-center p-4">
              <div
                className="admin-card rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] transform overflow-hidden relative"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header with theme-aware gradient */}
                <div
                  className={`px-6 py-5 text-white ${getButtonClasses("primary")}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-white bg-opacity-30 flex items-center justify-center theme-primary-text font-semibold">
                        {selectedApplication.name?.charAt(0)?.toUpperCase() ||
                          selectedApplication.email?.charAt(0)?.toUpperCase() ||
                          "A"}
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold">
                          Application Details
                        </h2>
                        <p className="text-white text-opacity-80 text-sm">
                          {selectedApplication.job?.title}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowApplicationModal(false)}
                      className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors duration-200"
                    >
                      <X className="h-5 w-5 text-white" />
                    </button>
                  </div>
                </div>

                <div className="p-6 overflow-y-auto max-h-[60vh]">
                  <div className="space-y-6">
                    {/* Applicant Info Card */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-100">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold admin-text">
                          Applicant Information
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="admin-card rounded-lg p-3 border border-blue-100">
                          <span className="admin-text-light font-medium block mb-1">
                            Name
                          </span>
                          <p className="admin-text">
                            {selectedApplication.name || "Not provided"}
                          </p>
                        </div>
                        <div className="admin-card rounded-lg p-3 border border-blue-100">
                          <span className="admin-text-light font-medium block mb-1">
                            Email
                          </span>
                          <p className="admin-text">
                            {selectedApplication.email}
                          </p>
                        </div>
                        <div className="admin-card rounded-lg p-3 border border-blue-100">
                          <span className="admin-text-light font-medium block mb-1">
                            Phone
                          </span>
                          <p className="admin-text">
                            {selectedApplication.phone || "Not provided"}
                          </p>
                        </div>
                        <div className="admin-card rounded-lg p-3 border border-blue-100">
                          <span className="admin-text-light font-medium block mb-1">
                            Applied
                          </span>
                          <p className="admin-text">
                            {new Date(
                              selectedApplication.appliedAt
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Job Info Card */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-5 border border-green-100">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Briefcase className="h-5 w-5 text-green-600" />
                        </div>
                        <h3 className="text-lg font-semibold admin-text">
                          Position Details
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="admin-card rounded-lg p-3 border border-green-100">
                          <span className="admin-text-light font-medium block mb-1">
                            Position
                          </span>
                          <p className="admin-text">
                            {selectedApplication.job?.title}
                          </p>
                        </div>
                        <div className="admin-card rounded-lg p-3 border border-green-100">
                          <span className="admin-text-light font-medium block mb-1">
                            Department
                          </span>
                          <p className="admin-text">
                            {selectedApplication.job?.department}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Cover Letter */}
                    {selectedApplication.coverLetter && (
                      <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-5 border border-purple-100">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <Mail className="h-5 w-5 text-purple-600" />
                          </div>
                          <h3 className="text-lg font-semibold admin-text">
                            Cover Letter
                          </h3>
                        </div>
                        <div className="admin-card rounded-lg p-4 border border-purple-100">
                          <p className="text-sm admin-text whitespace-pre-wrap leading-relaxed">
                            {selectedApplication.coverLetter}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Internal Notes */}
                    {selectedApplication.notes && (
                      <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg p-5 border border-yellow-200">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="p-2 bg-yellow-100 rounded-lg">
                            <FileText className="h-5 w-5 text-yellow-600" />
                          </div>
                          <h3 className="text-lg font-semibold admin-text">
                            Internal Notes
                          </h3>
                        </div>
                        <div className="admin-card rounded-lg p-4 border border-yellow-200">
                          <p className="text-sm admin-text whitespace-pre-wrap leading-relaxed">
                            {selectedApplication.notes}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Resume */}
                    {selectedApplication.resumeUrl && (
                      <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-5 border border-orange-100">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="p-2 bg-orange-100 rounded-lg">
                            <Download className="h-5 w-5 text-orange-600" />
                          </div>
                          <h3 className="text-lg font-semibold admin-text">
                            Resume
                          </h3>
                        </div>
                        <button
                          onClick={() =>
                            downloadResume(
                              selectedApplication.resumeUrl,
                              selectedApplication.name
                            )
                          }
                          className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download Resume</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm admin-text-light font-medium">
                      Current Status:
                    </span>
                    <select
                      value={selectedApplication.status}
                      onChange={(e) => {
                        const newStatus = e.target.value;
                        updateApplicationStatus(
                          selectedApplication.id,
                          newStatus
                        );
                        setSelectedApplication((prev) => ({
                          ...prev,
                          status: newStatus,
                        }));
                      }}
                      className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text font-medium"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => setShowApplicationModal(false)}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminApplications() {
  return (
    <ResourcePermissionGuard 
      resource="applications" 
      actions={["view"]}
      fallbackPath="/admin/dashboard"
    >
      <AdminApplicationsContent />
    </ResourcePermissionGuard>
  );
}
