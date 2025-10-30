"use client";

import { Search, Briefcase, Filter, RefreshCw } from "lucide-react";

export default function EmptyState({ type = "jobs", onReset }) {
  const configs = {
    jobs: {
      icon: <Briefcase className="h-16 w-16 text-gray-400 dark:text-gray-500" />,
      title: "No jobs found",
      description: "We couldn't find any jobs matching your search criteria. Try adjusting your filters or search terms.",
      suggestions: [
        "Clear some filters to see more results",
        "Try different keywords",
        "Check your spelling",
        "Browse all available positions",
      ],
    },
    search: {
      icon: <Search className="h-16 w-16 text-gray-400 dark:text-gray-500" />,
      title: "Start your job search",
      description: "Enter keywords or job titles to find your next opportunity.",
      suggestions: [
        "Try searching for 'Software Engineer'",
        "Browse jobs by category",
        "Filter by location or remote work",
      ],
    },
    filter: {
      icon: <Filter className="h-16 w-16 text-gray-400 dark:text-gray-500" />,
      title: "No matching results",
      description: "Your current filters are too specific. Try removing some filters to see more jobs.",
      suggestions: null,
    },
  };

  const config = configs[type] || configs.jobs;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Icon with animated background */}
      <div className="relative mb-8">
        {/* Animated pulse rings */}
        <div className="absolute inset-0 rounded-full bg-gray-200 dark:bg-gray-700 animate-ping opacity-20"></div>
        <div className="absolute inset-0 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse opacity-30"></div>

        {/* Icon container */}
        <div className="relative bg-gray-100 dark:bg-gray-800 rounded-full p-8">
          {config.icon}
        </div>
      </div>

      {/* Text Content */}
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 text-center">
        {config.title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-8">
        {config.description}
      </p>

      {/* Suggestions */}
      {config.suggestions && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 max-w-lg w-full mb-6">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Try these suggestions:
          </h4>
          <ul className="space-y-2">
            {config.suggestions.map((suggestion, index) => (
              <li key={index} className="text-sm text-blue-800 dark:text-blue-300 flex items-start gap-2">
                <span className="text-blue-500 dark:text-blue-400 mt-0.5">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {onReset && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 font-medium shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Clear Filters
          </button>
        )}
        <a
          href="/jobs"
          className="inline-flex items-center gap-2 px-6 py-3 text-white rounded-lg hover:opacity-90 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
          style={{ backgroundColor: "var(--site-primary)" }}
        >
          <Briefcase className="h-4 w-4" />
          Browse All Jobs
        </a>
      </div>

      {/* Decorative illustration */}
      <div className="mt-12 opacity-10">
        <svg className="w-64 h-64" viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
          <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
          <circle cx="100" cy="100" r="40" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
        </svg>
      </div>
    </div>
  );
}
