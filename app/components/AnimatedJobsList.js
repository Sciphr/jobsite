"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import JobCard from "./JobCard";
import { motion, AnimatePresence } from "framer-motion";

// Container animation for staggered children
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

// Individual job card animation
const itemVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: 0.2,
    },
  },
};

export default function AnimatedJobsList({ jobs, onJobHover }) {
  const { data: session } = useSession();
  const [applicationStatuses, setApplicationStatuses] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user?.id && jobs.length > 0) {
      checkApplicationStatuses();
    }
  }, [session, jobs]);

  const checkApplicationStatuses = async () => {
    if (!session?.user?.id || jobs.length === 0) return;

    setLoading(true);
    try {
      const jobIds = jobs.map((job) => job.id);

      const response = await fetch("/api/applications/check-multiple", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobIds }),
      });

      if (response.ok) {
        const data = await response.json();
        setApplicationStatuses(data);
      }
    } catch (error) {
      console.error("Error checking application statuses:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <AnimatePresence mode="popLayout">
        {jobs.map((job) => {
          const appStatus = applicationStatuses[job.id];

          return (
            <motion.div
              key={job.id}
              variants={itemVariants}
              layout
              whileHover={{
                y: -4,
                transition: {
                  duration: 0.2,
                  ease: "easeOut",
                },
              }}
              onMouseEnter={onJobHover ? () => onJobHover(job) : undefined}
            >
              <JobCard job={job} applicationStatus={appStatus} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}