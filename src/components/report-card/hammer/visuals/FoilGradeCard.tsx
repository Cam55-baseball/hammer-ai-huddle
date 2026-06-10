import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ShieldAlert, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GradeResult } from "@/lib/reportCard/grade";

const TIER: Record<GradeResult["letter"], { base: string; glow: string; label: string }> = {
  A: { base: "--grade-a", glow: "--grade-a-glow", label: "ELITE" },
  B: { base: "--grade-b", glow: "--grade-b-glow", label: "ADVANCED" },
  C: { base: "--grade-c", glow: "--grade-c-glow", label: "DEVELOPING" },
  D: { base: "--grade-d", glow: "--grade-d-glow", label: "FOUNDATIONAL" },
  F: { base: "--grade-f", glow: "--grade-f-glow", label: "REBUILD" },
};

interface Props {
  grade: GradeResult;
  disciplineLabel: string;
}

/**
 * Hero grade card — holographic foil, parallax tilt on pointer,
 * count-up score, coverage chip, non-negotiable warning pulse.
 */
export function FoilGradeCard({ grade, disciplineLabel }: Props) {
  const reduce = useReducedMotion();
  const tier = TIER[grade.letter];
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [displayScore, setDisplayScore] = useState(reduce ? grade.score : 0);

  // Count-up animation for the score
  useEffect(() => {
    if (reduce) {
      setDisplayScore(grade.score);
      return;
    }
    const start = performance.now();
    const duration = 950;
    const from = 0;
    const to = grade.score;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setDisplayScore(Math.round(from + (to - from) * ease(t)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [grade.score, reduce]);

  const onMove = (e: React.PointerEvent) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -py * 6, y: px * 8 });
  };
  const onLeave = () => setTilt({ x: 0, y: 0 });

  const coveragePct = grade.total > 0 ? Math.round((grade.measured / grade.total) * 100) : 0;

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      style={
        {
          // CSS-var binding so .rc-foil shimmer uses the tier hue
          ["--grade-base" as string]: `var(${tier.base})`,
          ["--grade-glow" as string]: `var(${tier.glow})`,
          transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: tilt.x === 0 && tilt.y === 0 ? "transform 0.4s ease-out" : "none",
        } as React.CSSProperties
      }
      className={cn(
        "relative overflow-hidden rounded-3xl border p-5",
        "rc-glass-tile",
        grade.nonNegotiableFailed > 0 ? "rc-tile-border-fail" : "rc-tile-border-pass",
      )}
    >
      {/* Holographic foil sweep */}
      <div className="rc-foil pointer-events-none absolute inset-0 rounded-3xl opacity-70 mix-blend-screen" />
      {/* Top glow halo */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full blur-3xl opacity-60"
        style={{ background: `hsl(var(${tier.glow}) / 0.55)` }}
      />

      <div className="relative flex items-stretch gap-4">
        {/* Grade letter slab */}
        <div
          className={cn(
            "rc-grade-pop flex flex-shrink-0 flex-col items-center justify-center rounded-2xl px-5",
            "min-w-[100px]",
          )}
          style={{
            background: `linear-gradient(160deg, hsl(var(${tier.base})), hsl(var(${tier.glow})))`,
            boxShadow: `0 16px 40px -10px hsl(var(${tier.glow}) / 0.55), inset 0 1px 0 hsl(0 0% 100% / 0.25)`,
          }}
        >
          <span className="text-[88px] font-black leading-none text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
            {grade.letter}
          </span>
          <span className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/85">
            {tier.label}
          </span>
        </div>

        {/* Right side — score + chips */}
        <div className="flex flex-1 flex-col justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black leading-none tabular-nums">
              {displayScore}
            </span>
            <span className="text-sm font-bold text-muted-foreground">/ 100</span>
            {grade.letter === "A" && (
              <Sparkles
                className="ml-1 h-5 w-5"
                style={{ color: `hsl(var(${tier.glow}))` }}
                strokeWidth={2.5}
              />
            )}
          </div>

          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {disciplineLabel}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <CoverageChip pct={coveragePct} label={`${grade.measured}/${grade.total} measured`} />
            {grade.nonNegotiableFailed > 0 && (
              <span className="rc-pulse-fail inline-flex items-center gap-1 rounded-full bg-destructive px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-destructive-foreground">
                <ShieldAlert className="h-3 w-3" strokeWidth={2.75} />
                {grade.nonNegotiableFailed} NN failed
              </span>
            )}
          </div>
        </div>
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
