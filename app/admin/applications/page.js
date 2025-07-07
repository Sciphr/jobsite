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

  useEffect(() => {
    fetchApplications();
    fetchJobs();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [applications, searchTerm, statusFilter, jobFilter]);

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

  const fetchJobs = async () => {
    try {
      const response = await fetch("/api/admin/jobs");
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

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (app) =>
          app.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.job?.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }

    // Job filter
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
            onClick={fetchApplications}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          {selectedApplications.length > 0 && (
            <div className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-lg">
              <span className="text-sm text-blue-800">
                {selectedApplications.length} selected
              </span>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Bulk Action
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {statusOptions.map((status) => {
          const count = applications.filter(
            (app) => app.status === status
          ).length;
          return (
            <div
              key={status}
              className="bg-white p-4 rounded-lg shadow border border-gray-200"
            >
              <div className="text-2xl font-bold text-gray-900">{count}</div>
              <div className="text-sm text-gray-600">{status}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or job title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 text-gray-600 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            >
              <option value="all">All Statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Job Filter */}
          <div className="relative">
            <select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              className="w-full px-4 py-2 border text-gray-600 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            >
              <option value="all">All Jobs</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

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
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {application.resumeUrl && (
                          <button
                            className="p-1 text-gray-400 hover:text-green-600 transition-colors duration-200"
                            title="Download resume"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                          title="More actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
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
    </div>
  );
}
