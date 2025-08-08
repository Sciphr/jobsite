// app/admin/approvals/components/HireApprovalsTab.js
"use client";

import { useState, useMemo } from "react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
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

export default function HireApprovalsTab() {
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

  // Process approval requests
  const requests = useMemo(() => {
    if (!requestsData) return [];
    return requestsData.requests || [];
  }, [requestsData]);

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
    setChangeApplicationStatus(action === 'approve' ? 'Hired' : '');
    setShowApprovalModal(true);
  };

  // Submit approval
  const handleSubmitApproval = async () => {
    if (!selectedRequest || !approvalAction) return;

    try {
      await processApprovalMutation.mutateAsync({
        requestId: selectedRequest.id,
        action: approvalAction,
        notes: notes.trim() || undefined,
        changeApplicationStatus: changeApplicationStatus || undefined,
      });

      setShowApprovalModal(false);
      setSelectedRequest(null);
      setApprovalAction(null);
      setNotes("");
      setChangeApplicationStatus("");
      
      // Refetch data
      refetch();
    } catch (error) {
      console.error('Failed to process approval:', error);
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

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Loading hire approval requests...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-4" />
        <p className="text-red-600 dark:text-red-400 mb-4">Failed to load hire approval requests</p>
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
        <h2 className="text-lg font-semibold admin-text">Pending Hire Requests</h2>
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
          <p className="admin-text-light">All hire requests have been processed.</p>
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
                        <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold admin-text">
                          {request.application?.name || 'Unknown Candidate'}
                        </h3>
                        <p className="text-sm admin-text-light">
                          {request.application?.email}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <Briefcase className="h-4 w-4 text-gray-400" />
                        <span className="text-sm admin-text">
                          {request.application?.job?.title || 'Unknown Position'}
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

                    <div className="flex items-center space-x-2 text-sm">
                      <span className="admin-text-light">Previous Status:</span>
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs admin-text">
                        {request.previous_status}
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-2 ml-4">
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
                  {approvalAction === 'approve' ? 'Approve' : 'Reject'} Hire Request
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm admin-text-light">Candidate:</p>
                    <p className="font-medium admin-text">
                      {selectedRequest.application?.name}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm admin-text-light">Position:</p>
                    <p className="font-medium admin-text">
                      {selectedRequest.application?.job?.title}
                    </p>
                  </div>

                  {approvalAction === 'approve' && (
                    <div>
                      <label className="block text-sm font-medium admin-text mb-2">
                        Change Application Status To:
                      </label>
                      <select
                        value={changeApplicationStatus}
                        onChange={(e) => setChangeApplicationStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 admin-text admin-card"
                      >
                        <option value="">Keep Current Status</option>
                        <option value="Hired">Hired</option>
                        <option value="Offer Extended">Offer Extended</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium admin-text mb-2">
                      Notes (Optional):
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
                    disabled={processApprovalMutation.isPending}
                    className={`flex-1 ${getButtonClasses("primary")} inline-flex items-center justify-center`}
                  >
                    {processApprovalMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : approvalAction === 'approve' ? (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    {approvalAction === 'approve' ? 'Approve' : 'Reject'}
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