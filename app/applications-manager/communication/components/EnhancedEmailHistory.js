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
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const toggleRowExpansion = (id) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
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
          <span className="font-medium text-gray-600">{importantFields[key]}:</span>
          <span className="ml-1 text-gray-800">{String(value)}</span>
        </div>
      ));
  };

  return (
    <div className="space-y-6">
      {/* Header with Toggle and Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Email History</h3>
          <div className="flex items-center space-x-3">
            {onToggleAuditData && (
              <button
                onClick={onToggleAuditData}
                className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm transition-colors ${
                  useAuditData 
                    ? "bg-blue-100 text-blue-700 border border-blue-200" 
                    : "bg-gray-100 text-gray-600 border border-gray-200"
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
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{currentStats.total || 0}</div>
            <div className="text-xs text-blue-600">{useAuditData ? "Events" : "Emails"}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{currentStats.sent || 0}</div>
            <div className="text-xs text-green-600">Successful</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{currentStats.failed || 0}</div>
            <div className="text-xs text-red-600">Failed</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {currentStats.successRate || 0}%
            </div>
            <div className="text-xs text-purple-600">Success Rate</div>
          </div>
        </div>
      </div>

      {/* Advanced Stats for Audit View */}
      {useAuditData && auditStats.uniqueSenders !== undefined && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-lg font-semibold text-gray-800">{auditStats.uniqueSenders}</div>
                <div className="text-xs text-gray-600">Unique Senders</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Target className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-lg font-semibold text-gray-800">{auditStats.bulkCampaigns || 0}</div>
                <div className="text-xs text-gray-600">Bulk Campaigns</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div>
                <div className="text-lg font-semibold text-gray-800">
                  {auditStats.activityTrends?.length || 0}
                </div>
                <div className="text-xs text-gray-600">Active Days</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-8 w-8 text-orange-500" />
              <div>
                <div className="text-lg font-semibold text-gray-800">
                  {Math.round((auditStats.total || 0) / 30)}
                </div>
                <div className="text-xs text-gray-600">Daily Average</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Filters */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search emails..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          <select
            value={historyStatus}
            onChange={(e) => setHistoryStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
          <input
            type="date"
            value={historyDateTo}
            onChange={(e) => setHistoryDateTo(e.target.value)}
            placeholder="To date"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {/* Advanced Filters for Audit View */}
        {useAuditData && (
          <div className="mt-4">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
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
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                    <span>Include Failures</span>
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
            <span className="ml-2 text-gray-600">Loading email history...</span>
          </div>
        ) : currentEmails.length > 0 ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {useAuditData ? "Event" : "Subject"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {useAuditData ? "Actor" : "Recipient"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  {useAuditData && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Severity
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {useAuditData ? "Context" : "Engagement"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentEmails.map((email) => (
                  <React.Fragment key={email.id}>
                    <motion.tr
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-start space-x-3">
                          {useAuditData && getAuditStatusIcon(email.status, email.severity)}
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {useAuditData ? 
                                (email.emailSubject || email.action) : 
                                email.subject
                              }
                            </p>
                            <p className="text-xs text-gray-500">
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
                          <p className="text-sm font-medium text-gray-900">
                            {useAuditData ? 
                              email.actorName :
                              (email.recipientName || "Unknown")
                            }
                          </p>
                          <p className="text-xs text-gray-500">
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
                        <div className="text-sm text-gray-900">
                          {email.sentAt ? new Date(email.sentAt).toLocaleDateString() : 
                           email.createdAt ? new Date(email.createdAt).toLocaleDateString() : ""}
                        </div>
                        <div className="text-xs text-gray-500">
                          {email.sentAt ? new Date(email.sentAt).toLocaleTimeString() :
                           email.createdAt ? new Date(email.createdAt).toLocaleTimeString() : ""}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            onClick={() => toggleRowExpansion(email.id)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </motion.button>
                          {!useAuditData && (
                            <>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                                title="Resend"
                              >
                                <Send className="h-4 w-4" />
                              </motion.button>
                            </>
                          )}
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            title="More options"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                    
                    {/* Expanded Row Details */}
                    <AnimatePresence>
                      {expandedRows.has(email.id) && (
                        <motion.tr
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-gray-50"
                        >
                          <td colSpan={useAuditData ? 7 : 6} className="px-6 py-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Email Details */}
                              <div>
                                <h4 className="font-semibold text-gray-800 mb-3">
                                  {useAuditData ? "Event Details" : "Email Details"}
                                </h4>
                                <div className="space-y-2">
                                  {useAuditData ? (
                                    <>
                                      <div><span className="font-medium">Description:</span> {email.description}</div>
                                      <div><span className="font-medium">Event Type:</span> {email.eventType}</div>
                                      <div><span className="font-medium">Category:</span> {email.category}</div>
                                      {email.subcategory && (
                                        <div><span className="font-medium">Subcategory:</span> {email.subcategory}</div>
                                      )}
                                      {email.requestId && (
                                        <div><span className="font-medium">Request ID:</span> {email.requestId}</div>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <div><span className="font-medium">Content:</span> {email.content?.substring(0, 200)}...</div>
                                      {email.messageId && (
                                        <div><span className="font-medium">Message ID:</span> {email.messageId}</div>
                                      )}
                                      {email.failureReason && (
                                        <div><span className="font-medium">Failure Reason:</span> {email.failureReason}</div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              {/* Metadata/Context */}
                              <div>
                                <h4 className="font-semibold text-gray-800 mb-3">
                                  {useAuditData ? "Context & Metadata" : "Additional Info"}
                                </h4>
                                <div className="space-y-2">
                                  {useAuditData ? (
                                    formatAuditMetadata(email.metadata)
                                  ) : (
                                    <>
                                      {email.job && (
                                        <div><span className="font-medium">Job:</span> {email.job.title}</div>
                                      )}
                                      {email.application && (
                                        <div><span className="font-medium">Application:</span> {email.application.name}</div>
                                      )}
                                      {email.template && (
                                        <div><span className="font-medium">Template:</span> {email.template.name}</div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No emails found</h3>
            <p className="text-gray-500">
              {historySearch || historyStatus || historyJob || historyTemplate
                ? "Try adjusting your filters to see more results."
                : "No emails have been sent yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}