"use client";

import { motion, AnimatePresence } from "framer-motion";
import JobDetailsClient from "./JobDetailsClient";

// Professional page transition animation
const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.3,
    },
  },
};

// Stagger animation for content sections
const contentVariants = {
  initial: { opacity: 0, y: 20 },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
      staggerChildren: 0.1,
    },
  },
};

// Individual section animation
const sectionVariants = {
  initial: { opacity: 0, y: 15 },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
};

export default function AnimatedJobDetailsClient(props) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      className="min-h-screen"
    >
      <JobDetailsClient {...props} />
    </motion.div>
  );
}

// Export animation variants for use in child components
export { contentVariants, sectionVariants };