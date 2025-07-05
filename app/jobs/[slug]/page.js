import { db } from "../../lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function JobDetailsPage({ params }) {
  const { slug } = await params;

  // Fetch job by slug
  const job = await db.job.findUnique({
    where: { slug: slug },
    include: {
      category: true,
    },
  });

  if (!job || job.status !== "Active") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-gray-500 hover:text-gray-800">
              Home
            </Link>
            <span className="text-gray-400">/</span>
            <Link href="/jobs" className="text-gray-500 hover:text-gray-700">
              Jobs
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium">{job.title}</span>
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
                  <h1 className="text-3xl font-bold text-gray-900">
                    {job.title}
                  </h1>
                  {job.featured && (
                    <span className="bg-yellow-100 text-yellow-800 text-sm px-3 py-1 rounded-full">
                      Featured
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-gray-600 mb-4">
                  <span className="font-medium">{job.department}</span>
                  <span className="text-gray-400">•</span>
                  <span>{job.location}</span>
                  <span className="text-gray-400">•</span>
                  <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
                    {job.category.name}
                  </span>
                </div>
                <p className="text-gray-700 text-lg leading-relaxed">
                  {job.summary}
                </p>
              </div>

              {/* Job Details */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8 p-6 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Employment Type
                  </h3>
                  <p className="text-gray-600">{job.employmentType}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Experience Level
                  </h3>
                  <p className="text-gray-600">{job.experienceLevel}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Years Experience
                  </h3>
                  <p className="text-gray-600">
                    {job.yearsExperienceRequired || "Not specified"}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Remote Policy
                  </h3>
                  <p className="text-gray-600">{job.remotePolicy}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Education Required
                  </h3>
                  <p className="text-gray-600">
                    {job.educationRequired || "Not specified"}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Posted Date
                  </h3>
                  <p className="text-gray-600">
                    {new Date(job.postedAt).toLocaleDateString()}
                  </p>
                </div>
                {job.startDate && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Start Date
                    </h3>
                    <p className="text-gray-600">
                      {new Date(job.startDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Status</h3>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      job.status === "Active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {job.status}
                  </span>
                </div>
              </div>

              {/* Salary Information */}
              {job.salaryMin && job.salaryMax && (
                <div className="mb-8 p-6 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Salary Range
                  </h3>
                  <p className="text-2xl font-bold text-green-700">
                    {job.salaryCurrency} {job.salaryMin.toLocaleString()} -{" "}
                    {job.salaryMax.toLocaleString()}
                  </p>
                  {job.salaryPeriod && (
                    <p className="text-sm text-gray-600 mt-1">
                      per {job.salaryPeriod}
                    </p>
                  )}
                </div>
              )}

              {/* Job Description */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Job Description
                </h2>
                <div className="prose prose-lg max-w-none text-gray-700">
                  {job.description ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: job.description.replace(/\n/g, "<br />"),
                      }}
                    />
                  ) : (
                    <p>No detailed description available.</p>
                  )}
                </div>
              </div>

              {/* Requirements */}
              {job.requirements && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Requirements
                  </h2>
                  <div className="prose prose-lg max-w-none text-gray-700">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: job.requirements.replace(/\n/g, "<br />"),
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Preferred Qualifications */}
              {job.preferredQualifications && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Preferred Qualifications
                  </h2>
                  <div className="prose prose-lg max-w-none text-gray-700">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: job.preferredQualifications.replace(
                          /\n/g,
                          "<br />"
                        ),
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Benefits */}
              {job.benefits && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Benefits
                  </h2>
                  <div className="prose prose-lg max-w-none text-gray-700">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: job.benefits.replace(/\n/g, "<br />"),
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 mt-8 lg:mt-0">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Apply for this position
                </h3>
                {job.applicationDeadline && (
                  <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                    <p className="text-sm text-orange-800">
                      <span className="font-medium">Application Deadline:</span>
                      <br />
                      {new Date(job.applicationDeadline).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium">
                  Apply Now
                </button>
              </div>

              {/* Job Quick Info */}
              <div className="border-t pt-6">
                <h4 className="font-semibold text-gray-900 mb-3">Quick Info</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Job Slug:</span>
                    <span className="font-medium text-gray-900">
                      {job.slug}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Department:</span>
                    <span className="font-medium text-gray-900">
                      {job.department}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location:</span>
                    <span className="font-medium text-gray-900">
                      {job.location}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium text-gray-900">
                      {job.employmentType}
                    </span>
                  </div>
                  {job.applicationDeadline && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Deadline:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(job.applicationDeadline).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Share Job */}
              <div className="border-t pt-6 mt-6">
                <h4 className="font-semibold text-gray-900 mb-3">Share Job</h4>
                <div className="flex space-x-2">
                  <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-md hover:bg-gray-200 transition-colors text-sm">
                    Copy Link
                  </button>
                  <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-md hover:bg-gray-200 transition-colors text-sm">
                    Email
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Jobs Link */}
        <div className="mt-8">
          <Link
            href="/jobs"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to All Jobs
          </Link>
        </div>
      </div>
    </div>
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }) {
  const { slug } = await params;

  const job = await db.job.findUnique({
    where: { slug: slug },
    select: {
      title: true,
      summary: true,
      department: true,
      location: true,
    },
  });

  if (!job) {
    return {
      title: "Job Not Found",
    };
  }

  return {
    title: `${job.title} - ${job.department} | JobSite`,
    description: job.summary,
    openGraph: {
      title: `${job.title} - ${job.department}`,
      description: job.summary,
      type: "website",
    },
  };
}
