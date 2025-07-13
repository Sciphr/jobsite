// app/applications-manager/pipeline/page.js
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { useApplications, useJobsSimple } from "@/app/hooks/useAdminData";
import ApplicationDetailModal from "../components/ApplicationDetailModal";
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

  // Local state
  const [selectedJob, setSelectedJob] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showJobFilter, setShowJobFilter] = useState(false);
  const [draggedApplication, setDraggedApplication] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  // Pipeline stages configuration
  const pipelineStages = [
    {
      id: "Applied",
      title: "New Applications",
      color: "bg-blue-500",
      textColor: "text-blue-700",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      count: 0,
    },
    {
      id: "Reviewing",
      title: "Under Review",
      color: "bg-yellow-500",
      textColor: "text-yellow-700",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      count: 0,
    },
    {
      id: "Interview",
      title: "Interview Stage",
      color: "bg-green-500",
      textColor: "text-green-700",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      count: 0,
    },
    {
      id: "Hired",
      title: "Hired",
      color: "bg-emerald-500",
      textColor: "text-emerald-700",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      count: 0,
    },
    {
      id: "Rejected",
      title: "Not Selected",
      color: "bg-red-500",
      textColor: "text-red-700",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      count: 0,
    },
  ];

  // Filter applications
  const filteredApplications = useMemo(() => {
    let filtered = applications;

    // Filter by job
    if (selectedJob !== "all") {
      filtered = filtered.filter((app) => app.jobId === selectedJob);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (app) =>
          app.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.job?.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
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

    // Update stage counts
    const updatedStages = pipelineStages.map((stage) => ({
      ...stage,
      count: grouped[stage.id]?.length || 0,
    }));

    return { grouped, stages: updatedStages };
  }, [filteredApplications]);

  const handleStatusChange = async (applicationId, newStatus) => {
    // Get current applications data
    const currentApplications = queryClient.getQueryData([
      "admin",
      "applications",
    ]);

    // Optimistically update the cache immediately
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
        // Revert the optimistic update on error
        queryClient.setQueryData(
          ["admin", "applications"],
          currentApplications
        );
        console.error("Failed to update status, reverting changes");
      } else {
        console.log("Status updated successfully");
      }
    } catch (error) {
      // Revert the optimistic update on error
      queryClient.setQueryData(["admin", "applications"], currentApplications);
      console.error(
        "Error updating application status, reverting changes:",
        error
      );
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e, application) => {
    setDraggedApplication(application);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", e.target.outerHTML);
    // Don't set opacity here, let CSS handle it
  };

  const handleDragEnd = (e) => {
    // Small delay to ensure drop handlers run first
    setTimeout(() => {
      setDraggedApplication(null);
      setDragOverColumn(null);
    }, 50);
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
    // Only clear drag over if we're leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (e, targetStage) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedApplication || draggedApplication.status === targetStage) {
      setDraggedApplication(null); // Clear drag state even if no change
      return; // No change needed
    }

    // Clear drag state immediately for smooth transition
    const appToUpdate = draggedApplication;
    setDraggedApplication(null);

    // Update status with optimistic update
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
    // Update the selected application state to reflect the change
    if (selectedApplication && selectedApplication.id === applicationId) {
      setSelectedApplication((prev) => ({ ...prev, status: newStatus }));
    }
  };

  const selectedJobData = jobs.find((job) => job.id === selectedJob);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold admin-text flex items-center space-x-3">
            <Target className="h-8 w-8 text-blue-600" />
            <span>Application Pipeline</span>
          </h1>
          <p className="admin-text-light mt-2">
            Kanban-style workflow management for hiring process
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push("/applications-manager")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${getButtonClasses("secondary")}`}
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            <span>Back to Overview</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-card p-6 rounded-lg shadow">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 flex-1">
            {/* Job Filter */}
            <div className="relative">
              <button
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
                    : selectedJobData?.title || "Select Job"}
                </span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {showJobFilter && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-80 overflow-y-auto">
                  <div className="p-3 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Filter by Job
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    <button
                      onClick={() => {
                        setSelectedJob("all");
                        setShowJobFilter(false);
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                        selectedJob === "all" ? "bg-blue-50 text-blue-700" : ""
                      }`}
                    >
                      <div className="text-sm font-medium">All Jobs</div>
                      <div className="text-xs text-gray-500">
                        Show applications from all positions
                      </div>
                    </button>
                    {jobs.map((job) => (
                      <button
                        key={job.id}
                        onClick={() => {
                          setSelectedJob(job.id);
                          setShowJobFilter(false);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
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
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

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
          </div>

          <div className="text-sm admin-text-light">
            Showing {filteredApplications.length} applications
            {selectedJob !== "all" && selectedJobData && (
              <span> for {selectedJobData.title}</span>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline Board */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-[600px]">
        {applicationsByStatus.stages.map((stage) => (
          <div
            key={stage.id}
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
            <div
              className={`p-4 ${stage.bgColor} ${stage.borderColor} border-b`}
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
                <div className={`w-3 h-3 rounded-full ${stage.color}`}></div>
              </div>
            </div>

            {/* Applications List */}
            <div className="p-3 space-y-3 max-h-[500px] overflow-y-auto">
              {applicationsByStatus.grouped[stage.id]?.map((application) => (
                <div
                  key={application.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, application)}
                  onDragEnd={handleDragEnd}
                  className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-move group ${
                    draggedApplication?.id === application.id
                      ? "opacity-50 scale-95"
                      : "hover:scale-[1.02]"
                  }`}
                  onClick={() =>
                    router.push(
                      `/applications-manager/jobs/${application.jobId}`
                    )
                  }
                >
                  {/* Applicant Info */}
                  <div className="flex items-start space-x-3">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${getButtonClasses("primary")}`}
                    >
                      {application.name?.charAt(0)?.toUpperCase() ||
                        application.email?.charAt(0)?.toUpperCase() ||
                        "A"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {application.name || "Anonymous"}
                      </h4>
                      <div className="text-xs text-gray-500 flex items-center space-x-1 mt-1">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{application.email}</span>
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
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="text-xs text-gray-600 flex items-center space-x-1">
                        <Briefcase className="h-3 w-3" />
                        <span className="truncate">
                          {application.job.title}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {application.job.department}
                      </div>
                    </div>
                  )}

                  {/* Applied Date */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-500 flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Applied{" "}
                        {new Date(application.appliedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions (shown on hover) */}
                  <div className="mt-3 pt-3 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewApplication(application);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="View details"
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                        {application.resumeUrl && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle download action
                            }}
                            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                            title="Download resume"
                          >
                            <Download className="h-3 w-3" />
                          </button>
                        )}
                        <div className="w-px h-4 bg-gray-300"></div>
                        <div className="text-xs text-gray-400 flex items-center space-x-1">
                          <span>Drag to move</span>
                        </div>
                      </div>

                      {/* Quick Status Actions */}
                      <div className="flex items-center space-x-1">
                        {stage.id !== "Hired" && stage.id !== "Rejected" && (
                          <>
                            {stage.id === "Applied" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(
                                    application.id,
                                    "Reviewing"
                                  );
                                }}
                                className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                              >
                                Review
                              </button>
                            )}
                            {stage.id === "Reviewing" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(
                                    application.id,
                                    "Interview"
                                  );
                                }}
                                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                              >
                                Interview
                              </button>
                            )}
                            {stage.id === "Interview" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(application.id, "Hired");
                                }}
                                className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors"
                              >
                                Hire
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )) || (
                <div
                  className={`text-center py-8 transition-all duration-200 ${
                    dragOverColumn === stage.id
                      ? "bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg"
                      : ""
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-full ${stage.bgColor} ${stage.borderColor} border-2 border-dashed mx-auto mb-3 flex items-center justify-center`}
                  >
                    {dragOverColumn === stage.id ? (
                      <ArrowRight className={`h-5 w-5 ${stage.textColor}`} />
                    ) : (
                      <Plus className={`h-5 w-5 ${stage.textColor}`} />
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {dragOverColumn === stage.id
                      ? "Drop here to update status"
                      : "No applications"}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline Stats Summary */}
      <div className="admin-card p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold admin-text mb-4">
          Pipeline Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {applicationsByStatus.stages.map((stage) => (
            <div key={stage.id} className="text-center">
              <div
                className={`w-16 h-16 rounded-full ${stage.bgColor} ${stage.borderColor} border-2 mx-auto mb-2 flex items-center justify-center`}
              >
                <span className={`text-xl font-bold ${stage.textColor}`}>
                  {stage.count}
                </span>
              </div>
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
            </div>
          ))}
        </div>
      </div>

      {/* Application Detail Modal */}
      <ApplicationDetailModal
        application={selectedApplication}
        isOpen={showApplicationModal}
        onClose={handleCloseModal}
        onStatusUpdate={handleModalStatusUpdate}
      />
    </div>
  );
}
