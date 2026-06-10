import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface PhaseNode {
  key: string;
  label: string;
  /** 0..1 — pass rate */
  passRate: number;
  count: number;
}

interface Props {
  phases: PhaseNode[];
  activePhase: string | null;
  onSelect: (phase: string | null) => void;
}

/**
 * Glowing phase orbs connected by an animated rail. Colors per pass rate.
 * Tap an orb to filter the tiles below.
 */
export function PhaseRail({ phases, activePhase, onSelect }: Props) {
  const reduce = useReducedMotion();
  return (
    <div className="relative">
      {/* Rail */}
      <div className="absolute left-4 right-4 top-5 h-[3px] rounded-full bg-foreground/8 overflow-hidden">
        <motion.div
          initial={reduce ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
          style={{ originX: 0 }}
          className="h-full w-full bg-gradient-to-r from-[hsl(var(--meter-fail))] via-[hsl(var(--meter-warn))] to-[hsl(var(--meter-pass))] opacity-60"
        />
      </div>

      <div className="relative flex items-start justify-between gap-2">
        {phases.map((p, i) => {
          const tier =
            p.passRate >= 0.85 ? "pass" : p.passRate >= 0.5 ? "warn" : "fail";
          const color =
            tier === "pass"
              ? "hsl(var(--meter-pass))"
              : tier === "warn"
                ? "hsl(var(--meter-warn))"
                : "hsl(var(--meter-fail))";
          const isActive = activePhase === p.key;
          const isDim = activePhase !== null && !isActive;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onSelect(isActive ? null : p.key)}
              className={cn(
                "group flex flex-1 flex-col items-center gap-1 transition-opacity",
                isDim && "opacity-40",
              )}
            >
              <motion.span
                initial={reduce ? false : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: 0.35 + i * 0.08,
                  type: "spring",
                  stiffness: 220,
                  damping: 14,
                }}
                className={cn(
                  "rc-orb-glow inline-flex h-10 w-10 items-center justify-center rounded-full font-black text-white",
                  "ring-2 ring-background",
                )}
                style={{
                  backgroundColor: color,
                  color: color,
                }}
              >
                <span className="text-white text-xs">{p.count}</span>
              </motion.span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/75 text-center leading-tight">
                {p.label}
              </span>
              <span className="text-[10px] font-bold tabular-nums" style={{ color }}>
                {Math.round(p.passRate * 100)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
