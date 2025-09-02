// Smart Search Component with highlighting and quick filters
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Filter, Loader2 } from "lucide-react";

// Utility function to highlight search terms
export function highlightText(text, searchTerm) {
  if (!text || !searchTerm) return text;
  
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => 
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
        {part}
      </mark>
    ) : part
  );
}

// Smart Search Component
export default function SmartSearch({
  searchTerm,
  onSearchChange,
  placeholder = "Search...",
  quickFilters = [],
  activeFilters = {},
  onFilterChange,
  isSearching = false,
  showResultCount = false,
  resultCount = 0,
  className = "",
  layout = "vertical" // "vertical" or "horizontal"
}) {
  const [showFilters, setShowFilters] = useState(false);
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    return Object.values(activeFilters).filter(value => 
      value !== 'all' && value !== '' && value !== false
    ).length;
  }, [activeFilters]);

  if (layout === "horizontal") {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        {/* Search Input */}
        <div className="relative flex-shrink-0 w-80">
          {isSearching ? (
            <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-500 animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
          )}
          
          <input
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 admin-text admin-card transition-all duration-200"
          />
          
          {/* Clear Search */}
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <X className="h-3 w-3 text-gray-400" />
            </button>
          )}
        </div>

        {/* Horizontal Quick Filters */}
        {quickFilters.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {quickFilters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => onFilterChange(filter.key, filter.value, filter.filterKey)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex-shrink-0 ${
                  activeFilters[filter.filterKey || filter.key] === filter.value
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {filter.label}
              </button>
            ))}
            
            {/* Clear All Filters */}
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  quickFilters.forEach(filter => {
                    onFilterChange(filter.key, 'all', filter.filterKey);
                  });
                }}
                className="text-xs text-blue-600 hover:text-blue-800 transition-colors flex-shrink-0"
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {/* Search Results Count - Fixed position on right */}
        {showResultCount && (
          <div className="flex-shrink-0 ml-auto text-sm admin-text-light">
            <span>
              {resultCount} result{resultCount !== 1 ? 's' : ''}
              {(searchTerm || activeFilterCount > 0) && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full text-xs">
                  Filtered
                </span>
              )}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Original vertical layout
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search Input */}
      <div className="relative">
        {isSearching ? (
          <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-500 animate-spin" />
        ) : (
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
        )}
        
        <input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 admin-text admin-card transition-all duration-200"
        />
        
        {/* Clear Search */}
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-10 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X className="h-3 w-3 text-gray-400" />
          </button>
        )}
        
        {/* Filter Toggle */}
        {quickFilters.length > 0 && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded transition-colors ${
              activeFilterCount > 0 ? 'text-blue-500' : 'text-gray-400'
            } hover:bg-gray-200 dark:hover:bg-gray-700`}
          >
            <Filter className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Quick Filters */}
      <AnimatePresence>
        {showFilters && quickFilters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 p-3 admin-card rounded-lg border border-gray-200 dark:border-gray-600"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium admin-text">Quick Filters</h4>
              <button
                onClick={() => setShowFilters(false)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              >
                <X className="h-3 w-3 text-gray-400" />
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {quickFilters.map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => onFilterChange(filter.key, filter.value, filter.filterKey)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    activeFilters[filter.filterKey || filter.key] === filter.value
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            
            {/* Clear All Filters */}
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  quickFilters.forEach(filter => {
                    onFilterChange(filter.key, 'all');
                  });
                }}
                className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Results Count */}
      {showResultCount && (
        <div className="flex items-center justify-between text-sm admin-text-light">
          <span>
            {resultCount} result{resultCount !== 1 ? 's' : ''}
            {(searchTerm || activeFilterCount > 0) && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full text-xs">
                Filtered
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}