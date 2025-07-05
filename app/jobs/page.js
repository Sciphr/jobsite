import { db } from "../lib/db";
import Link from "next/link";
import JobsFilter from "../components/JobsFilter";

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Job Opportunities
          </h1>
          <p className="text-gray-600">
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
              <div className="space-y-6">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">
                            {job.title}
                          </h3>
                          {job.featured && (
                            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                              Featured
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-2">{job.department}</p>
                        <p className="text-gray-700 mb-4 line-clamp-2">
                          {job.summary}
                        </p>
                      </div>
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full ml-4">
                        {job.category.name}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500 mb-4">
                      <div>
                        <span className="font-medium">Location:</span>
                        <br />
                        {job.location}
                      </div>
                      <div>
                        <span className="font-medium">Type:</span>
                        <br />
                        {job.employmentType}
                      </div>
                      <div>
                        <span className="font-medium">Experience:</span>
                        <br />
                        {job.experienceLevel}
                      </div>
                      <div>
                        <span className="font-medium">Remote:</span>
                        <br />
                        {job.remotePolicy}
                      </div>
                    </div>

                    {job.salaryMin && job.salaryMax && (
                      <div className="text-sm text-gray-600 mb-4">
                        <span className="font-medium">Salary:</span>{" "}
                        {job.salaryCurrency} {job.salaryMin.toLocaleString()} -{" "}
                        {job.salaryMax.toLocaleString()}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Posted {new Date(job.postedAt).toLocaleDateString()}
                      </div>
                      {/* Use job.slug for the URL to match existing [slug].js route */}
                      <Link
                        href={`/jobs/${job.slug}`}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No jobs found
                </h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your search criteria or browse all available
                  positions.
                </p>
                <Link
                  href="/jobs"
                  className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
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
