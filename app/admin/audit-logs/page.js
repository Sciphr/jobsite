"use client";

import { useState, useEffect } from 'react';
import { useThemeClasses } from '../../contexts/AdminThemeContext';
import { 
  FileSearch, 
  Filter, 
  Download, 
  Calendar,
  User,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Search,
  RefreshCw,
  X,
  ExternalLink
} from 'lucide-react';

export default function AuditLogsPage() {
  const { getThemeClasses, getButtonClasses } = useThemeClasses();
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    eventType: '',
    severity: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });
      
      const response = await fetch(`/api/admin/audit-logs?${queryParams}`);
      const data = await response.json();
      
      if (data.success) {
        setAuditLogs(data.data);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [currentPage, filters]);

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'error':
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityBadge = (severity) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (severity) {
      case 'critical':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100`;
      case 'error':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100`;
      case 'warning':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100`;
      case 'info':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100`;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const openDetailsModal = (log) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setSelectedLog(null);
    setShowDetailsModal(false);
  };

  const exportLogs = async () => {
    try {
      const queryParams = new URLSearchParams({
        export: 'true',
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });
      
      const response = await fetch(`/api/admin/audit-logs?${queryParams}`);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Audit Logs
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Monitor and track all system activities and user actions
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Filter className="h-4 w-4 mr-2" />
            <span>Filters</span>
          </button>
          <button
            onClick={exportLogs}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <Download className="h-4 w-4 mr-2" />
            <span>Export</span>
          </button>
          <button
            onClick={loadAuditLogs}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  placeholder="Search logs..."
                  className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Categories</option>
                <option value="USER">User</option>
                <option value="JOB">Job</option>
                <option value="APPLICATION">Application</option>
                <option value="EMAIL">Email</option>
                <option value="AUTH">Authentication</option>
                <option value="SYSTEM">System</option>
                <option value="API">API</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Event Type
              </label>
              <select
                value={filters.eventType}
                onChange={(e) => setFilters({...filters, eventType: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Events</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
                <option value="VIEW">View</option>
                <option value="SEND">Send</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Severity
              </label>
              <select
                value={filters.severity}
                onChange={(e) => setFilters({...filters, severity: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Severities</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{formatDate(log.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {log.category}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400">
                            {log.eventType}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {log.actorName || 'System'}
                            </div>
                            <div className="text-gray-500 dark:text-gray-400">
                              {log.actorType}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        <div className="max-w-xs truncate">
                          {log.action}
                        </div>
                        {log.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate">
                            {log.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          {getSeverityIcon(log.severity)}
                          <span className={getSeverityBadge(log.severity)}>
                            {log.severity}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button 
                          onClick={() => openDetailsModal(log)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Page <span className="font-medium">{currentPage}</span> of{' '}
                        <span className="font-medium">{totalPages}</span>
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-l-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-r-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedLog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Audit Log Details
              </h3>
              <button
                onClick={closeDetailsModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Event Type
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedLog.eventType}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedLog.category}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Severity
                  </label>
                  <div className="mt-1">
                    <span className={getSeverityBadge(selectedLog.severity)}>
                      {selectedLog.severity}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedLog.status}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Timestamp
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(selectedLog.createdAt)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Actor
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {selectedLog.actorName || 'System'} ({selectedLog.actorType})
                  </p>
                </div>
              </div>

              {/* Action & Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Action
                </label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedLog.action}</p>
              </div>

              {selectedLog.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedLog.description}</p>
                </div>
              )}

              {/* Entity Information */}
              {(selectedLog.entityType || selectedLog.entityName) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Entity
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {selectedLog.entityName} {selectedLog.entityType && `(${selectedLog.entityType})`}
                  </p>
                  {selectedLog.entityId && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">ID: {selectedLog.entityId}</p>
                  )}
                </div>
              )}

              {/* Changes */}
              {selectedLog.changes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Changes
                  </label>
                  <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <pre className="text-xs text-gray-900 dark:text-white overflow-auto">
                      {JSON.stringify(selectedLog.changes, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Old Values */}
              {selectedLog.oldValues && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Previous Values
                  </label>
                  <div className="mt-1 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                    <pre className="text-xs text-gray-900 dark:text-white overflow-auto">
                      {JSON.stringify(selectedLog.oldValues, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* New Values */}
              {selectedLog.newValues && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    New Values
                  </label>
                  <div className="mt-1 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                    <pre className="text-xs text-gray-900 dark:text-white overflow-auto">
                      {JSON.stringify(selectedLog.newValues, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Technical Details */}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Technical Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {selectedLog.ipAddress && (
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">IP Address:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{selectedLog.ipAddress}</span>
                    </div>
                  )}
                  {selectedLog.userAgent && (
                    <div className="md:col-span-2">
                      <span className="font-medium text-gray-700 dark:text-gray-300">User Agent:</span>
                      <span className="ml-2 text-gray-900 dark:text-white break-all">{selectedLog.userAgent}</span>
                    </div>
                  )}
                  {selectedLog.sessionId && (
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Session ID:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-mono">{selectedLog.sessionId}</span>
                    </div>
                  )}
                  {selectedLog.requestId && (
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Request ID:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-mono">{selectedLog.requestId}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags */}
              {selectedLog.tags && selectedLog.tags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedLog.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              {selectedLog.metadata && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Metadata
                  </label>
                  <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <pre className="text-xs text-gray-900 dark:text-white overflow-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Related Entities */}
              {(selectedLog.relatedUser || selectedLog.relatedJob || selectedLog.relatedApplication) && (
                <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Related Entities</h4>
                  <div className="space-y-2 text-sm">
                    {selectedLog.relatedUser && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">User:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">
                          {selectedLog.relatedUser.name} ({selectedLog.relatedUser.email})
                        </span>
                      </div>
                    )}
                    {selectedLog.relatedJob && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Job:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">
                          {selectedLog.relatedJob.title} - {selectedLog.relatedJob.department}
                        </span>
                      </div>
                    )}
                    {selectedLog.relatedApplication && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Application:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">
                          {selectedLog.relatedApplication.name} ({selectedLog.relatedApplication.email}) - {selectedLog.relatedApplication.status}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={closeDetailsModal}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}