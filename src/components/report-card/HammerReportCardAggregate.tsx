import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReportCardTrend, type TrendEntry } from "@/hooks/useReportCardTrend";
import { Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LetterGrade } from "@/lib/reportCard/grade";

interface Props {
  module: string;
  windowSize?: number;
  title?: string;
}

const GRADE_ORDER: LetterGrade[] = ["A", "B", "C", "D", "F"];

/**
 * 30-day Hammer Report Card aggregate block.
 *
 * Replay-safe: every value derives from already-stored `ai_analysis.metrics`
 * via {@link useReportCardTrend}. Never authors organism truth — only
 * reduces measured entries into median letter, NN pass rate, longest
 * passing streak, and a tiny sparkline of grade.score.
 *
 * Missing entries (no structured metrics) appear in the "measured/total"
 * chip and are excluded from numeric reductions so we never fabricate a
 * grade.
 */
export function HammerReportCardAggregate({
  module,
  windowSize = 30,
  title = "Report card — last 30 sessions",
}: Props) {
  const { data = [], isLoading } = useReportCardTrend(module, windowSize);
  const stats = useMemo(() => reduce(data), [data]);

  if (isLoading) {
    return <Card className="h-32 animate-pulse bg-muted/30" />;
  }
  if (data.length === 0) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {title}
          </span>
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {stats.measuredCount}/{data.length} measured
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Median grade" value={stats.medianLetter ?? "—"} accent />
          <Stat
            label="Avg score"
            value={stats.avgScore !== null ? String(stats.avgScore) : "—"}
          />
          <Stat
            label="NN pass rate"
            value={stats.nnPassRate !== null ? `${stats.nnPassRate}%` : "—"}
          />
          <Stat
            label="Best streak"
            value={stats.longestPassStreak > 0 ? `${stats.longestPassStreak}` : "—"}
            hint="A/B in a row"
          />
        </div>

        {stats.sparkline.length >= 2 && (
          <div className="flex items-end gap-2">
            <Sparkline values={stats.sparkline} />
            <TrendIcon dir={stats.trendDir} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card/50 p-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 font-black tabular-nums ${
          accent ? "text-2xl text-primary" : "text-xl"
        }`}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const w = 160;
  const h = 32;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const points = values
    .map((v, i) => `${i * step},${h - ((v - min) / span) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} className="text-primary" aria-hidden>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function TrendIcon({ dir }: { dir: "up" | "down" | "flat" }) {
  if (dir === "up") return <TrendingUp className="h-4 w-4 text-emerald-500" />;
  if (dir === "down") return <TrendingDown className="h-4 w-4 text-rose-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function reduce(entries: TrendEntry[]) {
  const measured = entries.filter((e) => !!e.grade);
  const measuredCount = measured.length;

  if (measuredCount === 0) {
    return {
      measuredCount: 0,
      medianLetter: null as LetterGrade | null,
      avgScore: null as number | null,
      nnPassRate: null as number | null,
      longestPassStreak: 0,
      sparkline: [] as number[],
      trendDir: "flat" as "up" | "down" | "flat",
    };
  }

  // Median letter — sort ASCending by quality (A best → F worst), take middle.
  const letters = measured
    .map((m) => m.grade!.letter)
    .sort((a, b) => GRADE_ORDER.indexOf(a) - GRADE_ORDER.indexOf(b));
  const medianLetter = letters[Math.floor(letters.length / 2)];

  const avgScore = Math.round(
    measured.reduce((s, m) => s + m.grade!.score, 0) / measuredCount,
  );

  const nnPassRate = Math.round(
    (measured.reduce(
      (s, m) =>
        s +
        (m.grade!.total === 0
          ? 0
          : 1 - m.grade!.nonNegotiableFailed / Math.max(1, m.grade!.total)),
      0,
    ) /
      measuredCount) *
      100,
  );

  // Longest streak of A/B (chronological — useReportCardTrend returns newest-first).
  const chrono = [...measured].reverse();
  let cur = 0;
  let longestPassStreak = 0;
  for (const m of chrono) {
    if (m.grade!.letter === "A" || m.grade!.letter === "B") {
      cur += 1;
      if (cur > longestPassStreak) longestPassStreak = cur;
    } else {
      cur = 0;
    }
  }

  const sparkline = chrono.map((m) => m.grade!.score);
  const half = Math.floor(sparkline.length / 2) || 1;
  const recent = sparkline.slice(-half);
  const older = sparkline.slice(0, half);
  const r = recent.reduce((s, v) => s + v, 0) / Math.max(1, recent.length);
  const o = older.reduce((s, v) => s + v, 0) / Math.max(1, older.length);
  const trendDir: "up" | "down" | "flat" =
    r - o >= 3 ? "up" : o - r >= 3 ? "down" : "flat";

  return { measuredCount, medianLetter, avgScore, nnPassRate, longestPassStreak, sparkline, trendDir };
}
