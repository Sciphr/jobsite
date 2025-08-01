"use client";

import { Search } from "lucide-react";

export default function RecipientSelection({
  jobs,
  selectedJob,
  setSelectedJob,
  selectedStatus,
  setSelectedStatus,
  searchTerm,
  setSearchTerm,
  filteredApplications,
  recipients,
  onRecipientToggle,
  isRecipientSelected,
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Select Recipients</h3>

      {/* Filters */}
      <div className="space-y-3">
        <select
          value={selectedJob}
          onChange={(e) => setSelectedJob(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          <option value="">All Jobs</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="Applied">Applied</option>
          <option value="Reviewing">Reviewing</option>
          <option value="Interview">Interview</option>
          <option value="Hired">Hired</option>
          <option value="Rejected">Rejected</option>
        </select>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search candidates..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Candidates List */}
      <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Candidates ({filteredApplications.length})</span>
            <button
              onClick={() => {
                if (recipients.length === filteredApplications.length) {
                  // Deselect all - this would need to be handled in parent
                  filteredApplications.forEach((app) => {
                    if (isRecipientSelected(app.id)) {
                      onRecipientToggle(app);
                    }
                  });
                } else {
                  // Select all - this would need to be handled in parent
                  filteredApplications.forEach((app) => {
                    if (!isRecipientSelected(app.id)) {
                      onRecipientToggle(app);
                    }
                  });
                }
              }}
              className="text-blue-600 hover:text-blue-800"
            >
              {recipients.length === filteredApplications.length ? "Deselect All" : "Select All"}
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredApplications.map((application) => (
            <div
              key={application.id}
              className="p-3 hover:bg-gray-50 cursor-pointer"
              onClick={() => onRecipientToggle(application)}
            >
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={isRecipientSelected(application.id)}
                  onChange={(e) => {
                    e.stopPropagation(); // Prevent row click
                  }}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent row click
                    onRecipientToggle(application);
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {application.name || "Anonymous"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{application.email}</p>
                  <p className="text-xs text-gray-400">{application.job?.title}</p>
                </div>
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
          ))}
        </div>
      </div>
    </div>
  );
}