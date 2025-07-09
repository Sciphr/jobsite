import { db } from "../lib/db";
import Link from "next/link";
import JobsFilter from "../components/JobsFilter";
import JobsList from "../components/JobsList"; // Import the new component

export default async function JobsPage({ searchParams }) {
  // Fix 1: Await searchParams before accessing properties
  const resolvedSearchParams = await searchParams;

  // Get search parameters
  const search = resolvedSearchParams?.search || "";
  const category = resolvedSearchParams?.category || "";
  const location = resolvedSearchParams?.location || "";
  const employmentType = resolvedSearchParams?.employmentType || "";
  const experienceLevel = resolvedSearchParams?.experienceLevel || "";
  const remotePolicy = resolvedSearchParams?.remotePolicy || "";

  // Build where clause for filtering
  const whereClause = {
    status: "Active",
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { department: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(category && { category: { name: category } }),
    ...(location && { location: { contains: location, mode: "insensitive" } }),
    ...(employmentType && { employmentType: employmentType }),
    ...(experienceLevel && { experienceLevel: experienceLevel }),
    ...(remotePolicy && { remotePolicy: remotePolicy }),
  };

  // Fetch jobs with filters
  const jobs = await db.job.findMany({
    where: whereClause,
    include: {
      category: true,
    },
    orderBy: [{ featured: "desc" }, { priority: "asc" }, { postedAt: "desc" }],
  });

  // Get filter options for dropdowns
  const [
    categories,
    locations,
    employmentTypes,
    experienceLevels,
    remotePolicies,
  ] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" } }),
    db.job.findMany({
      where: { status: "Active" },
      select: { location: true },
      distinct: ["location"],
      orderBy: { location: "asc" },
    }),
    db.job.findMany({
      where: { status: "Active" },
      select: { employmentType: true },
      distinct: ["employmentType"],
      orderBy: { employmentType: "asc" },
    }),
    db.job.findMany({
      where: { status: "Active" },
      select: { experienceLevel: true },
      distinct: ["experienceLevel"],
      orderBy: { experienceLevel: "asc" },
    }),
    db.job.findMany({
      where: { status: "Active" },
      select: { remotePolicy: true },
      distinct: ["remotePolicy"],
      orderBy: { remotePolicy: "asc" },
    }),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 transition-colors duration-200">
            Job Opportunities
          </h1>
          <p className="text-gray-600 dark:text-gray-400 transition-colors duration-200">
            {jobs.length} {jobs.length === 1 ? "job" : "jobs"} found
            {search && ` for "${search}"`}
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <JobsFilter
              categories={categories}
              locations={locations.map((l) => l.location)}
              employmentTypes={employmentTypes.map((e) => e.employmentType)}
              experienceLevels={experienceLevels.map((e) => e.experienceLevel)}
              remotePolicies={remotePolicies.map((r) => r.remotePolicy)}
              currentFilters={{
                search,
                category,
                location,
                employmentType,
                experienceLevel,
                remotePolicy,
              }}
            />
          </div>

          {/* Jobs List */}
          <div className="lg:col-span-3 mt-8 lg:mt-0">
            {jobs.length > 0 ? (
              <JobsList jobs={jobs} />
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">
                  🔍
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 transition-colors duration-200">
                  No jobs found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 transition-colors duration-200">
                  Try adjusting your search criteria or browse all available
                  positions.
                </p>
                <Link
                  href="/jobs"
                  className="inline-block bg-blue-600 dark:bg-blue-500 text-white px-6 py-3 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors duration-200"
                >
                  View All Jobs
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
