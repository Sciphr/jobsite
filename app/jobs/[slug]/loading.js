export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Breadcrumb Skeleton */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center space-x-2 text-sm">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12 animate-pulse"></div>
            <span className="text-gray-400 dark:text-gray-500">/</span>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8 animate-pulse"></div>
            <span className="text-gray-400 dark:text-gray-500">/</span>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
          </nav>
        </div>
      </div>

      {/* Loading Indicator */}
      <div className="flex items-center justify-center py-6">
        <div className="flex items-center space-x-3 text-blue-600 dark:text-blue-400">
          <div className="w-5 h-5 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Loading job details...</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border dark:border-gray-700">
              {/* Job Header Skeleton */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20 animate-pulse"></div>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                  <span className="text-gray-400 dark:text-gray-500">•</span>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
                  <span className="text-gray-400 dark:text-gray-500">•</span>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16 animate-pulse"></div>
                </div>
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2 animate-pulse"></div>
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
              </div>

              {/* Job Details Grid Skeleton */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8 p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i}>
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-20 mb-2 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-16 animate-pulse"></div>
                  </div>
                ))}
              </div>

              {/* Salary Information Skeleton */}
              <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-24 mb-2 animate-pulse"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-48 mb-1 animate-pulse"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-16 animate-pulse"></div>
              </div>

              {/* Job Description Skeleton */}
              <div className="mb-8">
                <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-4 animate-pulse"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
                </div>
              </div>

              {/* Requirements Skeleton */}
              <div className="mb-8">
                <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4 animate-pulse"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
                </div>
              </div>

              {/* Preferred Qualifications Skeleton */}
              <div className="mb-8">
                <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4 animate-pulse"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse"></div>
                </div>
              </div>

              {/* Benefits Skeleton */}
              <div className="mb-8">
                <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-4 animate-pulse"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Skeleton */}
          <div className="lg:col-span-1 mt-8 lg:mt-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sticky top-8 border dark:border-gray-700">
              {/* Apply Section */}
              <div className="mb-6">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-4 animate-pulse"></div>

                {/* Application Deadline Box */}
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 border dark:border-gray-600 rounded-md">
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-32 mb-1 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-20 animate-pulse"></div>
                </div>

                {/* Apply Button */}
                <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"></div>
              </div>

              {/* Quick Info Section */}
              <div className="border-t dark:border-gray-600 pt-6">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-3 animate-pulse"></div>
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Share Job Section */}
              <div className="border-t dark:border-gray-600 pt-6 mt-6">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-3 animate-pulse"></div>
                <div className="flex space-x-2">
                  <div className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"></div>
                  <div className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Jobs Link Skeleton */}
        <div className="mt-8">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
