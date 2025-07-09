"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Check } from "lucide-react";

export default function JobCard({ job, applicationStatus }) {
  const { data: session } = useSession();

  const formatSalary = (min, max, currency) => {
    if (!min || !max) return null;
    return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg dark:hover:shadow-xl transition-all duration-200 p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white transition-colors duration-200">
              {job.title}
            </h3>
            <div className="flex items-center gap-2">
              {job.featured && (
                <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs px-2 py-1 rounded-full transition-colors duration-200">
                  Featured
                </span>
              )}
              {/* Application Status Badge */}
              {session && applicationStatus?.hasApplied && (
                <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs px-2 py-1 rounded-full flex items-center gap-1 transition-colors duration-200">
                  <Check className="h-3 w-3" />
                  Applied
                </span>
              )}
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-2 transition-colors duration-200">
            {job.department}
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-2 transition-colors duration-200">
            {job.summary}
          </p>
        </div>
        <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full ml-4 transition-colors duration-200">
          {job.category.name}
        </span>
      </div>

      {/* Rest of your JobCard JSX with dark mode classes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4 transition-colors duration-200">
        <div>
          <span className="font-medium">Location:</span>
          <br />
          <span className="text-gray-700 dark:text-gray-300">
            {job.location}
          </span>
        </div>
        <div>
          <span className="font-medium">Type:</span>
          <br />
          <span className="text-gray-700 dark:text-gray-300">
            {job.employmentType}
          </span>
        </div>
        <div>
          <span className="font-medium">Experience:</span>
          <br />
          <span className="text-gray-700 dark:text-gray-300">
            {job.experienceLevel}
          </span>
        </div>
        <div>
          <span className="font-medium">Remote:</span>
          <br />
          <span className="text-gray-700 dark:text-gray-300">
            {job.remotePolicy === "Remote" ? "Yes" : job.remotePolicy}
          </span>
        </div>
      </div>

      {job.showSalary && job.salaryMin && job.salaryMax && (
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 transition-colors duration-200">
          <span className="font-medium">Salary:</span>{" "}
          <span className="text-green-600 dark:text-green-400">
            {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}
          </span>
        </div>
      )}

      {job.applicationDeadline && (
        <div className="text-sm text-orange-600 dark:text-orange-400 mb-4 flex items-center gap-1 transition-colors duration-200">
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
        <div className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-200">
          Posted {new Date(job.postedAt).toLocaleDateString()}
          {session && applicationStatus?.hasApplied && (
            <>
              <br />
              <span className="text-green-600 dark:text-green-400 font-medium">
                Applied{" "}
                {new Date(applicationStatus.appliedAt).toLocaleDateString()}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {session && applicationStatus?.hasApplied && (
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
              Status: {applicationStatus.status}
            </span>
          )}
          <Link
            href={`/jobs/${job.slug}`}
            className={`px-4 py-2 rounded-md transition-colors duration-200 ${
              session && applicationStatus?.hasApplied
                ? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                : "bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
            }`}
          >
            {session && applicationStatus?.hasApplied
              ? "View Application"
              : "View Details"}
          </Link>
        </div>
      </div>
    </div>
  );
}
