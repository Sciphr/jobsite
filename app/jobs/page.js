// app/jobs/page.js
"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import JobsFilter from "../components/JobsFilter";
import JobsList from "../components/JobsList";
import Pagination from "../admin/jobs/components/ui/Pagination";

export default function JobsPage() {
  // State for jobs data and loading
  const [jobs, setJobs] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    categories: [],
    locations: [],
    employmentTypes: [],
    experienceLevels: [],
    remotePolicies: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8); // Adjust as needed

  // Get search parameters
  const searchParams = useSearchParams();
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const location = searchParams.get("location") || "";
  const employmentType = searchParams.get("employmentType") || "";
  const experienceLevel = searchParams.get("experienceLevel") || "";
  const remotePolicy = searchParams.get("remotePolicy") || "";

  // Fetch jobs data
  useEffect(() => {
    const fetchJobsData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/jobs");
        if (response.ok) {
          const data = await response.json();
          setJobs(data.jobs);
          setFilterOptions(data.filterOptions);
        }
      } catch (error) {
        console.error("Error fetching jobs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobsData();
  }, []);

  // Client-side filtering
  const filteredJobs = useMemo(() => {
    let filtered = jobs;

    if (search) {
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(search.toLowerCase()) ||
          job.description.toLowerCase().includes(search.toLowerCase()) ||
          job.department.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (category) {
      filtered = filtered.filter((job) => job.categories?.name === category);
    }

    if (location) {
      filtered = filtered.filter((job) =>
        job.location.toLowerCase().includes(location.toLowerCase())
      );
    }

    if (employmentType) {
      filtered = filtered.filter(
        (job) => job.employmentType === employmentType
      );
    }

    if (experienceLevel) {
      filtered = filtered.filter(
        (job) => job.experienceLevel === experienceLevel
      );
    }

    if (remotePolicy) {
      filtered = filtered.filter((job) => job.remotePolicy === remotePolicy);
    }

    return filtered;
  }, [
    jobs,
    search,
    category,
    location,
    employmentType,
    experienceLevel,
    remotePolicy,
  ]);

  // Client-side pagination
  const paginatedJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredJobs.slice(startIndex, endIndex);
  }, [filteredJobs, currentPage, itemsPerPage]);

  // Pagination metadata
  const pagination = useMemo(() => {
    const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
    return {
      totalPages,
      totalItems: filteredJobs.length,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1,
    };
  }, [filteredJobs.length, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    category,
    location,
    employmentType,
    experienceLevel,
    remotePolicy,
  ]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6 mb-8"></div>
            <div className="lg:grid lg:grid-cols-4 lg:gap-8">
              <div className="lg:col-span-1">
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
              <div className="lg:col-span-3">
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-32 bg-gray-200 dark:bg-gray-700 rounded"
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 transition-colors duration-200">
            Job Opportunities
          </h1>
          <p className="text-gray-600 dark:text-gray-400 transition-colors duration-200">
            {filteredJobs.length} {filteredJobs.length === 1 ? "job" : "jobs"}{" "}
            found
            {search && ` for "${search}"`}
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <JobsFilter
              categories={filterOptions.categories}
              locations={filterOptions.locations}
              employmentTypes={filterOptions.employmentTypes}
              experienceLevels={filterOptions.experienceLevels}
              remotePolicies={filterOptions.remotePolicies}
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
            {paginatedJobs.length > 0 ? (
              <>
                <JobsList jobs={paginatedJobs} />

                {/* Pagination */}
                {filteredJobs.length > itemsPerPage && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={pagination.totalPages}
                    totalItems={filteredJobs.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    className="mt-8"
                  />
                )}
              </>
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
