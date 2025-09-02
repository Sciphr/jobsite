// app/applications-manager/pipeline/page.js - Enhanced with advanced drag feedback
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import {
  useApplications,
  useJobsSimple,
  useArchiveApplications,
  useStaleApplications,
} from "@/app/hooks/useAdminData";
import { useRequireNotesOnRejection } from "@/app/hooks/useRequireNotesOnRejection";
import { useHireApprovalStatus, getHireApprovalForApplication } from "@/app/hooks/useHireApprovalStatus";
import { useSettings } from "@/app/hooks/useAdminData";
import QuickActions from "../components/QuickActions";
import RejectionNotesModal from "../components/RejectionNotesModal";
import HireApprovalStatusModal from "../../components/HireApprovalStatusModal";
import { HireApprovalBadge, HireApprovalIconIndicator } from "../../components/HireApprovalIndicator";
import StageDurationBadge, { StageDurationTooltip } from "../components/StageDurationBadge";
import ApplicationsTableView from "../components/ApplicationsTableView";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Eye,
  Download,
  MoreHorizontal,
  Filter,
  Search,
  Briefcase,
  Clock,
  ChevronDown,
  Plus,
  ArrowRight,
  Target,
  Zap,
  Archive,
  ArchiveRestore,
  Trash2,
  LayoutGrid,
  Table,
  Star,
  Loader2,
} from "lucide-react";

export default function PipelineView() {
  const router = useRouter();
  const { getButtonClasses, getStatCardClasses } = useThemeClasses();

  // Data fetching
  const queryClient = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [viewType, setViewType] = useState('kanban'); // 'kanban' or 'table'
  const [ratingFilter, setRatingFilter] = useState('all'); // 'all', '1', '2', '3', '4', '5', 'unrated'
  const { data: applications = [], isLoading: applicationsLoading } =
    useApplications(showArchived);
  const [hireApprovalModal, setHireApprovalModal] = useState({
    isOpen: false,
    type: null,
    message: null,
    hireRequestId: null,
    existingRequestId: null,
  });

  // Get hire approval status for all applications
  const applicationIds = applications.map(app => app.id);
  const { hireApprovalStatus } = useHireApprovalStatus(applicationIds);
  const { data: jobs = [] } = useJobsSimple();
  const { data: settingsData } = useSettings();
  const { data: staleData } = useStaleApplications('full');

  // Check if stage time tracking is enabled
  const trackTimeInStage = settingsData?.settings?.find(
    (setting) => setting.key === "track_time_in_stage"
  )?.parsedValue || false;

  // Notes on rejection functionality
  const {
    isNotesModalOpen,
    pendingStatusChange,
    handleStatusChangeWithNotesCheck,
    completeStatusChangeWithNotes,
    cancelStatusChange,
  } = useRequireNotesOnRejection();

  // Archive functionality
  const { mutate: archiveApplications, isLoading: archiving } =
    useArchiveApplications();

  const handleArchiveApplication = (applicationId, shouldArchive = true) => {
    archiveApplications(
      {
        applicationIds: [applicationId],
        archive: shouldArchive,
        reason: shouldArchive ? "manual" : undefined,
      },
      {
        onSuccess: (data) => {
          alert(data.message);
        },
        onError: (error) => {
          alert(`Error: ${error.message}`);
        },
      }
    );
  };

  // Local state with enhanced drag tracking
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showJobFilter, setShowJobFilter] = useState(false);
  const [showStaleOnly, setShowStaleOnly] = useState(false);
  const [draggedApplication, setDraggedApplication] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [ghostPreview, setGhostPreview] = useState(null);

  // Pipeline stages configuration with theme-aware colors
  const pipelineStages = [
    {
      id: "Applied",
      title: "New Applications",
      color: getStatCardClasses(0).icon,
      textColor: getStatCardClasses(0).icon,
      bgColor: getStatCardClasses(0).bg,
      borderColor: getStatCardClasses(0).border,
      glowColor: getStatCardClasses(0).bg,
      count: 0,
    },
    {
      id: "Reviewing",
      title: "Under Review",
      color: getStatCardClasses(1).icon,
      textColor: getStatCardClasses(1).icon,
      bgColor: getStatCardClasses(1).bg,
      borderColor: getStatCardClasses(1).border,
      glowColor: getStatCardClasses(1).bg,
      count: 0,
    },
    {
      id: "Interview",
      title: "Interview Stage",
      color: getStatCardClasses(2).icon,
      textColor: getStatCardClasses(2).icon,
      bgColor: getStatCardClasses(2).bg,
      borderColor: getStatCardClasses(2).border,
      glowColor: getStatCardClasses(2).bg,
      count: 0,
    },
    {
      id: "Hired",
      title: "Hired",
      color: getStatCardClasses(3).icon,
      textColor: getStatCardClasses(3).icon,
      bgColor: getStatCardClasses(3).bg,
      borderColor: getStatCardClasses(3).border,
      glowColor: getStatCardClasses(3).bg,
      count: 0,
    },
    {
      id: "Rejected",
      title: "Rejected",
      color: getStatCardClasses(4).icon,
      textColor: getStatCardClasses(4).icon,
      bgColor: getStatCardClasses(4).bg,
      borderColor: getStatCardClasses(4).border,
      glowColor: getStatCardClasses(4).bg,
      count: 0,
    },
  ];

  // Debounce search term
  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filter applications
  const filteredApplications = useMemo(() => {
    let filtered = applications;

    if (selectedJob && selectedJob !== "all") {
      filtered = filtered.filter((app) => app.jobId === selectedJob);
    }

    if (debouncedSearchTerm) {
      filtered = filtered.filter(
        (app) =>
          app.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          app.email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          app.job?.title?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }

    if (showStaleOnly) {
      const staleIds = new Set(staleData?.applications?.map(app => app.id) || []);
      filtered = filtered.filter((app) => staleIds.has(app.id));
    }

    // Filter by rating
    if (ratingFilter !== 'all') {
      if (ratingFilter === 'unrated') {
        filtered = filtered.filter((app) => !app.rating || app.rating === 0);
      } else {
        const targetRating = parseInt(ratingFilter);
        filtered = filtered.filter((app) => app.rating === targetRating);
      }
    }

    // If no job is selected, return empty array
    if (!selectedJob) {
      return [];
    }

    return filtered;
  }, [applications, selectedJob, debouncedSearchTerm, showStaleOnly, staleData, ratingFilter]);

  // Group applications by status with counts
  const applicationsByStatus = useMemo(() => {
    const grouped = filteredApplications.reduce((acc, app) => {
      if (!acc[app.status]) {
        acc[app.status] = [];
      }
      acc[app.status].push(app);
      return acc;
    }, {});

    const updatedStages = pipelineStages.map((stage) => ({
      ...stage,
      count: grouped[stage.id]?.length || 0,
    }));

    return { grouped, stages: updatedStages };
  }, [filteredApplications]);

  const handleStatusChange = async (applicationId, newStatus) => {
    const application = applications.find((app) => app.id === applicationId);
    if (!application) return;

    const completed = await handleStatusChangeWithNotesCheck(
      applicationId,
      newStatus,
      application.status,
      application.notes,
      async (id, status) => {
        const currentApplications = queryClient.getQueryData([
          "admin",
          "applications",
        ]);

        queryClient.setQueryData(["admin", "applications"], (oldData) => {
          if (!oldData) return oldData;
          return oldData.map((app) =>
            app.id === id ? { ...app, status } : app
          );
        });

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
              // Revert optimistic update since status didn't actually change
              queryClient.setQueryData(["admin", "applications"], currentApplications);
              setHireApprovalModal({
                isOpen: true,
                type: 'success',
                message: updatedData.message,
                hireRequestId: updatedData.hireRequestId,
                existingRequestId: null,
              });
              // Invalidate hire approval status to show the new pending request
              queryClient.invalidateQueries(['hire-approval-status']);
              return { statusUnchanged: true };
            }
            
            return updatedData;
          } else {
            queryClient.setQueryData(
              ["admin", "applications"],
              currentApplications
            );
            const errorData = await response.json();
            
            // Check if it's a hire approval conflict
            if (response.status === 409 && errorData.alreadyPending) {
              setHireApprovalModal({
                isOpen: true,
                type: 'already-pending',
                message: errorData.message,
                hireRequestId: null,
                existingRequestId: errorData.existingRequestId,
              });
              return { statusUnchanged: true };
            }
            
            throw new Error(errorData.message || "Failed to update status");
          }
        } catch (error) {
          queryClient.setQueryData(
            ["admin", "applications"],
            currentApplications
          );
          console.error(
            "Error updating application status, reverting changes:",
            error
          );
          throw error;
        }
      }
    );

    // If completed is false, it means the notes modal was opened
    // If true, the status was changed immediately
  };

  // Enhanced Drag and Drop handlers with ghost preview
  const handleDragStart = (e, application) => {
    setDraggedApplication(application);
    setGhostPreview(application);

    const dragImage = new Image();
    dragImage.src =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=";
    e.dataTransfer.setDragImage(dragImage, 0, 0);

    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", e.target.outerHTML);
  };

  const handleDragEnd = (e) => {
    setTimeout(() => {
      setDraggedApplication(null);
      setDragOverColumn(null);
      setGhostPreview(null);
      setDragPosition({ x: 0, y: 0 });
    }, 100);
  };

  const handleDrag = (e) => {
    if (e.clientX !== 0 && e.clientY !== 0) {
      setDragPosition({ x: e.clientX, y: e.clientY });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e, stageId) => {
    e.preventDefault();
    setDragOverColumn(stageId);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (e, targetStage) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedApplication || draggedApplication.status === targetStage) {
      setDraggedApplication(null);
      return;
    }

    const appToUpdate = draggedApplication;
    setDraggedApplication(null);

    await handleStatusChange(appToUpdate.id, targetStage);
  };

  const handleViewApplication = (application) => {
    // Navigate to candidate detail page instead of opening modal
    router.push(`/applications-manager/candidate/${application.id}`);
  };

  const handleDownloadResume = async (application) => {
    if (!application.resumeUrl) {
      console.error("No resume URL found for this application");
      return;
    }

    try {
      // Call the download API to get the signed URL
      const response = await fetch(
        `/api/resume-download?path=${encodeURIComponent(application.resumeUrl)}`
      );

      if (!response.ok) {
        throw new Error("Failed to download resume");
      }

      // The response is now the file itself, not JSON with URL
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${application.applicantName || "applicant"}_resume.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading resume:", error);
      // You could add a toast notification here for better UX
      alert("Failed to download resume. Please try again.");
    }
  };

  const handleEmailApplication = (application) => {
    // Navigate to communication page with pre-filled recipient
    router.push(
      `/applications-manager/communication?recipient=${application.id}`
    );
  };

  const selectedJobData = jobs.find((job) => job.id === selectedJob);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    show: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      transition: {
        duration: 0.2,
      },
    },
  };

  if (applicationsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-96 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0"
      >
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold admin-text flex items-center space-x-2 lg:space-x-3">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
            >
              <Target className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600" />
            </motion.div>
            <span>Application Pipeline</span>
          </h1>
          <p className="admin-text-light mt-2 text-sm lg:text-base">
            Kanban-style workflow management for hiring process
          </p>
        </div>
        <div className="flex items-center space-x-3">
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

          {/* Show Stale Only Toggle */}
          <motion.label
            whileHover={{ scale: 1.02 }}
            className="flex items-center space-x-2 px-3 py-2 cursor-pointer"
            title="Show only applications that haven't moved stages in a while"
          >
            <input
              type="checkbox"
              checked={showStaleOnly}
              onChange={(e) => setShowStaleOnly(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-orange-600 focus:ring-orange-500 dark:focus:ring-orange-400"
            />
            <Clock className="h-4 w-4 admin-text-light" />
            <span className="text-sm admin-text">
              Stale Only {staleData?.count ? `(${staleData.count})` : ''}
            </span>
          </motion.label>

          {/* View Toggle */}
          <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setViewType('kanban')}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm transition-colors ${
                viewType === 'kanban'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'admin-text-light hover:admin-text hover:bg-white dark:hover:bg-gray-700'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              <span>Kanban</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setViewType('table')}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm transition-colors ${
                viewType === 'table'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'admin-text-light hover:admin-text hover:bg-white dark:hover:bg-gray-700'
              }`}
            >
              <Table className="h-4 w-4" />
              <span>Table</span>
            </motion.button>
          </div>

          {/* Rating Filter */}
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 admin-text admin-card text-sm"
          >
            <option value="all">All Ratings</option>
            <option value="unrated">Unrated</option>
            <option value="5">★★★★★ (5 stars)</option>
            <option value="4">★★★★☆ (4 stars)</option>
            <option value="3">★★★☆☆ (3 stars)</option>
            <option value="2">★★☆☆☆ (2 stars)</option>
            <option value="1">★☆☆☆☆ (1 star)</option>
          </select>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/applications-manager")}
            className={`flex items-center space-x-2 px-3 py-2 lg:px-4 lg:py-2 rounded-lg transition-colors text-sm ${getButtonClasses("secondary")}`}
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            <span>Back to Overview</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="admin-card p-4 lg:p-6 rounded-lg shadow"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 flex-1">
            {/* Job Filter */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowJobFilter(!showJobFilter)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                  selectedJob !== "all"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    : "admin-card border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <Briefcase className="h-4 w-4" />
                <span>
                  {selectedJob === "all"
                    ? "All Jobs"
                    : selectedJob
                      ? selectedJobData?.title || "Select Job"
                      : "Select Job"}
                </span>
                <motion.div
                  animate={{ rotate: showJobFilter ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-4 w-4" />
                </motion.div>
              </motion.button>

              <AnimatePresence>
                {showJobFilter && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-2 w-72 md:w-80 admin-card rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50 max-h-64 md:max-h-80 overflow-y-auto"
                  >
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-sm font-semibold admin-text">
                        Filter by Job
                      </h3>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      <motion.button
                        whileHover={{ backgroundColor: "var(--hover-bg)" }}
                        onClick={() => {
                          setSelectedJob("all");
                          setShowJobFilter(false);
                        }}
                        className={`w-full text-left px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          selectedJob === "all"
                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                            : ""
                        }`}
                      >
                        <div className="text-sm font-medium admin-text">
                          All Jobs
                        </div>
                        <div className="text-xs admin-text-light">
                          Show applications from all positions
                        </div>
                      </motion.button>
                      {jobs.map((job, index) => (
                        <motion.button
                          key={job.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ backgroundColor: "var(--hover-bg)" }}
                          onClick={() => {
                            setSelectedJob(job.id);
                            setShowJobFilter(false);
                          }}
                          className={`w-full text-left px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                            selectedJob === job.id
                              ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                              : ""
                          }`}
                        >
                          <div className="text-sm font-medium admin-text">
                            {job.title}
                          </div>
                          <div className="text-xs admin-text-light flex items-center space-x-2">
                            <span>{job.department}</span>
                            <span>•</span>
                            <span>{job.applicationCount} applications</span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-md">
              {isSearching ? (
                <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-500 animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              )}
              <motion.input
                whileFocus={{ scale: 1.02 }}
                type="text"
                placeholder="Search applicants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 admin-text admin-card"
              />
            </div>
          </div>

          <div className="text-sm admin-text-light">
            {selectedJob ? (
              <>
                Showing {filteredApplications.length} applications
                {selectedJob !== "all" && selectedJobData && (
                  <span> for {selectedJobData.title}</span>
                )}
              </>
            ) : (
              "Select a job to view applications"
            )}
          </div>
        </div>
      </motion.div>

      {/* Pipeline Board */}
      {!selectedJob ? (
        /* Empty State - No Job Selected */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="admin-card rounded-xl shadow-lg p-6 lg:p-12 text-center min-h-[400px] lg:min-h-[600px] flex flex-col justify-center"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="mx-auto mb-4 lg:mb-6 w-16 h-16 lg:w-24 lg:h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
          >
            <Briefcase className="h-8 w-8 lg:h-12 lg:w-12 text-white" />
          </motion.div>
          <h3 className="text-lg lg:text-2xl font-bold admin-text mb-3 lg:mb-4">
            Choose a Job to View Pipeline
          </h3>
          <p className="admin-text-light mb-6 lg:mb-8 max-w-md mx-auto text-sm lg:text-base">
            Select a specific job from the dropdown above to see its application
            pipeline, or choose "All Jobs" to view applications across all
            positions.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowJobFilter(true)}
            className={`mx-auto flex items-center space-x-2 px-4 py-2 lg:px-6 lg:py-3 rounded-lg text-sm ${getButtonClasses("primary")}`}
          >
            <Search className="h-4 w-4 lg:h-5 lg:w-5" />
            <span>Select Job</span>
          </motion.button>
        </motion.div>
      ) : (
        /* Pipeline Board */
        viewType === 'kanban' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 md:gap-4 lg:gap-6 min-h-[400px] lg:min-h-[600px]"
          >
          {applicationsByStatus.stages.map((stage, stageIndex) => (
            <motion.div
              key={stage.id}
              variants={itemVariants}
              className={`admin-card rounded-lg shadow overflow-hidden transition-all duration-200 ${
                dragOverColumn === stage.id
                  ? `ring-2 ${stage.borderColor} ${stage.bgColor} bg-opacity-20`
                  : ""
              }`}
              onDragOver={handleDragOver}
              onDragEnter={(e) => handleDragEnter(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Column Header */}
              <motion.div
                className={`p-4 ${stage.bgColor} ${stage.borderColor} border-b`}
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`font-semibold ${stage.textColor}`}>
                      {stage.title}
                    </h3>
                    <div className="text-xs admin-text-light mt-1">
                      {stage.count} application{stage.count !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <motion.div
                    className={`w-3 h-3 rounded-full ${stage.color}`}
                    animate={{
                      scale: dragOverColumn === stage.id ? 1.3 : 1,
                      boxShadow:
                        dragOverColumn === stage.id
                          ? "0 0 0 3px rgba(59, 130, 246, 0.5)"
                          : "none",
                    }}
                  />
                </div>
              </motion.div>

              {/* Applications List */}
              <div className="p-2 md:p-3 space-y-2 md:space-y-3 max-h-[300px] md:max-h-[400px] lg:max-h-[500px] overflow-y-auto overflow-x-hidden">
                <AnimatePresence mode="popLayout">
                  {applicationsByStatus.grouped[stage.id]?.map(
                    (application, index) => (
                      <motion.div
                        key={application.id}
                        variants={cardVariants}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        layout
                        layoutId={`application-${application.id}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, application)}
                        onDrag={handleDrag}
                        onDragEnd={handleDragEnd}
                        whileHover={{
                          scale: 1.02,
                          y: -2,
                          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                        }}
                        whileDrag={{
                          scale: 1.02,
                          rotate: 2,
                          zIndex: 1000,
                          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
                        }}
                        className={`admin-card border border-gray-200 dark:border-gray-700 rounded-lg p-2 md:p-3 lg:p-4 transition-all cursor-move group ${
                          draggedApplication?.id === application.id
                            ? "opacity-50"
                            : ""
                        }`}
                      >
                        {/* Applicant Info */}
                        <div className="flex items-start space-x-2 md:space-x-3">
                          <div className="relative">
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              className={`h-7 w-7 md:h-8 md:w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${getButtonClasses("primary")}`}
                            >
                              {application.name?.charAt(0)?.toUpperCase() ||
                                application.email?.charAt(0)?.toUpperCase() ||
                                "A"}
                            </motion.div>
                            {/* Stale Indicator */}
                            {staleData?.applications?.some(staleApp => staleApp.id === application.id) && (
                              <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                whileHover={{ scale: 1.1 }}
                                className="absolute -top-0.5 -right-0.5 bg-orange-500 rounded-full p-0.5 border border-white dark:border-gray-800"
                                title={`Stale application (${staleData.applications.find(staleApp => staleApp.id === application.id)?.daysSinceStageChange || 0} days in current stage)`}
                              >
                                <Clock className="h-2 w-2 md:h-2.5 md:w-2.5 text-white" />
                              </motion.div>
                            )}
                            {/* Hire Approval Icon Indicator - Only show if no stale indicator */}
                            {!staleData?.applications?.some(staleApp => staleApp.id === application.id) && (() => {
                              const hireStatus = getHireApprovalForApplication(hireApprovalStatus, application.id);
                              return hireStatus.hasPendingRequest && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  whileHover={{ scale: 1.1 }}
                                  className="absolute -top-0.5 -right-0.5 bg-amber-500 rounded-full p-0.5 border border-white dark:border-gray-800"
                                  title={`Hire approval requested by ${hireStatus.requestedBy}${hireStatus.requestedAt ? ` on ${new Date(hireStatus.requestedAt).toLocaleDateString()}` : ''}`}
                                >
                                  <Clock className="h-2 w-2 md:h-2.5 md:w-2.5 text-white" />
                                </motion.div>
                              );
                            })()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-1">
                              <h4 className="text-xs md:text-sm font-medium admin-text truncate">
                                {application.name || "Anonymous"}
                              </h4>
                              {/* Stale Badge for better visibility */}
                              {staleData?.applications?.some(staleApp => staleApp.id === application.id) && (
                                <motion.span 
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 flex-shrink-0"
                                >
                                  <Clock className="h-2.5 w-2.5 mr-0.5" />
                                  Stale
                                </motion.span>
                              )}
                              {/* Hire Approval Badge */}
                              {(() => {
                                const hireStatus = getHireApprovalForApplication(hireApprovalStatus, application.id);
                                return hireStatus.hasPendingRequest && (
                                  <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 flex-shrink-0"
                                    title={`Hire approval requested by ${hireStatus.requestedBy}${hireStatus.requestedAt ? ` on ${new Date(hireStatus.requestedAt).toLocaleDateString()}` : ''}`}
                                  >
                                    <Clock className="h-2.5 w-2.5 mr-0.5" />
                                    Hire Pending
                                  </motion.span>
                                );
                              })()}
                            </div>
                            <div className="text-xs admin-text-light flex items-center space-x-1 mt-1">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">
                                {application.email}
                              </span>
                            </div>
                            {application.phone && (
                              <div className="text-xs admin-text-light flex items-center space-x-1 mt-1">
                                <Phone className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">
                                  {application.phone}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Job Info */}
                        {selectedJob === "all" && application.job && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700"
                          >
                            <div className="text-xs admin-text-light flex items-center space-x-1">
                              <Briefcase className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">
                                {application.job.title}
                              </span>
                            </div>
                            <div className="text-xs admin-text-light mt-1 truncate">
                              {application.job.department}
                            </div>
                          </motion.div>
                        )}

                        {/* Applied Date & Stage Duration */}
                        <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-100 dark:border-gray-700">
                          <div className="text-xs admin-text-light flex items-center justify-between">
                            <div className="flex items-center space-x-1 flex-1 min-w-0">
                              <Calendar className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">
                                Applied{" "}
                                {new Date(
                                  application.appliedAt
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            {/* Stage Duration Badge - Only show if tracking is enabled */}
                            {trackTimeInStage && (
                              <StageDurationTooltip
                                applicationId={application.id}
                                currentStage={application.status}
                                stageEnteredAt={application.current_stage_entered_at || application.updatedAt}
                              >
                                <StageDurationBadge
                                  applicationId={application.id}
                                  currentStage={application.status}
                                  stageEnteredAt={application.current_stage_entered_at || application.updatedAt}
                                  size="xs"
                                  showIcon={true}
                                  className="ml-2 flex-shrink-0"
                                />
                              </StageDurationTooltip>
                            )}
                          </div>
                        </div>

                        {/* Enhanced Quick Actions - Always visible on mobile */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          whileHover={{ opacity: 1 }}
                          className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-100 dark:border-gray-700 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <QuickActions
                            application={application}
                            onStatusChange={handleStatusChange}
                            onEmail={handleEmailApplication}
                            onView={handleViewApplication}
                            onArchive={handleArchiveApplication}
                            compact={true}
                            showLabels={false}
                          />
                        </motion.div>
                      </motion.div>
                    )
                  ) || (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`text-center py-8 transition-all duration-200 ${
                        dragOverColumn === stage.id
                          ? "bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg"
                          : ""
                      }`}
                    >
                      <motion.div
                        className={`w-12 h-12 rounded-full ${stage.bgColor} ${stage.borderColor} border-2 border-dashed mx-auto mb-3 flex items-center justify-center`}
                        animate={{
                          scale: dragOverColumn === stage.id ? 1.1 : 1,
                          rotate: dragOverColumn === stage.id ? 360 : 0,
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        {dragOverColumn === stage.id ? (
                          <ArrowRight
                            className={`h-5 w-5 ${stage.textColor}`}
                          />
                        ) : (
                          <Plus className={`h-5 w-5 ${stage.textColor}`} />
                        )}
                      </motion.div>
                      <p className="text-sm admin-text-light">
                        {dragOverColumn === stage.id
                          ? "Drop here to update status"
                          : "No applications"}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        /* Table View */
        <ApplicationsTableView
          filteredApplications={filteredApplications}
          onStatusChange={handleStatusChange}
          onViewApplication={(applicationId) => router.push(`/applications-manager/candidate/${applicationId}`)}
          getButtonClasses={getButtonClasses}
          staleData={staleData}
          trackTimeInStage={trackTimeInStage}
        />
      )
      )}

      {/* Floating Ghost Card */}
      <AnimatePresence>
        {ghostPreview && draggedApplication && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed pointer-events-none z-[9999] transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: dragPosition.x,
              top: dragPosition.y,
            }}
          >
            <div
              className={`admin-card border-2 ${getStatCardClasses(0).border} rounded-lg p-3 shadow-2xl max-w-[250px]`}
            >
              <div className="flex items-center space-x-2">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${getStatCardClasses(0).bg} ${getStatCardClasses(0).icon}`}
                >
                  {ghostPreview.name?.charAt(0)?.toUpperCase() ||
                    ghostPreview.email?.charAt(0)?.toUpperCase() ||
                    "A"}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold admin-text truncate">
                    {ghostPreview.name || "Anonymous"}
                  </h4>
                  <div className="text-xs admin-text-light flex items-center space-x-1">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{ghostPreview.email}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          )}
        </AnimatePresence>

      {/* Pipeline Stats - Only show when job is selected */}
      {selectedJob && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="admin-card p-6 rounded-lg shadow"
        >
          <h3 className="text-lg font-semibold admin-text mb-4">
            Pipeline Summary
          </h3>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4"
          >
            {applicationsByStatus.stages.map((stage, index) => (
              <motion.div
                key={stage.id}
                variants={itemVariants}
                whileHover={{ scale: 1.05, y: -2 }}
                className="text-center"
              >
                <motion.div
                  className={`w-12 h-12 md:w-16 md:h-16 rounded-full ${stage.bgColor} ${stage.borderColor} border-2 mx-auto mb-2 flex items-center justify-center`}
                  whileHover={{
                    boxShadow: `0 0 0 4px ${stage.bgColor}40`,
                    scale: 1.1,
                  }}
                >
                  <span
                    className={`text-lg md:text-xl font-bold ${stage.textColor}`}
                  >
                    {stage.count}
                  </span>
                </motion.div>
                <div className="text-xs md:text-sm font-medium admin-text truncate">
                  {stage.title}
                </div>
                <div className="text-xs admin-text-light">
                  {filteredApplications.length > 0
                    ? Math.round(
                        (stage.count / filteredApplications.length) * 100
                      )
                    : 0}
                  %
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}

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

      {/* Hire Approval Status Modal */}
      <HireApprovalStatusModal
        isOpen={hireApprovalModal.isOpen}
        onClose={() => setHireApprovalModal({
          isOpen: false,
          type: null,
          message: null,
          hireRequestId: null,
          existingRequestId: null,
        })}
        type={hireApprovalModal.type}
        message={hireApprovalModal.message}
        applicationName="this application"
        hireRequestId={hireApprovalModal.hireRequestId}
        existingRequestId={hireApprovalModal.existingRequestId}
      />
    </div>
  );
}
