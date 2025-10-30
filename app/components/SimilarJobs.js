"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, MapPin, DollarSign, TrendingUp } from "lucide-react";

export default function SimilarJobs({ currentJob }) {
  const [similarJobs, setSimilarJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSimilarJobs = async () => {
      if (!currentJob?.id) return;

      setLoading(true);
      try {
        const response = await fetch(`/api/jobs/${currentJob.slug}/similar`);
        if (response.ok) {
          const data = await response.json();
          setSimilarJobs(data.similarJobs || []);
        }
      } catch (error) {
        console.error("Error fetching similar jobs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSimilarJobs();
  }, [currentJob?.id, currentJob?.slug]);

  if (loading) {
    return (
      <div className="mt-12 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (similarJobs.length === 0) {
    return null; // Don't show section if no similar jobs
  }

  return (
    <div className="mt-16 pt-12 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-8">
        <TrendingUp className="h-6 w-6" style={{ color: "var(--site-primary)" }} />
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          Similar Opportunities
        </h2>
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        You might also be interested in these positions
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {similarJobs.map((job) => (
          <Link
            key={job.id}
            href={`/jobs/${job.slug}`}
            className="group bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl dark:hover:shadow-2xl transition-all duration-200 p-6 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-1"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 line-clamp-2">
                  {job.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {job.department}
                </p>
              </div>
              {job.featured && (
                <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full">
                  Featured
                </span>
              )}
            </div>

            <div className="space-y-2 mb-4">
              {/* Location */}
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{job.location}</span>
              </div>

              {/* Employment Type */}
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Briefcase className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">
                  {job.employment_types?.name || job.employmentType}
                </span>
              </div>

              {/* Salary */}
              {job.showSalary && job.salaryMin && job.salaryMax && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
                  <DollarSign className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">
                    {job.salaryCurrency} {job.salaryMin.toLocaleString()} -{" "}
                    {job.salaryMax.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Category Badge */}
            {job.categories?.name && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <span
                  className="inline-block text-xs px-3 py-1 rounded-full text-white"
                  style={{ backgroundColor: "var(--site-primary)" }}
                >
                  {job.categories.name}
                </span>
              </div>
            )}

            {/* View Details Arrow - appears on hover */}
            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:gap-3 transition-all duration-200">
              View Details
              <svg
                className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {/* View All Jobs Link */}
      <div className="mt-8 text-center">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 font-medium"
        >
          Browse All Jobs
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
