// Create a loading.js file in your app/jobs/[slug]/ directory
export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb Skeleton */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center space-x-2 text-sm">
            <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
            <span className="text-gray-400">/</span>
            <div className="h-4 bg-gray-200 rounded w-8 animate-pulse"></div>
            <span className="text-gray-400">/</span>
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
          </nav>
        </div>
      </div>

      {/* Loading Indicator */}
      <div className="flex items-center justify-center py-6">
        <div className="flex items-center space-x-3 text-blue-600">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Loading job details...</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-8">
              {/* Job Header Skeleton */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-9 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  <div className="h-6 bg-gray-200 rounded-full w-20 animate-pulse"></div>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                  <span className="text-gray-400">•</span>
                  <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                  <span className="text-gray-400">•</span>
                  <div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse"></div>
                </div>
                <div className="h-5 bg-gray-200 rounded w-full mb-2 animate-pulse"></div>
                <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse"></div>
              </div>

              {/* Job Details Grid Skeleton */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8 p-6 bg-gray-50 rounded-lg">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i}>
                    <div className="h-4 bg-gray-200 rounded w-20 mb-2 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                  </div>
                ))}
              </div>

              {/* Salary Information Skeleton */}
              <div className="mb-8 p-6 bg-gray-50 rounded-lg border">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-48 mb-1 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
              </div>

              {/* Job Description Skeleton */}
              <div className="mb-8">
                <div className="h-7 bg-gray-200 rounded w-40 mb-4 animate-pulse"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-4/5 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                </div>
              </div>

              {/* Requirements Skeleton */}
              <div className="mb-8">
                <div className="h-7 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                </div>
              </div>

              {/* Preferred Qualifications Skeleton */}
              <div className="mb-8">
                <div className="h-7 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-4/5 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                </div>
              </div>

              {/* Benefits Skeleton */}
              <div className="mb-8">
                <div className="h-7 bg-gray-200 rounded w-20 mb-4 animate-pulse"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Skeleton */}
          <div className="lg:col-span-1 mt-8 lg:mt-0">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              {/* Apply Section */}
              <div className="mb-6">
                <div className="h-6 bg-gray-200 rounded w-40 mb-4 animate-pulse"></div>

                {/* Application Deadline Box */}
                <div className="mb-4 p-3 bg-gray-50 border rounded-md">
                  <div className="h-3 bg-gray-200 rounded w-32 mb-1 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                </div>

                {/* Apply Button */}
                <div className="h-12 bg-gray-200 rounded-md animate-pulse"></div>
              </div>

              {/* Quick Info Section */}
              <div className="border-t pt-6">
                <div className="h-5 bg-gray-200 rounded w-20 mb-3 animate-pulse"></div>
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Share Job Section */}
              <div className="border-t pt-6 mt-6">
                <div className="h-5 bg-gray-200 rounded w-20 mb-3 animate-pulse"></div>
                <div className="flex space-x-2">
                  <div className="flex-1 h-10 bg-gray-200 rounded-md animate-pulse"></div>
                  <div className="flex-1 h-10 bg-gray-200 rounded-md animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Jobs Link Skeleton */}
        <div className="mt-8">
          <div className="h-5 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

// Alternative: Simplified loading component for conditional use
export function JobDetailsLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Centered Loading State */}
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Loading Job Details
          </h3>
          <p className="text-gray-600 text-center max-w-md">
            We're fetching the complete job information for you. This will just
            take a moment.
          </p>
        </div>
      </div>
    </div>
  );
}

// Even more detailed skeleton that includes content variations
export function DetailedJobSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center space-x-2 text-sm">
            <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
            <span className="text-gray-400">/</span>
            <div className="h-4 bg-gray-200 rounded w-8 animate-pulse"></div>
            <span className="text-gray-400">/</span>
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-8">
              {/* Job Header */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-9 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                  <div className="h-6 bg-yellow-100 rounded-full w-20 animate-pulse"></div>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                  <span className="text-gray-400">•</span>
                  <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                  <span className="text-gray-400">•</span>
                  <div className="h-6 bg-blue-100 rounded-full w-16 animate-pulse"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-full animate-pulse"></div>
                  <div className="h-5 bg-gray-200 rounded w-4/5 animate-pulse"></div>
                </div>
              </div>

              {/* Job Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8 p-6 bg-gray-50 rounded-lg">
                {/* Employment Type */}
                <div>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                </div>
                {/* Experience Level */}
                <div>
                  <div className="h-4 bg-gray-200 rounded w-20 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
                </div>
                {/* Years Experience */}
                <div>
                  <div className="h-4 bg-gray-200 rounded w-20 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-8 animate-pulse"></div>
                </div>
                {/* Remote Policy */}
                <div>
                  <div className="h-4 bg-gray-200 rounded w-20 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-14 animate-pulse"></div>
                </div>
                {/* Additional fields */}
                <div>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-18 animate-pulse"></div>
                </div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-16 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                </div>
              </div>

              {/* Salary Information */}
              <div className="mb-8 p-6 bg-green-50 rounded-lg border border-green-200">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-48 mb-1 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
              </div>

              {/* Content Sections */}
              {[
                "Job Description",
                "Requirements",
                "Preferred Qualifications",
                "Benefits",
              ].map((section, index) => (
                <div key={section} className="mb-8">
                  <div className="h-7 bg-gray-200 rounded w-40 mb-4 animate-pulse"></div>
                  <div className="space-y-3">
                    {Array.from({ length: 4 + (index % 3) }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-4 bg-gray-200 rounded animate-pulse ${
                          i === 0
                            ? "w-full"
                            : i === 1
                            ? "w-5/6"
                            : i === 2
                            ? "w-full"
                            : "w-3/4"
                        }`}
                      ></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 mt-8 lg:mt-0">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              {/* Apply Section */}
              <div className="mb-6">
                <div className="h-6 bg-gray-200 rounded w-40 mb-4 animate-pulse"></div>
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                  <div className="h-3 bg-gray-200 rounded w-32 mb-1 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                </div>
                <div className="h-12 bg-blue-200 rounded-md animate-pulse"></div>
              </div>

              {/* Quick Info */}
              <div className="border-t pt-6">
                <div className="h-5 bg-gray-200 rounded w-20 mb-3 animate-pulse"></div>
                <div className="space-y-3">
                  {[
                    "Job Slug",
                    "Department",
                    "Location",
                    "Type",
                    "Deadline",
                  ].map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Share Job */}
              <div className="border-t pt-6 mt-6">
                <div className="h-5 bg-gray-200 rounded w-20 mb-3 animate-pulse"></div>
                <div className="flex space-x-2">
                  <div className="flex-1 h-10 bg-gray-200 rounded-md animate-pulse"></div>
                  <div className="flex-1 h-10 bg-gray-200 rounded-md animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Jobs Link */}
        <div className="mt-8">
          <div className="h-5 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
