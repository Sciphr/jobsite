// app/applications-manager/interviews/create/page.js
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { useJobs, useApplications } from "@/app/hooks/useAdminData";
import {
  Search,
  ArrowLeft,
  Home,
  ChevronRight,
  Calendar,
  User,
  Briefcase,
  Mail,
  Clock,
  AlertCircle,
} from "lucide-react";

export default function CreateInterviewPage() {
  const router = useRouter();
  const { getButtonClasses } = useThemeClasses();
  
  // Data fetching
  const { data: jobs = [], isLoading: jobsLoading } = useJobs();
  const { data: applications = [], isLoading: applicationsLoading } = useApplications();
  
  // State
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [jobSearchTerm, setJobSearchTerm] = useState("");
  const [applicationSearchTerm, setApplicationSearchTerm] = useState("");

  // Filter jobs and applications
  const filteredJobs = useMemo(() => {
    if (!jobSearchTerm) return jobs;
    return jobs.filter(job => 
      job.title.toLowerCase().includes(jobSearchTerm.toLowerCase()) ||
      job.department?.toLowerCase().includes(jobSearchTerm.toLowerCase())
    );
  }, [jobs, jobSearchTerm]);

  const filteredApplications = useMemo(() => {
    let filtered = applications;
    
    // Filter by selected job if one is selected
    if (selectedJob) {
      filtered = filtered.filter(app => app.jobId === selectedJob.id);
    }
    
    // Filter by search term
    if (applicationSearchTerm) {
      filtered = filtered.filter(app => 
        app.name?.toLowerCase().includes(applicationSearchTerm.toLowerCase()) ||
        app.email?.toLowerCase().includes(applicationSearchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [applications, selectedJob, applicationSearchTerm]);

  const handleCreateInterview = () => {
    if (!selectedApplication) {
      alert("Please select an application first");
      return;
    }
    
    // Navigate to the interview scheduling page for the selected application
    router.push(`/applications-manager/candidate/${selectedApplication.id}/schedule-interview`);
  };

  if (jobsLoading || applicationsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="h-32 bg-gray-200 rounded mb-6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <button
          onClick={() => router.push("/applications-manager")}
          className="hover:text-gray-900 flex items-center space-x-1"
        >
          <Home className="h-4 w-4" />
          <span>Overview</span>
        </button>
        <ChevronRight className="h-4 w-4" />
        <button
          onClick={() => router.push("/applications-manager/interviews")}
          className="hover:text-gray-900"
        >
          Interviews
        </button>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">Create New Interview</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold admin-text">Create New Interview</h1>
          <p className="admin-text-light mt-2">
            Select a job position and candidate to schedule an interview
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${getButtonClasses("secondary")}`}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Step 1: Select Job */}
        <div className="admin-card p-6 rounded-lg shadow">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold">1</span>
            </div>
            <h2 className="text-lg font-semibold admin-text">Select Job Position</h2>
          </div>

          {/* Job Search */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search jobs by title or department..."
              value={jobSearchTerm}
              onChange={(e) => setJobSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text bg-white dark:bg-gray-700"
            />
          </div>

          {/* Jobs List */}
          <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
            {filteredJobs.length === 0 ? (
              <div className="p-6 text-center admin-text-light">
                <Briefcase className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No jobs found</p>
                {jobSearchTerm && (
                  <p className="text-xs mt-1">Try adjusting your search terms</p>
                )}
              </div>
            ) : (
              filteredJobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => {
                    setSelectedJob(job);
                    setSelectedApplication(null); // Reset application when job changes
                    setApplicationSearchTerm("");
                  }}
                  className={`w-full text-left p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedJob?.id === job.id ? 'bg-blue-50 dark:bg-blue-900 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium admin-text">{job.title}</div>
                      <div className="text-sm admin-text-light mt-1">
                        {job.department} • {job.location}
                      </div>
                      <div className="text-xs admin-text-light mt-1">
                        {job.employmentType} • {job.experienceLevel}
                      </div>
                    </div>
                    {selectedJob?.id === job.id && (
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center ml-3">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {selectedJob && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  Selected: {selectedJob.title}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Select Application */}
        <div className="admin-card p-6 rounded-lg shadow">
          <div className="flex items-center space-x-3 mb-6">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              selectedJob ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              <span className={`font-semibold ${
                selectedJob ? 'text-blue-600' : 'text-gray-400'
              }`}>2</span>
            </div>
            <h2 className={`text-lg font-semibold ${
              selectedJob ? 'admin-text' : 'admin-text-light'
            }`}>
              Select Candidate
              {selectedJob && (
                <span className="ml-2 text-xs text-blue-600">
                  ({filteredApplications.length} applications for {selectedJob.title})
                </span>
              )}
            </h2>
          </div>

          {!selectedJob ? (
            <div className="p-8 bg-gray-50 dark:bg-gray-700 rounded-lg text-center admin-text-light">
              <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="font-medium mb-2">Please select a job first</p>
              <p className="text-sm">Choose a job position to see available candidates</p>
            </div>
          ) : (
            <>
              {/* Application Search */}
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search candidates by name or email..."
                  value={applicationSearchTerm}
                  onChange={(e) => setApplicationSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 admin-text bg-white dark:bg-gray-700"
                />
              </div>

              {/* Applications List */}
              <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                {filteredApplications.length === 0 ? (
                  <div className="p-6 text-center admin-text-light">
                    <User className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>No applications found for this job</p>
                    {applicationSearchTerm && (
                      <p className="text-xs mt-1">Try adjusting your search terms</p>
                    )}
                  </div>
                ) : (
                  filteredApplications.map((application) => (
                    <button
                      key={application.id}
                      onClick={() => setSelectedApplication(application)}
                      className={`w-full text-left p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        selectedApplication?.id === application.id ? 'bg-blue-50 dark:bg-blue-900 border-blue-200' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium admin-text">
                            {application.name || 'Anonymous Applicant'}
                          </div>
                          <div className="text-sm admin-text-light mt-1 flex items-center space-x-4">
                            <span className="flex items-center space-x-1">
                              <Mail className="h-3 w-3" />
                              <span>{application.email}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>Applied {new Date(application.appliedAt).toLocaleDateString()}</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            application.status === 'Applied' ? 'bg-blue-100 text-blue-800' :
                            application.status === 'Reviewing' ? 'bg-yellow-100 text-yellow-800' :
                            application.status === 'Interview' ? 'bg-green-100 text-green-800' :
                            application.status === 'Hired' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {application.status}
                          </div>
                          {selectedApplication?.id === application.id && (
                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {selectedApplication && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      Selected: {selectedApplication.name || 'Anonymous'} ({selectedApplication.email})
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Summary & Action */}
      {selectedJob && selectedApplication && (
        <div className="admin-card p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold admin-text mb-4">Interview Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium admin-text-light">Job Position</label>
                <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="font-medium admin-text">{selectedJob.title}</div>
                  <div className="text-sm admin-text-light">{selectedJob.department} • {selectedJob.location}</div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium admin-text-light">Candidate</label>
                <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="font-medium admin-text">{selectedApplication.name || 'Anonymous Applicant'}</div>
                  <div className="text-sm admin-text-light">{selectedApplication.email}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm admin-text-light">
              <AlertCircle className="h-4 w-4" />
              <span>This will take you to the interview scheduling page</span>
            </div>
            <button
              onClick={handleCreateInterview}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg ${getButtonClasses('primary')} text-lg font-medium`}
            >
              <Calendar className="h-5 w-5" />
              <span>Schedule Interview</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}