import { db } from "./lib/db";
import Link from "next/link";
import { ThemedLink } from "./components/ThemedButton";
import { cleanHtmlForDisplay } from "./utils/htmlSanitizer";

// Disable static generation for this page since it needs database access
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Fetch featured jobs from database
  const featuredJobs = await db.jobs.findMany({
    where: {
      status: "Active",
      featured: true,
    },
    include: {
      categories: true,
    },
    orderBy: {
      priority: "asc",
    },
    take: 6,
  });

  // Get total job count
  const totalJobs = await db.jobs.count({
    where: {
      status: "Active",
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Jobs Section - now the primary focus */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {/* Header with job count and navigation */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-200">
              Open Positions
            </h1>
            <p className="text-gray-600 dark:text-gray-400 transition-colors duration-200">
              {totalJobs > 0 ? `${totalJobs} active job${totalJobs !== 1 ? 's' : ''} available` : 'No jobs available at the moment'}
            </p>
          </div>
          <div className="mt-6 lg:mt-0">
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 px-6 py-3 text-white font-medium rounded-lg transition-all duration-200 hover:opacity-90"
              style={{ backgroundColor: "var(--site-primary)" }}
            >
              Browse All Jobs
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>

        {featuredJobs.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 transition-colors duration-200">
              Featured Opportunities
            </h2>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featuredJobs.map((job) => (
            <div
              key={job.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg dark:hover:shadow-xl transition-all duration-200 p-6 border border-gray-200 dark:border-gray-700 flex flex-col h-full"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 transition-colors duration-200">
                    {job.title}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 transition-colors duration-200">
                    {job.department}
                  </p>
                </div>
                <span
                  className="text-xs px-2 py-1 rounded-full transition-colors duration-200 text-white"
                  style={{ backgroundColor: "var(--site-primary)" }}
                >
                  {job.categories.name}
                </span>
              </div>

              <div className="flex-1">
                <div
                  className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-3 transition-colors duration-200 prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: cleanHtmlForDisplay(job.summary) }}
                />

                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4 transition-colors duration-200">
                  <span>{job.location}</span>
                  <span>{job.employmentType}</span>
                </div>

                {job.salaryMin && job.salaryMax && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 transition-colors duration-200">
                    {job.salaryCurrency} {job.salaryMin.toLocaleString()} -{" "}
                    {job.salaryMax.toLocaleString()}
                  </div>
                )}
              </div>

              <div className="mt-auto">
                <ThemedLink
                  href={`/jobs/${job.slug}`}
                  className="inline-block text-white px-4 py-2 rounded-md transition-colors duration-200"
                  variant="primary"
                >
                  View Details
                </ThemedLink>
              </div>
            </div>
          ))}
        </div>

        {featuredJobs.length === 0 && totalJobs > 0 && (
          <div className="text-center py-12">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4">
                No Featured Jobs Yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                While we don't have any featured positions right now, we have {totalJobs} job{totalJobs !== 1 ? 's' : ''} available for you to explore.
              </p>
              <Link
                href="/jobs"
                className="inline-flex items-center gap-2 px-6 py-3 text-white font-medium rounded-lg transition-all duration-200 hover:opacity-90"
                style={{ backgroundColor: "var(--site-primary)" }}
              >
                View All Available Jobs
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        )}

        {totalJobs === 0 && (
          <div className="text-center py-12">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4">
                No Jobs Available
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                We don't have any open positions at the moment. Please check back soon!
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
