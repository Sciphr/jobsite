// app/admin/hire-approvals/page.js
"use client";

import { useState, useMemo } from "react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { ResourcePermissionGuard } from "@/app/components/guards/PagePermissionGuard";
import { 
  useHireApprovalRequests, 
  useProcessHireApproval 
} from "@/app/hooks/useAdminData";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Mail, 
  Briefcase, 
  Calendar,
  AlertCircle,
  MessageSquare,
  Eye,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function HireApprovalsContent() {
  const { getStatCardClasses, getButtonClasses } = useThemeClasses();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState(null); // 'approve' or 'reject'
  const [notes, setNotes] = useState("");
  const [changeApplicationStatus, setChangeApplicationStatus] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Data fetching
  const { 
    data: requestsData, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useHireApprovalRequests('pending');

  const processApprovalMutation = useProcessHireApproval();

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Handle approval/rejection
  const handleApprovalAction = (request, action) => {
    setSelectedRequest(request);
    setApprovalAction(action);
    setShowApprovalModal(true);
    setNotes("");
    setChangeApplicationStatus(action === 'reject' ? request.previous_status : "");
  };

  // Submit approval/rejection
  const handleSubmitApproval = async () => {
    if (!selectedRequest || !approvalAction) return;

    try {
      await processApprovalMutation.mutateAsync({
        action: approvalAction,
        requestId: selectedRequest.id,
        notes: notes.trim() || undefined,
        changeApplicationStatus: approvalAction === 'reject' && changeApplicationStatus
          ? changeApplicationStatus
          : undefined,
      });

      setShowApprovalModal(false);
      setSelectedRequest(null);
      setApprovalAction(null);
      setNotes("");
      setChangeApplicationStatus("");
    } catch (error) {
      console.error('Error processing approval:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const requests = requestsData?.requests || [];

  // Stats for display
  const stats = useMemo(() => {
    const totalPending = requests.length;
    const byDepartment = requests.reduce((acc, req) => {
      const dept = req.applications.jobs.department || 'Unknown';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});

    const urgentRequests = requests.filter(req => {
      const daysSinceRequest = Math.floor(
        (new Date() - new Date(req.requested_at)) / (1000 * 60 * 60 * 24)
      );
      return daysSinceRequest > 3; // Urgent if older than 3 days
    }).length;

    return {
      totalPending,
      urgentRequests,
      byDepartment,
    };
  }, [requests]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="admin-card p-6 rounded-lg shadow">
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
          <div className="admin-card rounded-lg shadow">
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="admin-card p-6 rounded-lg shadow">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold admin-text mb-2">Error Loading Requests</h3>
          <p className="admin-text-light mb-4">{error?.message || 'Failed to load hire approval requests'}</p>
          <button
            onClick={handleRefresh}
            className={`${getButtonClasses("primary")} px-4 py-2 rounded-lg`}
          >
            Try Again
          </button>
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
        className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0"
      >
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold admin-text flex items-center space-x-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <span>Hire Approvals</span>
          </h1>
          <p className="admin-text-light mt-2">
            Review and approve hiring decisions for job applications
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${getButtonClasses("secondary")} ${refreshing ? "opacity-50" : ""}`}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
        </button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`admin-card p-6 rounded-lg shadow ${getStatCardClasses(0).border} ${getStatCardClasses(0).hover}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold admin-text">{stats.totalPending}</div>
              <div className="text-sm admin-text-light font-medium">Pending Approvals</div>
            </div>
            <div className={`p-3 rounded-lg ${getStatCardClasses(0).bg}`}>
              <Clock className={`h-6 w-6 ${getStatCardClasses(0).icon}`} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`admin-card p-6 rounded-lg shadow ${getStatCardClasses(1).border} ${getStatCardClasses(1).hover}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold admin-text">{stats.urgentRequests}</div>
              <div className="text-sm admin-text-light font-medium">Urgent (3+ days)</div>
            </div>
            <div className={`p-3 rounded-lg ${getStatCardClasses(1).bg}`}>
              <AlertCircle className={`h-6 w-6 ${getStatCardClasses(1).icon}`} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`admin-card p-6 rounded-lg shadow ${getStatCardClasses(2).border} ${getStatCardClasses(2).hover}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold admin-text">{Object.keys(stats.byDepartment).length}</div>
              <div className="text-sm admin-text-light font-medium">Departments</div>
            </div>
            <div className={`p-3 rounded-lg ${getStatCardClasses(2).bg}`}>
              <Briefcase className={`h-6 w-6 ${getStatCardClasses(2).icon}`} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Pending Requests */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="admin-card rounded-lg shadow"
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold admin-text">
            Pending Requests ({requests.length})
          </h2>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          <AnimatePresence>
            {requests.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold admin-text mb-2">All Caught Up!</h3>
                <p className="admin-text-light">No pending hire approvals at this time.</p>
              </motion.div>
            ) : (
              requests.map((request, index) => {
                const daysSinceRequest = Math.floor(
                  (new Date() - new Date(request.requested_at)) / (1000 * 60 * 60 * 24)
                );
                const isUrgent = daysSinceRequest > 3;

                return (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      isUrgent ? 'border-l-4 border-orange-500' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      {/* Applicant Avatar */}
                      <div className="flex-shrink-0">
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center text-white font-semibold ${getButtonClasses("primary")}`}>
                          {request.applications.name?.charAt(0)?.toUpperCase() ||
                            request.applications.email?.charAt(0)?.toUpperCase() ||
                            "A"}
                        </div>
                      </div>

                      {/* Request Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-lg font-semibold admin-text">
                                {request.applications.name || "Anonymous Applicant"}
                              </h3>
                              {isUrgent && (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Urgent
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2 text-sm admin-text-light">
                                  <Mail className="h-4 w-4" />
                                  <span>{request.applications.email}</span>
                                </div>
                                <div className="flex items-center space-x-2 text-sm admin-text-light">
                                  <Briefcase className="h-4 w-4" />
                                  <span>{request.applications.jobs.title}</span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2 text-sm admin-text-light">
                                  <User className="h-4 w-4" />
                                  <span>
                                    Requested by {request.requested_by_user.firstName} {request.requested_by_user.lastName}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2 text-sm admin-text-light">
                                  <Calendar className="h-4 w-4" />
                                  <span>
                                    {daysSinceRequest === 0 
                                      ? 'Today' 
                                      : daysSinceRequest === 1 
                                        ? 'Yesterday' 
                                        : `${daysSinceRequest} days ago`
                                    }
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleApprovalAction(request, 'approve')}
                            disabled={processApprovalMutation.isLoading}
                            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span>Approve Hire</span>
                          </button>
                          
                          <button
                            onClick={() => handleApprovalAction(request, 'reject')}
                            disabled={processApprovalMutation.isLoading}
                            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            <XCircle className="h-4 w-4" />
                            <span>Reject</span>
                          </button>
                          
                          <button
                            onClick={() => window.open(`/admin/applications/${request.application_id}`, '_blank')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${getButtonClasses("secondary")}`}
                          >
                            <Eye className="h-4 w-4" />
                            <span>View Details</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Approval/Rejection Modal */}
      <AnimatePresence>
        {showApprovalModal && selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="admin-card rounded-lg shadow-xl max-w-md w-full p-6"
            >
              <h3 className="text-lg font-semibold admin-text mb-4">
                {approvalAction === 'approve' ? 'Approve Hire' : 'Reject Hire Request'}
              </h3>
              
              <div className="mb-4">
                <p className="admin-text-light mb-2">
                  <strong>Candidate:</strong> {selectedRequest.applications.name || 'Anonymous'}
                </p>
                <p className="admin-text-light mb-4">
                  <strong>Position:</strong> {selectedRequest.applications.jobs.title}
                </p>
              </div>

              {approvalAction === 'reject' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium admin-text mb-2">
                    Change Application Status (Optional)
                  </label>
                  <select
                    value={changeApplicationStatus}
                    onChange={(e) => setChangeApplicationStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg admin-text bg-white dark:bg-gray-700"
                  >
                    <option value="">Keep current status ({selectedRequest.applications.status})</option>
                    <option value="Interview">Interview</option>
                    <option value="Reviewing">Reviewing</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium admin-text mb-2">
                  Notes {approvalAction === 'reject' ? '(Required for rejection)' : '(Optional)'}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={approvalAction === 'approve' 
                    ? 'Add any notes about this approval...' 
                    : 'Please explain why this hire is being rejected...'
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg admin-text bg-white dark:bg-gray-700 resize-none"
                  rows="3"
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  disabled={processApprovalMutation.isLoading}
                  className={`px-4 py-2 rounded-lg transition-colors ${getButtonClasses("secondary")}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitApproval}
                  disabled={processApprovalMutation.isLoading || (approvalAction === 'reject' && !notes.trim())}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    approvalAction === 'approve'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  } disabled:opacity-50`}
                >
                  {processApprovalMutation.isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    approvalAction === 'approve' ? 'Approve Hire' : 'Reject Request'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HireApprovalsPage() {
  return (
    <ResourcePermissionGuard
      resource="applications"
      action="approve_hire"
      fallback={
        <div className="admin-card p-6 rounded-lg shadow">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold admin-text mb-2">Access Denied</h3>
            <p className="admin-text-light">
              You don't have permission to approve hiring decisions.
            </p>
          </div>
        </div>
      }
    >
      <HireApprovalsContent />
    </ResourcePermissionGuard>
  );
}