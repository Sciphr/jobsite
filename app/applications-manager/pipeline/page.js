// app/applications-manager/pipeline/page.js - Enhanced with advanced drag feedback
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { useApplications, useJobsSimple } from "@/app/hooks/useAdminData";
import ApplicationDetailModal from "../components/ApplicationDetailModal";
import QuickActions from "../components/QuickActions";
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
} from "lucide-react";

export default function PipelineView() {
  const router = useRouter();
  const { getButtonClasses } = useThemeClasses();

  // Data fetching
  const queryClient = useQueryClient();
  const { data: applications = [], isLoading: applicationsLoading } =
    useApplications();
  const { data: jobs = [] } = useJobsSimple();

  // Local state with enhanced drag tracking
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showJobFilter, setShowJobFilter] = useState(false);
  const [draggedApplication, setDraggedApplication] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [ghostPreview, setGhostPreview] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  // Pipeline stages configuration with enhanced animation data
  const pipelineStages = [
    {
      id: "Applied",
      title: "New Applications",
      color: "bg-blue-500",
      textColor: "text-blue-700",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      glowColor: "shadow-blue-200",
      count: 0,
    },
    {
      id: "Reviewing",
      title: "Under Review",
      color: "bg-yellow-500",
      textColor: "text-yellow-700",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      glowColor: "shadow-yellow-200",
      count: 0,
    },
    {
      id: "Interview",
      title: "Interview Stage",
      color: "bg-green-500",
      textColor: "text-green-700",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      glowColor: "shadow-green-200",
      count: 0,
    },
    {
      id: "Hired",
      title: "Hired",
      color: "bg-emerald-500",
      textColor: "text-emerald-700",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      glowColor: "shadow-emerald-200",
      count: 0,
    },
    {
      id: "Rejected",
      title: "Not Selected",
      color: "bg-red-500",
      textColor: "text-red-700",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      glowColor: "shadow-red-200",
      count: 0,
    },
  ];

  // Filter applications
  const filteredApplications = useMemo(() => {
    let filtered = applications;

    if (selectedJob && selectedJob !== "all") {
      filtered = filtered.filter((app) => app.jobId === selectedJob);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (app) =>
          app.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.job?.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // If no job is selected, return empty array
    if (!selectedJob) {
      return [];
    }

    return filtered;
  }, [applications, selectedJob, searchTerm]);

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
    const currentApplications = queryClient.getQueryData([
      "admin",
      "applications",
    ]);

    queryClient.setQueryData(["admin", "applications"], (oldData) => {
      if (!oldData) return oldData;
      return oldData.map((app) =>
        app.id === applicationId ? { ...app, status: newStatus } : app
      );
    });

    try {
      const response = await fetch(`/api/admin/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        queryClient.setQueryData(
          ["admin", "applications"],
          currentApplications
        );
        console.error("Failed to update status, reverting changes");
      }
    } catch (error) {
      queryClient.setQueryData(["admin", "applications"], currentApplications);
      console.error(
        "Error updating application status, reverting changes:",
        error
      );
    }
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
    setSelectedApplication(application);
    setShowApplicationModal(true);
  };

  const handleCloseModal = () => {
    setShowApplicationModal(false);
    setSelectedApplication(null);
  };

  const handleModalStatusUpdate = async (applicationId, newStatus) => {
    await handleStatusChange(applicationId, newStatus);
    if (selectedApplication && selectedApplication.id === applicationId) {
      setSelectedApplication((prev) => ({ ...prev, status: newStatus }));
    }
  };

  const handleDownloadResume = async (application) => {
    if (!application.resumeUrl) {
      console.error("No resume URL found for this application");
      return;
    }

    try {
      // Call the download API to get the signed URL
      const response = await fetch(`/api/resume-download?path=${encodeURIComponent(application.resumeUrl)}`);
      
      if (!response.ok) {
        throw new Error('Failed to generate download URL');
      }

      const data = await response.json();
      
      if (data.downloadUrl) {
        // Open download in a new tab
        window.open(data.downloadUrl, '_blank');
      } else {
        throw new Error('No download URL received');
      }
    } catch (error) {
      console.error('Error downloading resume:', error);
      // You could add a toast notification here for better UX
      alert('Failed to download resume. Please try again.');
    }
  };

  const handleEmailApplication = (application) => {
    // Navigate to communication page with pre-filled recipient
    router.push(`/applications-manager/communication?recipient=${application.id}`);
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
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
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
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold admin-text flex items-center space-x-3">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
            >
              <Target className="h-8 w-8 text-blue-600" />
            </motion.div>
            <span>Application Pipeline</span>
          </h1>
          <p className="admin-text-light mt-2">
            Kanban-style workflow management for hiring process
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/applications-manager")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${getButtonClasses("secondary")}`}
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
        className="admin-card p-6 rounded-lg shadow"
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
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
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
                    className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-80 overflow-y-auto"
                  >
                    <div className="p-3 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Filter by Job
                      </h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      <motion.button
                        whileHover={{ backgroundColor: "#f3f4f6" }}
                        onClick={() => {
                          setSelectedJob("all");
                          setShowJobFilter(false);
                        }}
                        className={`w-full text-left px-4 py-3 transition-colors ${
                          selectedJob === "all"
                            ? "bg-blue-50 text-blue-700"
                            : ""
                        }`}
                      >
                        <div className="text-sm font-medium">All Jobs</div>
                        <div className="text-xs text-gray-500">
                          Show applications from all positions
                        </div>
                      </motion.button>
                      {jobs.map((job, index) => (
                        <motion.button
                          key={job.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ backgroundColor: "#f3f4f6" }}
                          onClick={() => {
                            setSelectedJob(job.id);
                            setShowJobFilter(false);
                          }}
                          className={`w-full text-left px-4 py-3 transition-colors ${
                            selectedJob === job.id
                              ? "bg-blue-50 text-blue-700"
                              : ""
                          }`}
                        >
                          <div className="text-sm font-medium">{job.title}</div>
                          <div className="text-xs text-gray-500 flex items-center space-x-2">
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <motion.input
                whileFocus={{ scale: 1.02 }}
                type="text"
                placeholder="Search applicants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text"
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
          className="admin-card rounded-xl shadow-lg p-12 text-center min-h-[600px] flex flex-col justify-center"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="mx-auto mb-6 w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
          >
            <Briefcase className="h-12 w-12 text-white" />
          </motion.div>
          <h3 className="text-2xl font-bold admin-text mb-4">
            Choose a Job to View Pipeline
          </h3>
          <p className="admin-text-light mb-8 max-w-md mx-auto">
            Select a specific job from the dropdown above to see its application pipeline,
            or choose "All Jobs" to view applications across all positions.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowJobFilter(true)}
            className={`mx-auto flex items-center space-x-2 px-6 py-3 rounded-lg ${getButtonClasses("primary")}`}
          >
            <Search className="h-5 w-5" />
            <span>Select Job</span>
          </motion.button>
        </motion.div>
      ) : (
        /* Pipeline Board */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-[600px]"
        >
        {applicationsByStatus.stages.map((stage, stageIndex) => (
          <motion.div
            key={stage.id}
            variants={itemVariants}
            className={`admin-card rounded-lg shadow overflow-hidden transition-all duration-200 ${
              dragOverColumn === stage.id
                ? `ring-2 ring-blue-400 ${stage.bgColor} bg-opacity-20`
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
                  <div className="text-xs text-gray-600 mt-1">
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
            <div className="p-3 space-y-3 max-h-[500px] overflow-y-auto overflow-x-hidden">
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
                      className={`bg-white border border-gray-200 rounded-lg p-4 transition-all cursor-move group ${
                        draggedApplication?.id === application.id
                          ? "opacity-50"
                          : ""
                      }`}
                      onClick={() =>
                        router.push(
                          `/applications-manager/jobs/${application.jobId}?from=pipeline`
                        )
                      }
                    >
                      {/* Applicant Info */}
                      <div className="flex items-start space-x-3">
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${getButtonClasses("primary")}`}
                        >
                          {application.name?.charAt(0)?.toUpperCase() ||
                            application.email?.charAt(0)?.toUpperCase() ||
                            "A"}
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {application.name || "Anonymous"}
                          </h4>
                          <div className="text-xs text-gray-500 flex items-center space-x-1 mt-1">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">
                              {application.email}
                            </span>
                          </div>
                          {application.phone && (
                            <div className="text-xs text-gray-500 flex items-center space-x-1 mt-1">
                              <Phone className="h-3 w-3" />
                              <span>{application.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Job Info */}
                      {selectedJob === "all" && application.job && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-3 pt-3 border-t border-gray-100"
                        >
                          <div className="text-xs text-gray-600 flex items-center space-x-1">
                            <Briefcase className="h-3 w-3" />
                            <span className="truncate">
                              {application.job.title}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {application.job.department}
                          </div>
                        </motion.div>
                      )}

                      {/* Applied Date */}
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-xs text-gray-500 flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Applied{" "}
                            {new Date(
                              application.appliedAt
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Enhanced Quick Actions */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 1 }}
                        className="mt-3 pt-3 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <QuickActions
                          application={application}
                          onStatusChange={handleStatusChange}
                          onEmail={handleEmailApplication}
                          onView={handleViewApplication}
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
                        <ArrowRight className={`h-5 w-5 ${stage.textColor}`} />
                      ) : (
                        <Plus className={`h-5 w-5 ${stage.textColor}`} />
                      )}
                    </motion.div>
                    <p className="text-sm text-gray-500">
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
            <div className="bg-white border-2 border-blue-400 rounded-lg p-3 shadow-2xl max-w-[250px]">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold bg-blue-500">
                  {ghostPreview.name?.charAt(0)?.toUpperCase() ||
                    ghostPreview.email?.charAt(0)?.toUpperCase() ||
                    "A"}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 truncate">
                    {ghostPreview.name || "Anonymous"}
                  </h4>
                  <div className="text-xs text-gray-600 flex items-center space-x-1">
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
          className="grid grid-cols-2 md:grid-cols-5 gap-4"
        >
          {applicationsByStatus.stages.map((stage, index) => (
            <motion.div
              key={stage.id}
              variants={itemVariants}
              whileHover={{ scale: 1.05, y: -2 }}
              className="text-center"
            >
              <motion.div
                className={`w-16 h-16 rounded-full ${stage.bgColor} ${stage.borderColor} border-2 mx-auto mb-2 flex items-center justify-center`}
                whileHover={{
                  boxShadow: `0 0 0 4px ${stage.bgColor}40`,
                  scale: 1.1,
                }}
              >
                <span className={`text-xl font-bold ${stage.textColor}`}>
                  {stage.count}
                </span>
              </motion.div>
              <div className="text-sm font-medium text-gray-900">
                {stage.title}
              </div>
              <div className="text-xs text-gray-500">
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

      {/* Application Detail Modal */}
      <AnimatePresence>
        {showApplicationModal && (
          <ApplicationDetailModal
            application={selectedApplication}
            isOpen={showApplicationModal}
            onClose={handleCloseModal}
            onStatusUpdate={handleModalStatusUpdate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
