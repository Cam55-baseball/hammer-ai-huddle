import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { useReportCardTrend, type TrendEntry } from "@/hooks/useReportCardTrend";
import { cn } from "@/lib/utils";
import { Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";

const GRADE_VAR: Record<string, { base: string; glow: string }> = {
  A: { base: "--grade-a", glow: "--grade-a-glow" },
  B: { base: "--grade-b", glow: "--grade-b-glow" },
  C: { base: "--grade-c", glow: "--grade-c-glow" },
  D: { base: "--grade-d", glow: "--grade-d-glow" },
  F: { base: "--grade-f", glow: "--grade-f-glow" },
};

interface Props {
  module: string;
  title?: string;
  userIdOverride?: string;
}

/**
 * Last-N analyses as a horizontal foil-grade strip. Replay-safe — every chip
 * is derived from `ai_analysis.metrics`; missing metrics render as a muted
 * "—" chip rather than fabricating a grade.
 */
export function ReportCardTrendStrip({ module, title = "Report card trend", userIdOverride }: Props) {
  const reduce = useReducedMotion();
  const { data = [], isLoading } = useReportCardTrend(module, 8, userIdOverride);

  if (isLoading) {
    return <Card className="h-28 animate-pulse bg-muted/30" />;
  }
  if (data.length === 0) {
    return null;
  }

  const measured = data.filter((d) => d.grade);
  const avgScore =
    measured.length > 0
      ? Math.round(measured.reduce((s, d) => s + (d.grade?.score ?? 0), 0) / measured.length)
      : null;
  const nnPassRate =
    measured.length > 0
      ? Math.round(
          (measured.reduce(
            (s, d) =>
              s +
              ((d.grade!.total === 0
                ? 0
                : 1 - d.grade!.nonNegotiableFailed / Math.max(1, d.grade!.total))),
            0,
          ) /
            measured.length) *
            100,
        )
      : null;

  // Direction: compare first half avg vs second half avg
  const trendDir: "up" | "down" | "flat" = (() => {
    if (measured.length < 2) return "flat";
    const mid = Math.floor(measured.length / 2);
    const recent = measured.slice(0, mid);
    const older = measured.slice(mid);
    const r = recent.reduce((s, d) => s + (d.grade?.score ?? 0), 0) / Math.max(1, recent.length);
    const o = older.reduce((s, d) => s + (d.grade?.score ?? 0), 0) / Math.max(1, older.length);
    if (r - o >= 3) return "up";
    if (o - r >= 3) return "down";
    return "flat";
  })();

  return (
    <Card className="overflow-hidden border-primary/20 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-black uppercase tracking-wider">{title}</h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {avgScore !== null && (
            <span className="font-bold tabular-nums">
              avg <span className="text-base">{avgScore}</span>
            </span>
          )}
          {nnPassRate !== null && (
            <span className="font-bold tabular-nums text-muted-foreground">
              NN {nnPassRate}%
            </span>
          )}
          {trendDir === "up" && <TrendingUp className="h-4 w-4 text-emerald-500" />}
          {trendDir === "down" && <TrendingDown className="h-4 w-4 text-rose-500" />}
          {trendDir === "flat" && <Minus className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      <div className="flex items-end gap-2 overflow-x-auto pb-1">
        {/* Render chronologically left→right (oldest → newest) */}
        {[...data].reverse().map((d, i) => (
          <TrendChip key={d.videoId} entry={d} index={i} reduce={!!reduce} />
        ))}
      </div>
    </Card>
  );
}

function TrendChip({ entry, index, reduce }: { entry: TrendEntry; index: number; reduce: boolean }) {
  const [hover, setHover] = useState(false);
  const letter = entry.grade?.letter ?? "—";
  const tier = GRADE_VAR[letter] ?? null;
  const dateStr = new Date(entry.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * index, duration: 0.3 }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      className="relative flex flex-shrink-0 flex-col items-center gap-1"
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl text-xl font-black text-white shadow-md transition-transform",
          hover && "scale-110",
          !tier && "bg-muted text-muted-foreground",
        )}
        style={
          tier
            ? {
                background: `linear-gradient(160deg, hsl(var(${tier.base})), hsl(var(${tier.glow})))`,
                boxShadow: `0 6px 16px -4px hsl(var(${tier.glow}) / 0.5)`,
              }
            : undefined
        }
        title={
          entry.grade
            ? `${entry.grade.letter} • ${entry.grade.score}/100 • ${dateStr}`
            : `No structured metrics yet • ${dateStr}`
        }
      >
        {letter}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {dateStr}
      </span>
    </motion.div>
  );
}
