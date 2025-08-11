import { db } from "./lib/db";
import Link from "next/link";
import { ThemedLink } from "./components/ThemedButton";

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
      {/* Hero Section */}
      <section
        className="text-white transition-colors duration-200 site-primary"
        style={{ backgroundColor: "var(--site-primary)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4">Find Your Dream Job</h2>
            <p className="text-xl mb-8 text-white/80">
              Discover opportunities that match your skills and passion
            </p>
            <div className="flex justify-center">
              <Link
                href="/jobs"
                className="bg-white px-8 py-3 rounded-md font-semibold hover:bg-gray-100 transition-colors duration-200 site-primary-text"
              >
                Browse {totalJobs} Jobs
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Jobs Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-200">
            Featured Jobs
          </h3>
          <p className="text-gray-600 dark:text-gray-400 transition-colors duration-200">
            Hand-picked opportunities from top companies
          </p>
        </div>

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
                <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-3 transition-colors duration-200">
                  {job.summary}
                </p>

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

        {featuredJobs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 transition-colors duration-200">
              No featured jobs available at the moment.
            </p>
          </div>
        )}

        <div className="text-center mt-12">
          <Link
            href="/jobs"
            className="inline-block bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-6 py-3 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
          >
            View All Jobs
          </Link>
        </div>
      </section>
    </div>
  );
}
