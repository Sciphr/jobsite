"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

// Professional, smooth page transitions - subtle but elegant
const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1], // Smooth cubic bezier
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

// Faster variant for job cards and list items
const itemVariants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: 0.15,
    },
  },
};

// Stagger children animation for lists
const containerVariants = {
  initial: {},
  enter: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

export function PageTransition({ children, className = "" }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        variants={pageVariants}
        initial="initial"
        animate="enter"
        exit="exit"
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function ItemTransition({ children, index = 0, className = "" }) {
  return (
    <motion.div
      variants={itemVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={{
        delay: index * 0.05,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function ListContainer({ children, className = "" }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Hover animation for job cards
export function JobCardWrapper({ children, className = "", onHoverStart, onHoverEnd }) {
  return (
    <motion.div
      className={className}
      whileHover={{
        y: -4,
        transition: {
          duration: 0.2,
          ease: "easeOut",
        },
      }}
      whileTap={{
        scale: 0.98,
      }}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
    >
      {children}
    </motion.div>
  );
}

// Smooth scale animation for buttons
export function ButtonTransition({ children, className = "", onClick, ...props }) {
  return (
    <motion.button
      className={className}
      onClick={onClick}
      whileHover={{
        scale: 1.02,
        transition: {
          duration: 0.15,
        },
      }}
      whileTap={{
        scale: 0.98,
      }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

// Fade in animation for sections
export function FadeInSection({ children, delay = 0, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}