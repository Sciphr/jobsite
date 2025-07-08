"use client";

import Link from "next/link";
import { useSetting } from "../hooks/useSettings";

export default function JobCard({ job }) {
  const formatSalary = (min, max, currency) => {
    if (!min || !max) return null;
    return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-semibold text-gray-900">{job.title}</h3>
            {job.featured && (
              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                Featured
              </span>
            )}
          </div>
          <p className="text-gray-600 mb-2">{job.department}</p>
          <p className="text-gray-700 mb-4 line-clamp-2">{job.summary}</p>
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
          {job.remotePolicy === "Remote" ? "Yes" : job.remotePolicy}
        </div>
      </div>

      {/* Updated salary display logic - use job.showSalary instead of global setting */}
      {job.showSalary && job.salaryMin && job.salaryMax && (
        <div className="text-sm text-gray-600 mb-4">
          <span className="font-medium">Salary:</span>{" "}
          {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}
        </div>
      )}

      {/* Application deadline warning */}
      {job.applicationDeadline && (
        <div className="text-sm text-orange-600 mb-4 flex items-center gap-1">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="font-medium">Deadline:</span>{" "}
          {new Date(job.applicationDeadline).toLocaleDateString()}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Posted {new Date(job.postedAt).toLocaleDateString()}
        </div>
        <Link
          href={`/jobs/${job.slug}`}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}
