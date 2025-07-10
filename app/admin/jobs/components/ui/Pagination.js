// app/components/ui/Pagination.js
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  className = "",
  showInfo = true,
  maxVisiblePages = 5,
}) {
  if (totalPages <= 1) return null;

  // Calculate visible page numbers
  const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  const pages = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );

  // Calculate showing info
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* Showing info */}
      {showInfo && (
        <div className="text-sm admin-text-light">
          Showing {startItem} to {endItem} of {totalItems} items
        </div>
      )}

      {/* Pagination controls */}
      <div className="flex items-center space-x-2">
        {/* Previous button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={`p-2 rounded-lg transition-colors duration-200 ${
            currentPage > 1
              ? "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              : "text-gray-300 cursor-not-allowed dark:text-gray-600"
          }`}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* First page if not visible */}
        {startPage > 1 && (
          <>
            <button
              onClick={() => onPageChange(1)}
              className="px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              1
            </button>
            {startPage > 2 && <span className="px-2 text-gray-400">...</span>}
          </>
        )}

        {/* Page numbers */}
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 ${
              currentPage === page
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            }`}
            aria-label={`Page ${page}`}
            aria-current={currentPage === page ? "page" : undefined}
          >
            {page}
          </button>
        ))}

        {/* Last page if not visible */}
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && (
              <span className="px-2 text-gray-400">...</span>
            )}
            <button
              onClick={() => onPageChange(totalPages)}
              className="px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              {totalPages}
            </button>
          </>
        )}

        {/* Next button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={`p-2 rounded-lg transition-colors duration-200 ${
            currentPage < totalPages
              ? "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              : "text-gray-300 cursor-not-allowed dark:text-gray-600"
          }`}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
