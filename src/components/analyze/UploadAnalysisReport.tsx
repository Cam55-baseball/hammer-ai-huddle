import { motion, useReducedMotion } from "framer-motion";

/** Encouragement on the empty upload screen; not a measured Report Card. */
export function UploadAnalysisReport() {
  const reduce = useReducedMotion();

  return (
    <motion.section
      aria-label="Analysis Report"
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      className="rc-glass-tile rc-tile-border-pass relative w-full overflow-hidden rounded-2xl border p-5 text-left"
    >
      <div aria-hidden="true" className="rc-foil pointer-events-none absolute inset-0 opacity-60 mix-blend-screen" />
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative space-y-3">
        <h4 className="text-lg font-black leading-tight text-foreground">Analysis Report</h4>
        <p className="text-xs font-semibold leading-snug text-muted-foreground">You don't need elite mechanics to compete like an all-time great! Chase progress &amp; fall in love with the process, not perfection. Watch the needle move on each category and you're winning.</p>
      </div>
    </motion.section>
  );
}