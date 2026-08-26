import { ReactNode } from "react";
import { motion } from "framer-motion";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

interface Props {
  /** Canonical section order — drives the stagger delay, so gaps are fine. */
  order: number;
  children: ReactNode;
  className?: string;
}

/**
 * One beat of the results reveal. Sections cascade in order so the screen
 * feels composed rather than dumped — score first, then findings, then the
 * prescription. Honors prefers-reduced-motion by rendering statically.
 */
export function RevealSection({ order, children, className }: Props) {
  if (prefersReducedMotion()) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 * order, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
