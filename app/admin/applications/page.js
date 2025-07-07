"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  FileText,
  Search,
  Filter,
  Eye,
  Download,
  Mail,
  Phone,
  Calendar,
  User,
  Briefcase,
  ChevronDown,
  RefreshCw,
  MoreHorizontal,
  X,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

export default function AdminApplications() {
  const { data: session } = useSession();
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");
  const [jobs, setJobs] = useState([]);
  const [selectedApplications, setSelectedApplications] = useState([]);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);

  useEffect(() => {
    fetchApplications();
    fetchJobs();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [applications, searchTerm, statusFilter, jobFilter]);

  const [refreshing, setRefreshing] = useState(false);

  const fetchApplications = async () => {
    try {
      const response = await fetch("/api/admin/applications");
      if (response.ok) {
        const data = await response.json();
        setApplications(data);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/admin/applications");
      if (response.ok) {
        const data = await response.json();
        setApplications(data);
      }
    } catch (error) {
      console.error("Error refreshing applications:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await fetch("/api/admin/jobs-simple");
      if (response.ok) {
        const data = await response.json();
        setJobs(data);
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
    }
  };

  const filterApplications = () => {
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

    setFilteredApplications(filtered);
  };

  const updateApplicationStatus = async (applicationId, newStatus) => {
    try {
      const response = await fetch(`/api/admin/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setApplications((prev) =>
          prev.map((app) =>
            app.id === applicationId ? { ...app, status: newStatus } : app
          )
        );
      }
    } catch (error) {
      console.error("Error updating application status:", error);
    }
  };

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

  const deleteApplication = async (applicationId) => {
    if (
      !confirm(
        "Are you sure you want to delete this application? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/applications/${applicationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setApplications((prev) =>
          prev.filter((app) => app.id !== applicationId)
        );
        setSelectedApplications((prev) =>
          prev.filter((id) => id !== applicationId)
        );
      }
    } catch (error) {
      console.error("Error deleting application:", error);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedApplications.length === 0) return;

    const confirmMessage =
      action === "delete"
        ? `Are you sure you want to delete ${selectedApplications.length} application(s)? This cannot be undone.`
        : `Are you sure you want to ${action} ${selectedApplications.length} application(s)?`;

    if (!confirm(confirmMessage)) return;

    try {
      if (action === "delete") {
        await Promise.all(
          selectedApplications.map((id) =>
            fetch(`/api/admin/applications/${id}`, { method: "DELETE" })
          )
        );
        setApplications((prev) =>
          prev.filter((app) => !selectedApplications.includes(app.id))
        );
      } else {
        await Promise.all(
          selectedApplications.map((id) =>
            fetch(`/api/admin/applications/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: action }),
            })
          )
        );
        setApplications((prev) =>
          prev.map((app) =>
            selectedApplications.includes(app.id)
              ? { ...app, status: action }
              : app
          )
        );
      }
      setSelectedApplications([]);
    } catch (error) {
      console.error("Error performing bulk action:", error);
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

  const downloadResume = (resumeUrl, applicantName) => {
    if (!resumeUrl) return;

    const link = document.createElement("a");
    link.href = resumeUrl;
    link.download = `${applicantName || "applicant"}_resume.pdf`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white rounded-lg shadow border">
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Applications</h1>
          <p className="text-gray-600 mt-2">
            Manage job applications and candidate pipeline
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors duration-200 shadow-sm"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
          {selectedApplications.length > 0 && (
            <div className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-lg">
              <span className="text-sm text-blue-800">
                {selectedApplications.length} selected
              </span>
            </div>
          )}
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

          return (
            <div
              key={status}
              className={`bg-white p-6 rounded-lg shadow border-2 ${statusConfig.borderColor} hover:shadow-md transition-shadow duration-200`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {count}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">
                    {status}
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${statusConfig.bgColor}`}>
                  <StatusIcon className={`h-6 w-6 ${statusConfig.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or job title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
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
            onChange={(e) => setJobFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
          >
            <option value="all">All Jobs</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedApplications.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-800 font-medium">
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
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Applications ({filteredApplications.length})
            </h2>
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
              <span className="text-sm text-gray-600">Select all</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredApplications.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-12 px-6 py-3 text-left">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applied
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
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
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                          {application.name?.charAt(0)?.toUpperCase() ||
                            application.email?.charAt(0)?.toUpperCase() ||
                            "A"}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {application.name || "Anonymous"}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center space-x-1">
                            <Mail className="h-3 w-3" />
                            <span>{application.email}</span>
                          </div>
                          {application.phone && (
                            <div className="text-sm text-gray-500 flex items-center space-x-1">
                              <Phone className="h-3 w-3" />
                              <span>{application.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {application.job?.title}
                      </div>
                      <div className="text-sm text-gray-500">
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
                        )}`}
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 flex items-center space-x-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span>
                          {new Date(application.appliedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
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
                        <div className="relative group">
                          <button
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                            title="More actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          <div className="absolute right-0 top-8 w-32 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                            <button
                              onClick={() => deleteApplication(application.id)}
                              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No applications found
              </h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== "all" || jobFilter !== "all"
                  ? "Try adjusting your filters to see more results."
                  : "Applications will appear here when candidates apply to your jobs."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Application Details Modal */}
      {showApplicationModal && selectedApplication && (
        <>
          <div
            className="fixed inset-0 bg-gray-200 bg-opacity-30 backdrop-blur-sm z-50"
            onClick={() => setShowApplicationModal(false)}
          ></div>

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with gradient */}
              <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-white bg-opacity-30 flex items-center justify-center text-blue-600 font-semibold">
                      {selectedApplication.name?.charAt(0)?.toUpperCase() ||
                        selectedApplication.email?.charAt(0)?.toUpperCase() ||
                        "A"}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">
                        Application Details
                      </h2>
                      <p className="text-blue-100 text-sm">
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

              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <div className="space-y-6">
                  {/* Applicant Info Card */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-100">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Applicant Information
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-white rounded-lg p-3 border border-blue-100">
                        <span className="text-gray-700 font-medium block mb-1">
                          Name
                        </span>
                        <p className="text-gray-900">
                          {selectedApplication.name || "Not provided"}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-blue-100">
                        <span className="text-gray-700 font-medium block mb-1">
                          Email
                        </span>
                        <p className="text-gray-900">
                          {selectedApplication.email}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-blue-100">
                        <span className="text-gray-700 font-medium block mb-1">
                          Phone
                        </span>
                        <p className="text-gray-900">
                          {selectedApplication.phone || "Not provided"}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-blue-100">
                        <span className="text-gray-700 font-medium block mb-1">
                          Applied
                        </span>
                        <p className="text-gray-900">
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
                      <h3 className="text-lg font-semibold text-gray-900">
                        Position Details
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-white rounded-lg p-3 border border-green-100">
                        <span className="text-gray-700 font-medium block mb-1">
                          Position
                        </span>
                        <p className="text-gray-900">
                          {selectedApplication.job?.title}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-green-100">
                        <span className="text-gray-700 font-medium block mb-1">
                          Department
                        </span>
                        <p className="text-gray-900">
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
                        <h3 className="text-lg font-semibold text-gray-900">
                          Cover Letter
                        </h3>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-purple-100">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
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
                        <h3 className="text-lg font-semibold text-gray-900">
                          Internal Notes
                        </h3>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-yellow-200">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
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
                        <h3 className="text-lg font-semibold text-gray-900">
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
                  <span className="text-sm text-gray-700 font-medium">
                    Current Status:
                  </span>
                  <select
                    value={selectedApplication.status}
                    onChange={(e) => {
                      updateApplicationStatus(
                        selectedApplication.id,
                        e.target.value
                      );
                      setSelectedApplication((prev) => ({
                        ...prev,
                        status: e.target.value,
                      }));
                    }}
                    className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium"
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
        </>
      )}
    </div>
  );
}
