// app/admin/applications/page.js - FIXED to prevent unnecessary effects + Added Pagination
"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { usePermissions } from "@/app/hooks/usePermissions";
import { useRequireNotesOnRejection } from "@/app/hooks/useRequireNotesOnRejection";
import { ResourcePermissionGuard } from "@/app/components/guards/PagePermissionGuard";
import RejectionNotesModal from "../../applications-manager/components/RejectionNotesModal";
import {
  useApplications,
  useJobsSimple,
  usePrefetchAdminData,
  useUpdateApplicationStatus,
  useDeleteApplication,
  useBulkApplicationOperation,
  useAutoArchive,
  useAutoArchivePreview,
  useAutoProgress,
  useAutoProgressPreview,
  useSettings,
  useStaleApplications,
} from "@/app/hooks/useAdminData";
import { useHireApprovalStatus, getHireApprovalForApplication } from "@/app/hooks/useHireApprovalStatus";
import { HireApprovalBadge, HireApprovalIconIndicator } from "@/app/components/HireApprovalIndicator";
import Breadcrumb from "@/app/components/Breadcrumb";
import PageHelp from "@/app/components/PageHelp";
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
  Archive,
  ArrowUpRight,
  Clock,
  Kanban,
} from "lucide-react";
import {
  exportApplicationsToExcel,
  exportApplicationsToCSV,
} from "@/app/utils/applicationsExport";

function AdminApplicationsContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getStatCardClasses, getButtonClasses } = useThemeClasses();
  const queryClient = useQueryClient();
  const updateApplicationMutation = useUpdateApplicationStatus();
  const deleteApplicationMutation = useDeleteApplication();
  const bulkOperationMutation = useBulkApplicationOperation();

  // Notes on rejection functionality
  const {
    isNotesModalOpen,
    pendingStatusChange,
    handleStatusChangeWithNotesCheck,
    completeStatusChangeWithNotes,
    cancelStatusChange,
  } = useRequireNotesOnRejection();

  // Auto-archive functionality
  const { mutate: autoArchive, isLoading: autoArchiving } = useAutoArchive();
  const { data: autoArchivePreview } = useAutoArchivePreview();
  const { mutate: autoProgress, isLoading: autoProgressing } =
    useAutoProgress();
  const { data: autoProgressPreview } = useAutoProgressPreview();

  // ✅ FIXED: Remove array-dependent useEffect + Added URL parameter support
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");
  const [staleFilter, setStaleFilter] = useState("all");

  // ✅ NEW: Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [selectedApplications, setSelectedApplications] = useState([]);

  const { prefetchAll } = usePrefetchAdminData();
  const {
    data: applications = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useApplications();
  const { data: jobs = [] } = useJobsSimple();
  const { data: settingsData } = useSettings();
  const { data: staleData } = useStaleApplications('full');
  const [refreshing, setRefreshing] = useState(false);

  // Get hire approval status for all applications
  const applicationIds = applications.map(app => app.id);
  const { hireApprovalStatus, isLoading: hireApprovalLoading } = useHireApprovalStatus(applicationIds);

  // ✅ NEW: Initialize filters from URL parameters
  useEffect(() => {
    const jobParam = searchParams.get("job");
    const statusParam = searchParams.get("status");
    const searchParam = searchParams.get("search");
    const filterParam = searchParams.get("filter");

    if (jobParam) {
      setJobFilter(jobParam);
    }
    if (statusParam) {
      setStatusFilter(statusParam);
    }
    if (searchParam) {
      setSearchTerm(searchParam);
    }
    if (filterParam === "stale") {
      setStaleFilter("stale");
    }
  }, [searchParams]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleAutoArchive = () => {
    if (!autoArchivePreview?.count || autoArchivePreview.count === 0) {
      alert("No applications found for auto-archiving");
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
      alert("No applications found for auto-progress");
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

  // ✅ FIXED: Use useMemo instead of useEffect to prevent unnecessary calls
  const filteredApplications = useMemo(() => {
    // Ensure applications is an array before filtering
    if (!applications || !Array.isArray(applications)) {
      return [];
    }
    
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

    if (staleFilter === "stale") {
      const staleIds = new Set(staleData?.applications?.map(app => app.id) || []);
      filtered = filtered.filter((app) => staleIds.has(app.id));
    } else if (staleFilter === "not_stale") {
      const staleIds = new Set(staleData?.applications?.map(app => app.id) || []);
      filtered = filtered.filter((app) => !staleIds.has(app.id));
    }

    return filtered;
  }, [applications, searchTerm, statusFilter, jobFilter, staleFilter, staleData]); // ✅ FIXED: Depend on actual data, not .length

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

  const handleStaleFilterChange = (value) => {
    setStaleFilter(value);
    resetPagination();
  };

  // ✅ OPTIMIZED: Use React Query mutation with notes validation
  const updateApplicationStatus = async (applicationId, newStatus) => {
    const application = applications.find((app) => app.id === applicationId);
    if (!application) return;

    const completed = await handleStatusChangeWithNotesCheck(
      applicationId,
      newStatus,
      application.status,
      application.notes,
      async (id, status) => {
        try {
          const response = await fetch(`/api/admin/applications/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          });

          if (response.ok) {
            const updatedData = await response.json();
            
            // Check if this was a hire approval request
            if (updatedData.requiresApproval) {
              // Invalidate hire approval status to show the new pending request
              queryClient.invalidateQueries(['hire-approval-status']);
              // React Query will handle the UI update via normal mutation
            }
            
            // Use the normal mutation to update the UI
            updateApplicationMutation.mutate({ applicationId: id, status });
          } else {
            const errorData = await response.json();
            
            // Check if it's a hire approval conflict  
            if (response.status === 409 && errorData.alreadyPending) {
              // Just show an alert for now in the list view
              alert(errorData.message);
              return { statusUnchanged: true };
            }
            
            throw new Error(errorData.message || "Failed to update application");
          }
        } catch (error) {
          console.error("Error updating application status:", error);
          alert("Failed to update application status. Please try again.");
          throw error;
        }
      }
    );

    // If completed is false, it means the notes modal was opened
    // If true, the status was changed immediately
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

  // ✅ OPTIMIZED: Efficient bulk actions with React Query and optimistic updates
  const handleBulkAction = async (action) => {
    if (selectedApplications.length === 0) return;

    // Special handling for bulk rejection - check if notes are required
    if (action === "Rejected") {
      const requireNotesOnRejection =
        settingsData?.settings?.find(
          (setting) => setting.key === "require_notes_on_rejection"
        )?.parsedValue || false;

      if (requireNotesOnRejection) {
        const selectedApps = applications.filter(
          (app) =>
            selectedApplications.includes(app.id) &&
            app.status !== "Rejected" &&
            (!app.notes || app.notes.trim() === "")
        );

        if (selectedApps.length > 0) {
          alert(
            `Cannot bulk reject applications without notes. ${selectedApps.length} selected application(s) require notes before rejection. Please reject them individually or add notes first.`
          );
          return;
        }
      }
    }

    const confirmMessage =
      action === "delete"
        ? `Are you sure you want to delete ${selectedApplications.length} application(s)? This cannot be undone.`
        : `Are you sure you want to change ${selectedApplications.length} application(s) to "${action}" status?`;

    if (!confirm(confirmMessage)) return;

    // Prepare mutation parameters
    const mutationParams = {
      applicationIds: selectedApplications,
      action: action === "delete" ? "delete" : "status_change",
      ...(action !== "delete" && { status: action }),
    };

    // Execute the bulk operation with optimistic updates
    try {
      const result = await bulkOperationMutation.mutateAsync(mutationParams);
      
      // Show detailed success message
      let message = '';
      if (result.results.successful.length > 0) {
        message += `✅ Successfully ${action === 'delete' ? 'deleted' : 'updated'} ${result.results.successful.length} application${result.results.successful.length !== 1 ? 's' : ''}.\n`;
      }
      if (result.results.skipped.length > 0) {
        message += `ℹ️ Skipped ${result.results.skipped.length} application${result.results.skipped.length !== 1 ? 's' : ''} (already in "${action}" status).\n`;
      }
      if (result.results.failed.length > 0) {
        message += `❌ Failed to ${action === 'delete' ? 'delete' : 'update'} ${result.results.failed.length} application${result.results.failed.length !== 1 ? 's' : ''}.`;
      }

      if (message) {
        alert(message);
      }

      // Clear selection after successful operation
      setSelectedApplications([]);
      
    } catch (error) {
      console.error("Bulk operation failed:", error);
      alert(`Failed to ${action === 'delete' ? 'delete' : 'update'} applications: ${error.message}`);
    }
  };

  const viewApplicationDetails = (applicationId) => {
    router.push(`/admin/applications/${applicationId}`);
  };

  const downloadResume = async (storagePath, applicantName) => {
    console.log("🔍 Download attempt:", { storagePath, applicantName });

    if (!storagePath) {
      console.error("❌ No storage path provided");
      alert("No resume file path found");
      return;
    }

    try {
      const apiUrl = `/api/resume-download?path=${encodeURIComponent(storagePath)}`;
      console.log("🌐 Calling API:", apiUrl);

      const response = await fetch(apiUrl);
      console.log("📡 Response:", response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ API Error:", errorData);
        throw new Error(`API Error: ${errorData.error}`);
      }

      // The response is now the file itself, not JSON with URL
      const blob = await response.blob();
      console.log("✅ Got file blob, size:", blob.size);

      // Create download link
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${applicantName || "applicant"}_resume.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      window.URL.revokeObjectURL(blobUrl);
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
      statusFilter: statusFilter === "all" ? null : statusFilter,
      jobFilter: jobFilter === "all" ? null : jobFilter,
    };

    if (format === "excel") {
      exportApplicationsToExcel(filteredApplications, filters);
    } else if (format === "csv") {
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
          <h1 className="text-2xl lg:text-3xl font-bold admin-text">
            Applications
          </h1>
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
            <span className="font-semibold text-sm lg:text-base">
              Applications Manager
            </span>
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
                  onClick={() => handleExport("excel")}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-left text-sm admin-text hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                >
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  <span>Export to Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => handleExport("csv")}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-left text-sm admin-text hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                >
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span>Export to CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Manual Archive Trigger */}
          <button
            onClick={handleAutoArchive}
            disabled={
              autoArchiving ||
              !autoArchivePreview?.count ||
              autoArchivePreview.count === 0
            }
            className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 shadow-sm w-full sm:w-auto ${
              autoArchiving ||
              !autoArchivePreview?.count ||
              autoArchivePreview.count === 0
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200"
            }`}
            title={
              autoArchivePreview?.count > 0
                ? `Archive ${autoArchivePreview.count} rejected applications older than ${autoArchivePreview.daysThreshold} days`
                : "No applications ready for archiving"
            }
          >
            {autoArchiving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                <span className="text-sm">Archiving...</span>
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" />
                <span className="text-sm">
                  Auto-Archive ({autoArchivePreview?.count || 0})
                </span>
              </>
            )}
          </button>

          {/* Manual Progress Trigger */}
          <button
            onClick={handleAutoProgress}
            disabled={
              autoProgressing ||
              !autoProgressPreview?.count ||
              autoProgressPreview.count === 0
            }
            className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 shadow-sm w-full sm:w-auto ${
              autoProgressing ||
              !autoProgressPreview?.count ||
              autoProgressPreview.count === 0
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
            }`}
            title={
              autoProgressPreview?.count > 0
                ? `Progress ${autoProgressPreview.count} Applied applications older than ${autoProgressPreview.daysThreshold} days to Reviewing`
                : "No applications ready for auto-progress"
            }
          >
            {autoProgressing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">Progressing...</span>
              </>
            ) : (
              <>
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-sm">
                  Auto-Progress ({autoProgressPreview?.count || 0})
                </span>
              </>
            )}
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 shadow-sm ${getButtonClasses("secondary")} ${refreshing ? "opacity-50" : ""} w-full sm:w-auto`}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            <span className="text-sm lg:text-base">
              {refreshing ? "Refreshing..." : "Refresh"}
            </span>
          </button>
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
                  <div className="text-xl lg:text-2xl font-bold admin-text">
                    {count}
                  </div>
                  <div className="text-sm admin-text-light font-medium">
                    {status}
                  </div>
                </div>
                <div
                  className={`stat-icon p-2 lg:p-3 rounded-lg ${statClasses.bg} flex-shrink-0`}
                >
                  <StatusIcon
                    className={`h-5 w-5 lg:h-6 lg:w-6 ${statClasses.icon}`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="admin-card p-4 lg:p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
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

          {/* Stale Applications Filter */}
          <select
            value={staleFilter}
            onChange={(e) => handleStaleFilterChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none admin-text bg-white dark:bg-gray-700"
            title="Filter applications by their stale status"
          >
            <option value="all">All Applications</option>
            <option value="stale">
              Stale Only {staleData?.count ? `(${staleData.count})` : ''}
            </option>
            <option value="not_stale">Active Only</option>
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
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <span className="text-blue-800 dark:text-blue-200 font-medium">
              {selectedApplications.length} application
              {selectedApplications.length !== 1 ? "s" : ""} selected
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Change Dropdown */}
              <div className="relative group">
                <button 
                  disabled={bulkOperationMutation.isLoading}
                  className={`px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center space-x-1 ${bulkOperationMutation.isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {bulkOperationMutation.isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Change Status</span>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </button>
                <div className="absolute right-0 top-8 w-48 admin-card rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 border">
                  <div className="p-2">
                    {statusOptions.map((status) => {
                      const statusConfig = {
                        Applied: { color: "text-blue-600", bgColor: "hover:bg-blue-50" },
                        Reviewing: { color: "text-yellow-600", bgColor: "hover:bg-yellow-50" },
                        Interview: { color: "text-green-600", bgColor: "hover:bg-green-50" },
                        Hired: { color: "text-emerald-600", bgColor: "hover:bg-emerald-50" },
                        Rejected: { color: "text-red-600", bgColor: "hover:bg-red-50" },
                      }[status];

                      return (
                        <button
                          key={status}
                          onClick={() => handleBulkAction(status)}
                          className={`w-full flex items-center space-x-2 px-3 py-2 text-left text-sm admin-text ${statusConfig.bgColor} rounded-lg transition-colors duration-200`}
                        >
                          <div className={`w-2 h-2 rounded-full ${statusConfig.color.replace('text-', 'bg-')}`}></div>
                          <span>Change to {status}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Delete Action */}
              <button
                onClick={() => handleBulkAction("delete")}
                disabled={bulkOperationMutation.isLoading}
                className={`px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors duration-200 ${bulkOperationMutation.isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Delete selected applications permanently"
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
                        <div className="relative">
                          <div
                            className={`h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-semibold ${getButtonClasses("primary")}`}
                          >
                            {application.name?.charAt(0)?.toUpperCase() ||
                              application.email?.charAt(0)?.toUpperCase() ||
                              "A"}
                          </div>
                          {/* Stale Indicator */}
                          {staleData?.applications?.some(staleApp => staleApp.id === application.id) && (
                            <div 
                              className="absolute -top-1 -right-1 bg-orange-500 rounded-full p-1 border-2 border-white dark:border-gray-800"
                              title={`Application is stale (${staleData.applications.find(staleApp => staleApp.id === application.id)?.daysSinceStageChange || 0} days in current stage)`}
                            >
                              <Clock className="h-3 w-3 text-white" />
                            </div>
                          )}
                          {/* Hire Approval Indicator - Only show if no stale indicator */}
                          {!staleData?.applications?.some(staleApp => staleApp.id === application.id) && (() => {
                            const hireStatus = getHireApprovalForApplication(hireApprovalStatus, application.id);
                            return (
                              <HireApprovalIconIndicator
                                hasPendingRequest={hireStatus.hasPendingRequest}
                                requestedBy={hireStatus.requestedBy}
                                requestedAt={hireStatus.requestedAt}
                                className="absolute -top-1 -right-1 border-2 border-white dark:border-gray-800"
                              />
                            );
                          })()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <div className="text-sm font-medium admin-text">
                              {application.name || "Anonymous"}
                            </div>
                            {/* Additional stale indicator text for better visibility */}
                            {staleData?.applications?.some(staleApp => staleApp.id === application.id) && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300">
                                <Clock className="h-3 w-3 mr-1" />
                                Stale
                              </span>
                            )}
                            {/* Hire approval indicator */}
                            {(() => {
                              const hireStatus = getHireApprovalForApplication(hireApprovalStatus, application.id);
                              return (
                                <HireApprovalBadge
                                  hasPendingRequest={hireStatus.hasPendingRequest}
                                  requestedBy={hireStatus.requestedBy}
                                  requestedAt={hireStatus.requestedAt}
                                />
                              );
                            })()}
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

      {/* Rejection Notes Modal */}
      <RejectionNotesModal
        isOpen={isNotesModalOpen}
        onClose={cancelStatusChange}
        onSubmit={completeStatusChangeWithNotes}
        applicationName={
          pendingStatusChange?.applicationId
            ? applications.find(
                (app) => app.id === pendingStatusChange.applicationId
              )?.name ||
              applications.find(
                (app) => app.id === pendingStatusChange.applicationId
              )?.email ||
              "this application"
            : "this application"
        }
      />
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
