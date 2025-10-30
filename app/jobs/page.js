// app/jobs/page.js
"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import JobsFilter from "../components/JobsFilter";
import AnimatedJobsList from "../components/AnimatedJobsList";
import EmptyState from "../components/EmptyState";
import Pagination from "../admin/jobs/components/ui/Pagination";
import { usePublicJobs, usePrefetchJob } from "../hooks/usePublicJobsData";
import { motion, AnimatePresence } from "framer-motion";

export default function JobsPage() {
  const router = useRouter();
  // Use React Query for jobs data with aggressive caching
  const { data, isLoading, error, isError } = usePublicJobs();
  const prefetchJob = usePrefetchJob();
  
  // Extract data with fallbacks
  const jobs = data?.jobs || [];
  const filterOptions = data?.filterOptions || {
    categories: [],
    locations: [],
    employmentTypes: [],
    experienceLevels: [],
    remotePolicies: [],
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8); // Adjust as needed

  // Sorting state
  const [sortBy, setSortBy] = useState("newest"); // Default: newest first

  // Get search parameters
  const searchParams = useSearchParams();
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const location = searchParams.get("location") || "";
  const employmentType = searchParams.get("employmentType") || "";
  const experienceLevel = searchParams.get("experienceLevel") || "";
  const remotePolicy = searchParams.get("remotePolicy") || "";
  const salaryMin = parseInt(searchParams.get("salaryMin")) || null;
  const salaryMax = parseInt(searchParams.get("salaryMax")) || null;

  // Job prefetching handler for better UX
  const handleJobHover = (job) => {
    if (job.slug) {
      prefetchJob(job.slug);
    }
  };

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
        (job) => job.employment_types?.name === employmentType || job.employmentType === employmentType
      );
    }

    if (experienceLevel) {
      filtered = filtered.filter(
        (job) => job.experience_levels?.name === experienceLevel || job.experienceLevel === experienceLevel
      );
    }

    if (remotePolicy) {
      filtered = filtered.filter((job) => job.remote_policies?.name === remotePolicy || job.remotePolicy === remotePolicy);
    }

    // Salary filtering
    if (salaryMin !== null || salaryMax !== null) {
      filtered = filtered.filter((job) => {
        // Only filter jobs that have salary information
        if (!job.showSalary || !job.salaryMin || !job.salaryMax) {
          return false; // Exclude jobs without salary data
        }

        const jobMinSalary = job.salaryMin;
        const jobMaxSalary = job.salaryMax;

        // Job salary range should overlap with the filter range
        if (salaryMin !== null && jobMaxSalary < salaryMin) {
          return false; // Job's max is below filter's min
        }
        if (salaryMax !== null && jobMinSalary > salaryMax) {
          return false; // Job's min is above filter's max
        }

        return true;
      });
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
    salaryMin,
    salaryMax,
  ]);

  // Client-side sorting
  const sortedJobs = useMemo(() => {
    const sorted = [...filteredJobs];

    switch (sortBy) {
      case "newest":
        return sorted.sort((a, b) => new Date(b.postedAt || b.createdAt) - new Date(a.postedAt || a.createdAt));

      case "oldest":
        return sorted.sort((a, b) => new Date(a.postedAt || a.createdAt) - new Date(b.postedAt || b.createdAt));

      case "salary-high":
        return sorted.sort((a, b) => {
          const aSalary = a.salaryMax || a.salaryMin || 0;
          const bSalary = b.salaryMax || b.salaryMin || 0;
          return bSalary - aSalary;
        });

      case "salary-low":
        return sorted.sort((a, b) => {
          const aSalary = a.salaryMin || a.salaryMax || 0;
          const bSalary = b.salaryMin || b.salaryMax || 0;
          return aSalary - bSalary;
        });

      case "title-az":
        return sorted.sort((a, b) => a.title.localeCompare(b.title));

      case "title-za":
        return sorted.sort((a, b) => b.title.localeCompare(a.title));

      default:
        return sorted;
    }
  }, [filteredJobs, sortBy]);

  // Client-side pagination
  const paginatedJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedJobs.slice(startIndex, endIndex);
  }, [sortedJobs, currentPage, itemsPerPage]);

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
  useMemo(() => {
    setCurrentPage(1);
  }, [
    search,
    category,
    location,
    employmentType,
    experienceLevel,
    remotePolicy,
  ]);

  // Loading state - only show on initial load, not on cache hits
  if (isLoading && jobs.length === 0) {
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

  // Error state
  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="text-red-400 text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Unable to load jobs
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error?.message || "Something went wrong while fetching jobs. Please try again."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-block bg-blue-600 dark:bg-blue-500 text-white px-6 py-3 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors duration-200"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        {/* Page Header */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 transition-colors duration-200">
                Job Opportunities
              </h1>
              <p className="text-gray-600 dark:text-gray-400 transition-colors duration-200">
                {filteredJobs.length} {filteredJobs.length === 1 ? "job" : "jobs"}{" "}
                found
                {search && ` for "${search}"`}
              </p>
            </div>

            {/* Sort Dropdown */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.2 }}
              className="flex items-center gap-2"
            >
              <label
                htmlFor="sort-select"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
              >
                Sort by:
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1); // Reset to first page when sorting changes
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors duration-200"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="title-az">Title (A-Z)</option>
                <option value="title-za">Title (Z-A)</option>
                <option value="salary-high">Salary (High to Low)</option>
                <option value="salary-low">Salary (Low to High)</option>
              </select>
            </motion.div>
          </div>
        </motion.div>

        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Filters Sidebar */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="lg:col-span-1"
          >
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
                salaryMin: salaryMin?.toString() || "",
                salaryMax: salaryMax?.toString() || "",
              }}
            />
          </motion.div>

          {/* Jobs List */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="lg:col-span-3 mt-8 lg:mt-0"
          >
            <AnimatePresence mode="wait">
              {paginatedJobs.length > 0 ? (
                <motion.div
                  key="jobs-list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <AnimatedJobsList jobs={paginatedJobs} onJobHover={handleJobHover} />

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
                </motion.div>
              ) : (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <EmptyState
                    type={search || category || location || employmentType || experienceLevel || remotePolicy ? "filter" : "jobs"}
                    onReset={() => router.push("/jobs")}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
