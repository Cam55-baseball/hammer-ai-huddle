import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DisciplineRibbonProps {
  disciplineLabel: string;
  measured: number;
  total: number;
  eliteCount?: number;
  nonNegotiableFailed?: number;
}

/**
 * Replaces the old letter-grade slab. Shows discipline + coverage chip +
 * a small encouragement line. NO overall score, NO letter grade — the
 * overall grade lives on The Scorecard, this surface is per-tile-only.
 */
export function FoilGradeCard({
  disciplineLabel,
  measured,
  total,
  eliteCount = 0,
  nonNegotiableFailed = 0,
}: DisciplineRibbonProps) {
  const reduce = useReducedMotion();
  const coveragePct = total > 0 ? Math.round((measured / total) * 100) : 0;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      className={cn(
        "relative overflow-hidden rounded-3xl border p-5",
        "rc-glass-tile",
        nonNegotiableFailed > 0 ? "rc-tile-border-warn" : "rc-tile-border-pass",
      )}
    >
      {/* Holographic foil sweep */}
      <div className="rc-foil pointer-events-none absolute inset-0 rounded-3xl opacity-60 mix-blend-screen" />
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full blur-3xl opacity-50"
        style={{ background: `hsl(var(--grade-a-glow) / 0.35)` }}
      />

      <div className="relative space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
              Report Card
            </div>
            <div className="text-lg font-black leading-tight">{disciplineLabel}</div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <CoverageChip pct={coveragePct} label={`${measured}/${total} measured`} />
            {eliteCount > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wider text-foreground"
                style={{ background: "hsl(var(--grade-a-glow) / 0.25)" }}
              >
                <Sparkles className="h-3 w-3" strokeWidth={2.5} />
                {eliteCount} elite
              </span>
            )}
            {nonNegotiableFailed > 0 && (
              <span className="rc-pulse-fail inline-flex items-center gap-1 rounded-full bg-destructive px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-destructive-foreground">
                <ShieldAlert className="h-3 w-3" strokeWidth={2.75} />
                {nonNegotiableFailed} to fix
              </span>
            )}
          </div>
        </div>

        <p className="text-xs font-semibold leading-snug text-muted-foreground">
          You don't need elite mechanics to compete like an all-time great — chase progress, not
          perfection. Watch the needle move on each meter and you're winning.
        </p>
      </div>
    </motion.div>
  );
}

function CoverageChip({ pct, label }: { pct: number; label: string }) {
  const r = 7;
  const c = 2 * Math.PI * r;
  const dash = c * (pct / 100);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/8 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground/75">
      <svg width={18} height={18} viewBox="0 0 18 18" className="-rotate-90">
        <circle cx={9} cy={9} r={r} fill="none" stroke="hsl(var(--muted-foreground) / 0.25)" strokeWidth={2.5} />
        <circle
          cx={9}
          cy={9}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      {label}
    </span>
  );
}
