import { db } from "./lib/db";
import Link from "next/link";

export default async function HomePage() {
  // Fetch featured jobs from database
  const featuredJobs = await db.job.findMany({
    where: {
      status: "Active",
      featured: true,
    },
    include: {
      category: true,
    },
    orderBy: {
      priority: "asc",
    },
    take: 6,
  });

  // Get total job count
  const totalJobs = await db.job.count({
    where: {
      status: "Active",
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4">Find Your Dream Job</h2>
            <p className="text-xl mb-8 text-blue-100">
              Discover opportunities that match your skills and passion
            </p>
            <div className="flex justify-center">
              <Link
                href="/jobs"
                className="bg-white text-blue-600 px-8 py-3 rounded-md font-semibold hover:bg-blue-50 transition-colors"
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
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Featured Jobs
          </h3>
          <p className="text-gray-600">
            Hand-picked opportunities from top companies
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featuredJobs.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">
                    {job.title}
                  </h4>
                  <p className="text-gray-600">{job.department}</p>
                </div>
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {job.category.name}
                </span>
              </div>

              <p className="text-gray-700 mb-4 line-clamp-3">{job.summary}</p>

              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>{job.location}</span>
                <span>{job.employmentType}</span>
              </div>

              {job.salaryMin && job.salaryMax && (
                <div className="text-sm text-gray-600 mb-4">
                  {job.salaryCurrency} {job.salaryMin.toLocaleString()} -{" "}
                  {job.salaryMax.toLocaleString()}
                </div>
              )}

              <Link
                href={`/jobs/${job.slug}`}
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                View Details
              </Link>
            </div>
          ))}
        </div>

        {featuredJobs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              No featured jobs available at the moment.
            </p>
          </div>
        )}

        <div className="text-center mt-12">
          <Link
            href="/jobs"
            className="inline-block bg-gray-200 text-gray-800 px-6 py-3 rounded-md hover:bg-gray-300 transition-colors"
          >
            View All Jobs
          </Link>
        </div>
      </section>
    </div>
  );
}
