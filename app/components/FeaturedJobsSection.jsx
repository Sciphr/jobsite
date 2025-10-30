"use client";

import Link from "next/link";
import { ThemedLink } from "./ThemedButton";
import { cleanHtmlForDisplay } from "../utils/htmlSanitizer";
import { motion } from "framer-motion";

// Container animation for the grid
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

// Individual job card animation
const cardVariants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

export default function FeaturedJobsSection({ featuredJobs, totalJobs }) {
  if (featuredJobs.length === 0 && totalJobs > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="text-center py-12"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4">
            No Featured Jobs Yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            While we don't have any featured positions right now, we have {totalJobs} job{totalJobs !== 1 ? 's' : ''} available for you to explore.
          </p>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 px-6 py-3 text-white font-medium rounded-lg transition-all duration-200 hover:opacity-90"
              style={{ backgroundColor: "var(--site-primary)" }}
            >
              View All Available Jobs
              <motion.svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                whileHover={{ x: 5 }}
                transition={{ duration: 0.2 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </motion.svg>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  if (totalJobs === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="text-center py-12"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4">
            No Jobs Available
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            We don't have any open positions at the moment. Please check back soon!
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      {featuredJobs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 transition-colors duration-200">
            Featured Opportunities
          </h2>
        </motion.div>
      )}

      <motion.div
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {featuredJobs.map((job, index) => (
          <motion.div
            key={job.id}
            variants={cardVariants}
            whileHover={{
              y: -8,
              transition: { duration: 0.2, ease: "easeOut" }
            }}
            className="group"
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md group-hover:shadow-xl dark:group-hover:shadow-2xl transition-shadow duration-300 p-6 border border-gray-200 dark:border-gray-700 flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 transition-colors duration-200">
                    {job.title}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 transition-colors duration-200">
                    {job.department}
                  </p>
                </div>
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.1, type: "spring", stiffness: 200 }}
                  className="text-xs px-2 py-1 rounded-full transition-colors duration-200 text-white"
                  style={{ backgroundColor: "var(--site-primary)" }}
                >
                  {job.categories.name}
                </motion.span>
              </div>

              <div className="flex-1">
                <div
                  className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-3 transition-colors duration-200 prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: cleanHtmlForDisplay(job.summary) }}
                />

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
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-block"
                >
                  <ThemedLink
                    href={`/jobs/${job.slug}`}
                    className="inline-block text-white px-4 py-2 rounded-md transition-all duration-200 group-hover:shadow-lg"
                    variant="primary"
                  >
                    View Details
                  </ThemedLink>
                </motion.div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </>
  );
}