"use client";

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

// Audit logs fetcher function
const fetchAuditLogs = async (filters, page = 1, limit = 200) => {
  console.log(`🔄 Fetching audit logs: page ${page}, limit ${limit}`, filters);
  
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
  });
  
  const response = await fetch(`/api/admin/audit-logs?${queryParams}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch audit logs: ${response.status}`);
  }
  
  return response.json();
};

export default function AuditLogsPage() {
  const { getThemeClasses, getButtonClasses } = useThemeClasses();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    category: '',
    eventType: '',
    severity: '',
    dateFrom: '',
    dateTo: '',
    search: '',
    ipAddress: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  
  // Column configuration
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('auditlog-columns');
    return saved ? JSON.parse(saved) : {
      timestamp: true,
      event: true,
      actor: true,
      action: true,
      severity: true,
      ipAddress: false,
      details: true
    };
  });

  // Create cache key based on filters
  const cacheKey = useMemo(() => 
    ['audit-logs', JSON.stringify(filters)], 
    [filters]
  );

  // React Query for audit logs with smart caching
  const {
    data: auditData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: cacheKey,
    queryFn: () => fetchAuditLogs(filters, 1, 500), // Fetch larger chunks (500 items)
    staleTime: 2 * 60 * 1000, // 2 minutes - audit logs change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes in cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: true, // Always enabled
  });

  // Memoized data processing for client-side pagination
  const { paginatedLogs, totalPages, totalCount } = useMemo(() => {
    if (!auditData?.success || !auditData?.data) {
      return { paginatedLogs: [], totalPages: 1, totalCount: 0 };
    }

    const allLogs = auditData.data;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    return {
      paginatedLogs: allLogs.slice(startIndex, endIndex),
      totalPages: Math.ceil(allLogs.length / itemsPerPage),
      totalCount: allLogs.length
    };
  }, [auditData, currentPage, itemsPerPage]);

  // Prefetch next batch when approaching the end of current data
  useEffect(() => {
    if (auditData?.success && auditData?.data?.length > 0) {
      const currentDataSize = auditData.data.length;
      const maxPageWithCurrentData = Math.ceil(currentDataSize / itemsPerPage);
      
      // If we're getting close to the end of our cached data, prefetch more
      if (currentPage >= maxPageWithCurrentData - 2 && currentDataSize >= 500) {
        const nextPage = Math.ceil(currentDataSize / 500) + 1;
        queryClient.prefetchQuery({
          queryKey: ['audit-logs-batch', JSON.stringify(filters), nextPage],
          queryFn: () => fetchAuditLogs(filters, nextPage, 500),
          staleTime: 2 * 60 * 1000,
        });
      }
    }
  }, [currentPage, auditData, filters, itemsPerPage, queryClient]);

  // Pagination component
  const PaginationComponent = ({ position = "bottom" }) => {
    // Always show pagination if we have data (even if only 1 page) to show page size selector and record count
    if (totalCount === 0) return null;

    const getPageNumbers = () => {
      const delta = 2; // Number of pages to show on each side
      const range = [];
      const rangeWithDots = [];

      // Calculate range of pages to show
      let start = Math.max(1, currentPage - delta);
      let end = Math.min(totalPages, currentPage + delta);

      // Adjust range if we're near the beginning or end
      if (currentPage <= delta + 1) {
        end = Math.min(totalPages, delta * 2 + 3);
      }
      if (currentPage >= totalPages - delta) {
        start = Math.max(1, totalPages - delta * 2 - 2);
      }

      // Build the range
      for (let i = start; i <= end; i++) {
        range.push(i);
      }

      // Add first page and dots if needed
      if (start > 1) {
        rangeWithDots.push(1);
        if (start > 2) {
          rangeWithDots.push('...');
        }
      }

      // Add main range
      rangeWithDots.push(...range);

      // Add last page and dots if needed
      if (end < totalPages) {
        if (end < totalPages - 1) {
          rangeWithDots.push('...');
        }
        rangeWithDots.push(totalPages);
      }

      return rangeWithDots;
    };

    const pageNumbers = getPageNumbers();

    return (
      <div className={`bg-white dark:bg-gray-800 px-4 py-3 border-gray-200 dark:border-gray-700 sm:px-6 ${
        position === "top" ? "border-b rounded-t-lg" : "border-t rounded-b-lg"
      } min-h-[56px]`}>
        <div className="flex items-center justify-between">
          {/* Mobile pagination */}
          <div className="flex-1 flex justify-between sm:hidden">
            {totalPages > 1 ? (
              <>
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </button>
                <span className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </>
            ) : (
              <div className="flex items-center justify-center w-full min-h-[40px]">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Showing all {totalCount} records
                </span>
              </div>
            )}
          </div>

          {/* Desktop pagination */}
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {totalPages > 1 ? (
                  <>
                    Showing page <span className="font-medium">{currentPage}</span> of{' '}
                    <span className="font-medium">{totalPages}</span>
                    {totalCount > 0 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        ({totalCount} total records loaded)
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    Showing all <span className="font-medium">{totalCount}</span> records
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      (all records loaded)
                    </span>
                  </>
                )}
              </p>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-700 dark:text-gray-300">Show:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1); // Reset to first page when changing page size
                  }}
                  className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
                <span className="text-sm text-gray-700 dark:text-gray-300">per page</span>
              </div>
            </div>
            <div>
              {totalPages > 1 ? (
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                {/* First page button */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="First page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>

                {/* Previous page button */}
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {/* Page numbers */}
                {pageNumbers.map((pageNum, index) => {
                  if (pageNum === '...') {
                    return (
                      <span
                        key={`dots-${index}`}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        ...
                      </span>
                    );
                  }

                  const isCurrentPage = pageNum === currentPage;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        isCurrentPage
                          ? 'z-10 bg-blue-50 dark:bg-blue-900 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-200'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {/* Next page button */}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                {/* Last page button */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Last page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
                </nav>
              ) : (
                /* Maintain layout spacing when no navigation needed */
                <div className="flex items-center justify-end min-h-[40px]">
                  <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                    All records on one page
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Reset to first page when items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showColumnSettings && !event.target.closest('.relative')) {
        setShowColumnSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnSettings]);

  // Save column preferences to localStorage
  const toggleColumn = (columnKey) => {
    const newColumns = { ...visibleColumns, [columnKey]: !visibleColumns[columnKey] };
    setVisibleColumns(newColumns);
    localStorage.setItem('auditlog-columns', JSON.stringify(newColumns));
  };

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
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleString();
    } catch (error) {
      console.error('Date formatting error:', error, 'for dateString:', dateString);
      return 'Invalid Date';
    }
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
        limit: '1000', // Export more records for export
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
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Audit Logs
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">
            Monitor and track all system activities and user actions
          </p>
        </div>
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Filter className="h-4 w-4 mr-2" />
            <span>Filters</span>
          </button>
          <div className="relative">
            <button
              onClick={() => setShowColumnSettings(!showColumnSettings)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Eye className="h-4 w-4 mr-2" />
              <span>Columns</span>
            </button>
            
            {/* Column Settings Dropdown */}
            {showColumnSettings && (
              <div className="absolute right-0 mt-2 w-64 sm:w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10 max-w-[90vw]">
                <div className="p-3">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Show/Hide Columns</h3>
                  <div className="space-y-2">
                    {Object.entries({
                      timestamp: 'Timestamp',
                      event: 'Event',
                      actor: 'Actor',
                      action: 'Action',
                      severity: 'Severity',
                      ipAddress: 'IP Address',
                      details: 'Details'
                    }).map(([key, label]) => (
                      <label key={key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={visibleColumns[key]}
                          onChange={() => toggleColumn(key)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={exportLogs}
              className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                IP Address
              </label>
              <input
                type="text"
                value={filters.ipAddress}
                onChange={(e) => setFilters({...filters, ipAddress: e.target.value})}
                placeholder="192.168.1.1"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Top Pagination */}
        <PaginationComponent position="top" />
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-red-600 dark:text-red-400">
            <div className="text-center">
              <p className="mb-2">Failed to load audit logs</p>
              <button 
                onClick={() => refetch()}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {visibleColumns.timestamp && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Timestamp
                      </th>
                    )}
                    {visibleColumns.event && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Event
                      </th>
                    )}
                    {visibleColumns.actor && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actor
                      </th>
                    )}
                    {visibleColumns.action && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Action
                      </th>
                    )}
                    {visibleColumns.severity && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Severity
                      </th>
                    )}
                    {visibleColumns.ipAddress && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        IP Address
                      </th>
                    )}
                    {visibleColumns.details && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Details
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-12 text-center">
                        <div className="text-gray-500 dark:text-gray-400">
                          <FileSearch className="mx-auto h-12 w-12 mb-4 opacity-50" />
                          <p className="text-lg font-medium mb-2">No audit logs found</p>
                          <p className="text-sm">
                            {Object.values(filters).some(v => v) 
                              ? 'Try adjusting your filters to see more results.' 
                              : 'No audit logs have been recorded yet.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      {visibleColumns.timestamp && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>{formatDate(log.createdAt)}</span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.event && (
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
                      )}
                      {visibleColumns.actor && (
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
                      )}
                      {visibleColumns.action && (
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
                      )}
                      {visibleColumns.severity && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center space-x-2">
                            {getSeverityIcon(log.severity)}
                            <span className={getSeverityBadge(log.severity)}>
                              {log.severity}
                            </span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.ipAddress && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <span>{log.ipAddress || '-'}</span>
                        </td>
                      )}
                      {visibleColumns.details && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button 
                            onClick={() => openDetailsModal(log)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Pagination */}
            <PaginationComponent position="bottom" />
          </>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedLog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-4 sm:top-20 mx-auto p-4 sm:p-5 border w-full sm:w-11/12 md:w-3/4 lg:w-1/2 max-w-4xl shadow-lg rounded-none sm:rounded-md bg-white dark:bg-gray-800 min-h-screen sm:min-h-0">
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

            <div className="space-y-4 max-h-96 sm:max-h-96 overflow-y-auto">
              {/* Basic Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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