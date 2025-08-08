// app/admin/approvals/components/JobApprovalsTab.js
"use client";

import { useState, useMemo } from "react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Briefcase, 
  Calendar,
  AlertCircle,
  RefreshCw,
  Building,
  DollarSign,
  MapPin,
  Eye
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function JobApprovalsTab() {
  const { getStatCardClasses, getButtonClasses } = useThemeClasses();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState(null); // 'approve' or 'reject'
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Fetch job approval requests
  const fetchJobApprovals = async () => {
    try {
      const response = await fetch("/api/admin/job-approvals");
      const data = await response.json();
      
      if (data.success) {
        setRequests(data.approvals || []);
        setIsError(false);
      } else {
        setIsError(true);
        console.error("Failed to fetch job approvals:", data.error);
      }
    } catch (error) {
      console.error("Error fetching job approvals:", error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useState(() => {
    fetchJobApprovals();
  }, []);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchJobApprovals();
    setRefreshing(false);
  };

  // Stats
  const stats = useMemo(() => {
    const pending = requests.length;
    const recent = requests.filter(req => {
      const requestDate = new Date(req.requested_at);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return requestDate > oneDayAgo;
    }).length;

    return { pending, recent };
  }, [requests]);

  // Handle approval action
  const handleApproval = (request, action) => {
    setSelectedRequest(request);
    setApprovalAction(action);
    setNotes("");
    setRejectionReason("");
    setShowApprovalModal(true);
  };

  // Submit approval
  const handleSubmitApproval = async () => {
    if (!selectedRequest || !approvalAction) return;

    // Validation for reject action
    if (approvalAction === 'reject' && !rejectionReason.trim()) {
      alert("Rejection reason is required");
      return;
    }

    try {
      const response = await fetch(`/api/admin/job-approvals/${selectedRequest.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: approvalAction,
          notes: notes.trim() || undefined,
          rejectionReason: rejectionReason.trim() || undefined,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setShowApprovalModal(false);
        setSelectedRequest(null);
        setApprovalAction(null);
        setNotes("");
        setRejectionReason("");
        
        // Refresh data
        await fetchJobApprovals();
      } else {
        console.error('Failed to process approval:', result.error);
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to process approval:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format salary
  const formatSalary = (min, max) => {
    if (!min && !max) return "Not specified";
    if (min && max) {
      return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    }
    return min ? `$${min.toLocaleString()}+` : `Up to $${max.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Loading job approval requests...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-4" />
        <p className="text-red-600 dark:text-red-400 mb-4">Failed to load job approval requests</p>
        <button
          onClick={handleRefresh}
          className={`${getButtonClasses("primary")} inline-flex items-center`}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${getStatCardClasses(0).card} p-4`}
        >
          <div className="flex items-center">
            <div className={`${getStatCardClasses(0).bg} p-3 rounded-lg mr-4`}>
              <Clock className={`h-6 w-6 ${getStatCardClasses(0).icon}`} />
            </div>
            <div>
              <p className="text-sm admin-text-light">Pending Approvals</p>
              <p className="text-2xl font-bold admin-text">{stats.pending}</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`${getStatCardClasses(1).card} p-4`}
        >
          <div className="flex items-center">
            <div className={`${getStatCardClasses(1).bg} p-3 rounded-lg mr-4`}>
              <Calendar className={`h-6 w-6 ${getStatCardClasses(1).icon}`} />
            </div>
            <div>
              <p className="text-sm admin-text-light">New (24h)</p>
              <p className="text-2xl font-bold admin-text">{stats.recent}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold admin-text">Pending Job Requests</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`${getButtonClasses("secondary")} inline-flex items-center`}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium admin-text mb-2">No Pending Requests</h3>
          <p className="admin-text-light">All job posting requests have been processed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {requests.map((request, index) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="admin-card border admin-border rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold admin-text">
                          {request.job?.title || 'Unknown Job'}
                        </h3>
                        <p className="text-sm admin-text-light flex items-center">
                          <Building className="h-3 w-3 mr-1" />
                          {request.job?.department || 'No Department'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm admin-text">
                          {request.job?.location || 'Location TBD'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="text-sm admin-text">
                          {formatSalary(request.job?.salary_min, request.job?.salary_max)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm admin-text">
                          Requested by: {request.requested_by_user?.firstName} {request.requested_by_user?.lastName}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm admin-text">
                          {formatDate(request.requested_at)}
                        </span>
                      </div>
                    </div>

                    {request.job?.description && (
                      <div className="mb-4">
                        <p className="text-sm admin-text-light line-clamp-2">
                          {request.job.description.substring(0, 150)}
                          {request.job.description.length > 150 && "..."}
                        </p>
                      </div>
                    )}

                    {request.notes && (
                      <div className="mb-4">
                        <p className="text-xs admin-text-light">
                          <strong>Request Notes:</strong> {request.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    <button
                      onClick={() => handleApproval(request, 'approve')}
                      className="inline-flex items-center px-3 py-2 border border-green-300 rounded-md shadow-sm text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/30 transition-colors"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleApproval(request, 'reject')}
                      className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </button>
                    {request.job_id && (
                      <button
                        onClick={() => window.open(`/admin/jobs/${request.job_id}`, '_blank')}
                        className={`${getButtonClasses("secondary")} inline-flex items-center px-3 py-2 text-sm`}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Job
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Approval Modal */}
      <AnimatePresence>
        {showApprovalModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="admin-card rounded-lg shadow-xl max-w-md w-full"
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold admin-text mb-4">
                  {approvalAction === 'approve' ? 'Approve' : 'Reject'} Job Request
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm admin-text-light">Job Title:</p>
                    <p className="font-medium admin-text">
                      {selectedRequest.job?.title}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm admin-text-light">Department:</p>
                    <p className="font-medium admin-text">
                      {selectedRequest.job?.department || 'No Department'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm admin-text-light">Requested by:</p>
                    <p className="font-medium admin-text">
                      {selectedRequest.requested_by_user?.firstName} {selectedRequest.requested_by_user?.lastName}
                    </p>
                  </div>

                  {approvalAction === 'reject' && (
                    <div>
                      <label className="block text-sm font-medium admin-text mb-2">
                        Rejection Reason *:
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 admin-text admin-card resize-none"
                        rows={3}
                        placeholder="Please provide a clear reason for rejecting this job posting..."
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium admin-text mb-2">
                      Additional Notes (Optional):
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 admin-text admin-card resize-none"
                      rows={3}
                      placeholder={`Add a note about this ${approvalAction}...`}
                    />
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={handleSubmitApproval}
                    disabled={approvalAction === 'reject' && !rejectionReason.trim()}
                    className={`flex-1 ${getButtonClasses("primary")} inline-flex items-center justify-center disabled:opacity-50`}
                  >
                    {approvalAction === 'approve' ? (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    {approvalAction === 'approve' ? 'Approve Job' : 'Reject Job'}
                  </button>
                  <button
                    onClick={() => setShowApprovalModal(false)}
                    className={`flex-1 ${getButtonClasses("secondary")}`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}