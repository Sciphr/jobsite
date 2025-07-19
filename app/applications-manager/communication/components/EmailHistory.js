"use client";

import { motion } from "framer-motion";
import { 
  Download, 
  Loader2, 
  Search, 
  Mail, 
  Eye, 
  Send, 
  MoreHorizontal, 
  ExternalLink 
} from "lucide-react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";

export default function EmailHistory({
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
}) {
  const { getButtonClasses } = useThemeClasses();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Email History</h3>
        <div className="flex items-center space-x-2">
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

      {/* Filters */}
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
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="opened">Opened</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
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
      </div>

      {/* Email Table */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading email history...</span>
          </div>
        ) : emails.length > 0 ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recipient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Engagement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {emails.map((email) => (
                  <motion.tr
                    key={email.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{email.subject}</p>
                        <p className="text-xs text-gray-500">
                          {email.template?.name || "Custom Email"}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {email.recipientName || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-500">{email.recipientEmail}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getEmailStatusColor(email.status)}`}
                      >
                        {email.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
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
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {email.sentAt ? new Date(email.sentAt).toLocaleDateString() : ""}
                      </div>
                      <div className="text-xs text-gray-500">
                        {email.sentAt ? new Date(email.sentAt).toLocaleTimeString() : ""}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                          title="Resend"
                        >
                          <Send className="h-4 w-4" />
                        </motion.button>
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