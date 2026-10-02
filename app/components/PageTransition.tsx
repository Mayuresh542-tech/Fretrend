"use client";

import { motion } from "framer-motion";
import { pageVariants, EASE_OUT, DURATION_NORMAL } from "../lib/motion";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps page content with a smooth fade + slide-up entry animation.
 * Use inside any page rendered within StudioShell or the dashboard layout.
 *
 * Respects prefers-reduced-motion via Framer Motion's built-in support.
 */
export default function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={pageVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}
