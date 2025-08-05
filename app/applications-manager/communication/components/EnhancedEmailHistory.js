"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Download, 
  Loader2, 
  Search, 
  Mail, 
  Eye, 
  Send, 
  MoreHorizontal, 
  ExternalLink,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Zap,
  Globe,
  Filter,
  BarChart3,
  Users,
  TrendingUp,
  Shield,
  Activity,
  ChevronDown,
  ChevronRight,
  FileText,
  Target,
  Calendar
} from "lucide-react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";

export default function EnhancedEmailHistory({
  emails,
  loading,
  jobs,
  emailTemplates,
  historySearch,
  setHistorySearch,
  historyStatus,
  setHistoryStatus,
  historyJob,
  setHistoryJob,
  historyTemplate,
  setHistoryTemplate,
  historyDateFrom,
  setHistoryDateFrom,
  historyDateTo,
  setHistoryDateTo,
  onExport,
  exportingEmails,
  getEmailStatusColor,
  stats = {},
  users = [],
  // New audit-specific props
  auditEmails = [],
  auditLoading = false,
  auditStats = {},
  useAuditData = false,
  onToggleAuditData,
  historySeverity = "",
  setHistorySeverity,
  historyActor = "",
  setHistoryActor,
  includeFailures = true,
  setIncludeFailures,
}) {
  const { getButtonClasses } = useThemeClasses();
  const [selectedEmailForModal, setSelectedEmailForModal] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const openEmailModal = (email) => {
    setSelectedEmailForModal(email);
  };

  const closeEmailModal = () => {
    setSelectedEmailForModal(null);
  };

  const currentEmails = useAuditData ? auditEmails : emails;
  const currentLoading = useAuditData ? auditLoading : loading;
  const currentStats = useAuditData ? auditStats : stats;

  const getAuditStatusIcon = (status, severity) => {
    if (status === "success") {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (status === "failure") {
      return severity === "error" ? 
        <XCircle className="h-4 w-4 text-red-500" /> : 
        <AlertCircle className="h-4 w-4 text-yellow-500" />;
    } else if (status === "pending") {
      return <Clock className="h-4 w-4 text-blue-500" />;
    }
    return <Activity className="h-4 w-4 text-gray-400" />;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical": return "bg-red-100 text-red-800 border-red-200";
      case "error": return "bg-red-50 text-red-700 border-red-100";
      case "warning": return "bg-yellow-50 text-yellow-700 border-yellow-100";
      case "info": return "bg-blue-50 text-blue-700 border-blue-100";
      default: return "bg-gray-50 text-gray-700 border-gray-100";
    }
  };

  const formatAuditMetadata = (metadata) => {
    if (!metadata) return null;
    
    const importantFields = {
      subject: "Subject",
      recipientCount: "Recipients",
      successfulSends: "Successful",
      failedSends: "Failed",
      templateName: "Template",
      errorMessage: "Error",
      statusCode: "Status Code",
      duration: "Duration",
    };

    return Object.entries(metadata)
      .filter(([key, value]) => importantFields[key] && value !== null && value !== undefined)
      .map(([key, value]) => (
        <div key={key} className="text-xs">
          <span className="font-medium admin-text-light">{importantFields[key]}:</span>
          <span className="ml-1 admin-text">{String(value)}</span>
        </div>
      ));
  };

  return (
    <div className="space-y-6">
      {/* Header with Toggle and Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold admin-text">Email History</h3>
          <div className="flex items-center space-x-3">
            {onToggleAuditData && (
              <button
                onClick={onToggleAuditData}
                className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm transition-colors ${
                  useAuditData 
                    ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700" 
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                }`}
              >
                <Shield className="h-4 w-4" />
                <span>{useAuditData ? "Audit View" : "Standard View"}</span>
              </button>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onExport}
              disabled={exportingEmails}
              className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm ${getButtonClasses("secondary")} disabled:opacity-50`}
            >
              {exportingEmails ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>{exportingEmails ? "Exporting..." : "Export"}</span>
            </motion.button>
          </div>
        </div>

        {/* Enhanced Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{currentStats.total || 0}</div>
            <div className="text-xs text-blue-600 dark:text-blue-400">{useAuditData ? "Events" : "Emails"}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{currentStats.sent || 0}</div>
            <div className="text-xs text-green-600 dark:text-green-400">Successful</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{currentStats.failed || 0}</div>
            <div className="text-xs text-red-600 dark:text-red-400">Failed</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {currentStats.successRate || 0}%
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400">Success Rate</div>
          </div>
        </div>
      </div>

      {/* Advanced Stats for Audit View */}
      {useAuditData && auditStats.uniqueSenders !== undefined && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-lg font-semibold admin-text">{auditStats.uniqueSenders}</div>
                <div className="text-xs admin-text-light">Unique Senders</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Target className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-lg font-semibold admin-text">{auditStats.bulkCampaigns || 0}</div>
                <div className="text-xs admin-text-light">Bulk Campaigns</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div>
                <div className="text-lg font-semibold admin-text">
                  {auditStats.activityTrends?.length || 0}
                </div>
                <div className="text-xs admin-text-light">Active Days</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-8 w-8 text-orange-500" />
              <div>
                <div className="text-lg font-semibold admin-text">
                  {Math.round((auditStats.total || 0) / 30)}
                </div>
                <div className="text-xs admin-text-light">Daily Average</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Filters */}
      <div className="admin-card rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 admin-text-light" />
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search emails..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-sm admin-text admin-card"
            />
          </div>
          <select
            value={historyStatus}
            onChange={(e) => setHistoryStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-sm admin-text admin-card"
          >
            <option value="">All Statuses</option>
            <option value="success">Success</option>
            <option value="failure">Failed</option>
            <option value="pending">Pending</option>
            {!useAuditData && (
              <>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="opened">Opened</option>
              </>
            )}
          </select>
          <select
            value={historyJob}
            onChange={(e) => setHistoryJob(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-sm admin-text admin-card"
          >
            <option value="">All Jobs</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
          <select
            value={historyTemplate}
            onChange={(e) => setHistoryTemplate(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-sm admin-text admin-card"
          >
            <option value="">All Templates</option>
            {emailTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={historyDateFrom}
            onChange={(e) => setHistoryDateFrom(e.target.value)}
            placeholder="From date"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-sm admin-text admin-card"
          />
          <input
            type="date"
            value={historyDateTo}
            onChange={(e) => setHistoryDateTo(e.target.value)}
            placeholder="To date"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-sm admin-text admin-card"
          />
        </div>

        {/* Advanced Filters for Audit View */}
        {useAuditData && (
          <div className="mt-4">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              <Filter className="h-4 w-4" />
              <span>Advanced Filters</span>
              {showAdvancedFilters ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronRight className="h-4 w-4" />
              }
            </button>
            
            <AnimatePresence>
              {showAdvancedFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-4"
                >
                  <select
                    value={historySeverity}
                    onChange={(e) => setHistorySeverity(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-sm admin-text admin-card"
                  >
                    <option value="">All Severities</option>
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                    <option value="critical">Critical</option>
                  </select>
                  <select
                    value={historyActor}
                    onChange={(e) => setHistoryActor(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-sm admin-text admin-card"
                  >
                    <option value="">All Senders</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={includeFailures}
                      onChange={(e) => setIncludeFailures(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="admin-text">Include Failures</span>
                  </label>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Email Table */}
      <div>
        {currentLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 admin-text-light">Loading email history...</span>
          </div>
        ) : currentEmails.length > 0 ? (
          <div className="border admin-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="admin-card">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium admin-text-light uppercase tracking-wider">
                    {useAuditData ? "Event" : "Subject"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium admin-text-light uppercase tracking-wider">
                    {useAuditData ? "Actor" : "Recipient"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium admin-text-light uppercase tracking-wider">
                    Status
                  </th>
                  {useAuditData && (
                    <th className="px-6 py-3 text-left text-xs font-medium admin-text-light uppercase tracking-wider">
                      Severity
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium admin-text-light uppercase tracking-wider">
                    {useAuditData ? "Context" : "Engagement"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium admin-text-light uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium admin-text-light uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="admin-card divide-y admin-border">
                {currentEmails.map((email) => (
                  <motion.tr
                    key={email.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                      <td className="px-6 py-4">
                        <div className="flex items-start space-x-3">
                          {useAuditData && getAuditStatusIcon(email.status, email.severity)}
                          <div>
                            <p className="text-sm font-medium admin-text">
                              {useAuditData ? 
                                (email.emailSubject || email.action) : 
                                email.subject
                              }
                            </p>
                            <p className="text-xs admin-text-light">
                              {useAuditData ? 
                                (email.templateInfo?.name || email.description) :
                                (email.template?.name || "Custom Email")
                              }
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium admin-text">
                            {useAuditData ? 
                              email.actorName :
                              (email.recipientName || "Unknown")
                            }
                          </p>
                          <p className="text-xs admin-text-light">
                            {useAuditData ? 
                              (email.recipientInfo?.email || email.actorType) :
                              email.recipientEmail
                            }
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            useAuditData ? 
                              getSeverityColor(email.emailStatus) :
                              getEmailStatusColor(email.status)
                          }`}
                        >
                          {useAuditData ? email.emailStatus : email.status}
                        </span>
                      </td>
                      {useAuditData && (
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(email.severity)}`}>
                            {email.severity}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4">
                        {useAuditData ? (
                          <div className="text-xs space-y-1">
                            {email.relatedJob && (
                              <div className="flex items-center space-x-1">
                                <FileText className="h-3 w-3 text-blue-500" />
                                <span>{email.relatedJob.title}</span>
                              </div>
                            )}
                            {email.campaignInfo?.isBulk && (
                              <div className="flex items-center space-x-1">
                                <Users className="h-3 w-3 text-purple-500" />
                                <span>{email.campaignInfo.recipientCount} recipients</span>
                              </div>
                            )}
                            {email.ipAddress && (
                              <div className="flex items-center space-x-1">
                                <Globe className="h-3 w-3 text-gray-500" />
                                <span>{email.ipAddress}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center space-x-4 text-xs">
                            <div className="flex items-center space-x-1">
                              <Eye
                                className={`h-3 w-3 ${email.openedAt ? "text-green-500" : "text-gray-400"}`}
                              />
                              <span
                                className={email.openedAt ? "text-green-600" : "text-gray-500"}
                              >
                                {email.openedAt ? "Opened" : "Not opened"}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <ExternalLink
                                className={`h-3 w-3 ${email.clickedAt ? "text-blue-500" : "text-gray-400"}`}
                              />
                              <span
                                className={email.clickedAt ? "text-blue-600" : "text-gray-500"}
                              >
                                {email.clickedAt ? "Clicked" : "No clicks"}
                              </span>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm admin-text">
                          {email.sentAt ? new Date(email.sentAt).toLocaleDateString() : 
                           email.createdAt ? new Date(email.createdAt).toLocaleDateString() : ""}
                        </div>
                        <div className="text-xs admin-text-light">
                          {email.sentAt ? new Date(email.sentAt).toLocaleTimeString() :
                           email.createdAt ? new Date(email.createdAt).toLocaleTimeString() : ""}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            onClick={() => openEmailModal(email)}
                            className="p-1 admin-text-light hover:text-blue-600 transition-colors"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </motion.button>
                          {!useAuditData && (
                            <>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                className="p-1 admin-text-light hover:text-green-600 transition-colors"
                                title="Resend"
                              >
                                <Send className="h-4 w-4" />
                              </motion.button>
                            </>
                          )}
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            className="p-1 admin-text-light hover:admin-text transition-colors"
                            title="More options"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium admin-text mb-2">No emails found</h3>
            <p className="admin-text-light">
              {historySearch || historyStatus || historyJob || historyTemplate
                ? "Try adjusting your filters to see more results."
                : "No emails have been sent yet."}
            </p>
          </div>
        )}
      </div>

      {/* Email Details Modal */}
      <AnimatePresence>
        {selectedEmailForModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={closeEmailModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="admin-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b admin-border admin-card">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold admin-text">
                    {useAuditData ? "Event Details" : "Email Details"}
                  </h3>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={closeEmailModal}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column - Main Details */}
                  <div>
                    <h4 className="font-semibold admin-text mb-4 text-lg">
                      {useAuditData ? "Event Information" : "Email Information"}
                    </h4>
                    <div className="space-y-4">
                      {useAuditData ? (
                        <>
                          <div className="admin-card p-4 rounded-lg">
                            <label className="text-sm font-medium admin-text-light">Description</label>
                            <p className="admin-text mt-1">{selectedEmailForModal.description}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="admin-card p-4 rounded-lg">
                              <label className="text-sm font-medium admin-text-light">Event Type</label>
                              <p className="admin-text mt-1">{selectedEmailForModal.eventType}</p>
                            </div>
                            <div className="admin-card p-4 rounded-lg">
                              <label className="text-sm font-medium admin-text-light">Category</label>
                              <p className="admin-text mt-1">{selectedEmailForModal.category}</p>
                            </div>
                          </div>
                          {selectedEmailForModal.subcategory && (
                            <div className="admin-card p-4 rounded-lg">
                              <label className="text-sm font-medium admin-text-light">Subcategory</label>
                              <p className="admin-text mt-1">{selectedEmailForModal.subcategory}</p>
                            </div>
                          )}
                          {selectedEmailForModal.requestId && (
                            <div className="admin-card p-4 rounded-lg">
                              <label className="text-sm font-medium admin-text-light">Request ID</label>
                              <p className="admin-text mt-1 font-mono text-sm">{selectedEmailForModal.requestId}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="admin-card p-4 rounded-lg">
                            <label className="text-sm font-medium admin-text-light">Subject</label>
                            <p className="admin-text mt-1 text-lg">{selectedEmailForModal.subject}</p>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <label className="text-sm font-medium text-gray-600">Content</label>
                            <div className="text-gray-900 mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded p-3 bg-white">
                              {selectedEmailForModal.htmlContent ? (
                                <div dangerouslySetInnerHTML={{ __html: selectedEmailForModal.htmlContent }} />
                              ) : (
                                <pre className="whitespace-pre-wrap text-sm">{selectedEmailForModal.content}</pre>
                              )}
                            </div>
                          </div>
                          {selectedEmailForModal.messageId && (
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <label className="text-sm font-medium text-gray-600">Message ID</label>
                              <p className="text-gray-900 mt-1 font-mono text-sm">{selectedEmailForModal.messageId}</p>
                            </div>
                          )}
                          {selectedEmailForModal.failureReason && (
                            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                              <label className="text-sm font-medium text-red-600">Failure Reason</label>
                              <p className="text-red-900 mt-1">{selectedEmailForModal.failureReason}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Context & Metadata */}
                  <div>
                    <h4 className="font-semibold admin-text mb-4 text-lg">
                      {useAuditData ? "Context & Metadata" : "Additional Information"}
                    </h4>
                    <div className="space-y-4">
                      {useAuditData ? (
                        <div className="space-y-3">
                          {formatAuditMetadata(selectedEmailForModal.metadata)?.map((item, index) => (
                            <div key={index} className="bg-gray-50 p-3 rounded-lg">
                              {item}
                            </div>
                          ))}
                          {selectedEmailForModal.relatedJob && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                              <label className="text-sm font-medium text-blue-600 dark:text-blue-400">Related Job</label>
                              <p className="text-blue-900 dark:text-blue-300 mt-1">{selectedEmailForModal.relatedJob.title}</p>
                            </div>
                          )}
                          {selectedEmailForModal.campaignInfo?.isBulk && (
                            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                              <label className="text-sm font-medium text-purple-600 dark:text-purple-400">Bulk Campaign</label>
                              <p className="text-purple-900 dark:text-purple-300 mt-1">{selectedEmailForModal.campaignInfo.recipientCount} recipients</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="admin-card p-4 rounded-lg">
                              <label className="text-sm font-medium admin-text-light">Status</label>
                              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${getEmailStatusColor(selectedEmailForModal.status)}`}>
                                {selectedEmailForModal.status}
                              </span>
                            </div>
                            <div className="admin-card p-4 rounded-lg">
                              <label className="text-sm font-medium admin-text-light">Sent Date</label>
                              <p className="admin-text mt-1">
                                {selectedEmailForModal.sentAt ? new Date(selectedEmailForModal.sentAt).toLocaleString() : "Not sent"}
                              </p>
                            </div>
                          </div>
                          
                          {/* Engagement Metrics */}
                          <div className="admin-card p-4 rounded-lg">
                            <label className="text-sm font-medium admin-text-light mb-3 block">Engagement</label>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex items-center space-x-2">
                                <Eye className={`h-4 w-4 ${selectedEmailForModal.openedAt ? "text-green-500" : "text-gray-400"}`} />
                                <span className="text-sm">
                                  {selectedEmailForModal.openedAt ? 
                                    `Opened: ${new Date(selectedEmailForModal.openedAt).toLocaleString()}` : 
                                    "Not opened"
                                  }
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <ExternalLink className={`h-4 w-4 ${selectedEmailForModal.clickedAt ? "text-blue-500" : "text-gray-400"}`} />
                                <span className="text-sm">
                                  {selectedEmailForModal.clickedAt ? 
                                    `Clicked: ${new Date(selectedEmailForModal.clickedAt).toLocaleString()}` : 
                                    "No clicks"
                                  }
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Related Information */}
                          {(selectedEmailForModal.job || selectedEmailForModal.application || selectedEmailForModal.template) && (
                            <div className="space-y-3">
                              {selectedEmailForModal.job && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                                  <label className="text-sm font-medium text-blue-600 dark:text-blue-400">Related Job</label>
                                  <p className="text-blue-900 dark:text-blue-300 mt-1">{selectedEmailForModal.job.title}</p>
                                  <p className="text-blue-700 dark:text-blue-400 text-sm">{selectedEmailForModal.job.department}</p>
                                </div>
                              )}
                              {selectedEmailForModal.application && (
                                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
                                  <label className="text-sm font-medium text-green-600 dark:text-green-400">Related Application</label>
                                  <p className="text-green-900 dark:text-green-300 mt-1">{selectedEmailForModal.application.name}</p>
                                </div>
                              )}
                              {selectedEmailForModal.template && (
                                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                                  <label className="text-sm font-medium text-purple-600 dark:text-purple-400">Email Template</label>
                                  <p className="text-purple-900 dark:text-purple-300 mt-1">{selectedEmailForModal.template.name}</p>
                                  <p className="text-purple-700 dark:text-purple-400 text-sm">{selectedEmailForModal.template.type}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}