import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { IntelligenceCardShell } from "../IntelligenceCardShell";
import { projectLatest, EMPTY_PROJECTION } from "@/lib/command/projections";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

interface Props { rows: AsbEventRow[] | undefined; loading?: boolean }

const FAMILIES: Array<[string, string]> = [
  ["Readiness", "behavioral.readiness"],
  ["Fatigue", "behavioral.fatigue"],
  ["Recovery", "behavioral.recovery"],
];

function findTwoLatest(rows: AsbEventRow[] | undefined, prefix: string): [AsbEventRow | null, AsbEventRow | null] {
  if (!rows?.length) return [null, null];
  let a: AsbEventRow | null = null;
  let b: AsbEventRow | null = null;
  for (const r of rows) {
    if (r.topic_id !== prefix && !r.topic_id.startsWith(prefix + ".")) continue;
    if (!a) a = r;
    else if (!b) { b = r; break; }
  }
  return [a, b];
}

function extractScore(ev: AsbEventRow | null): number | null {
  if (!ev) return null;
  const p: any = ev.payload ?? {};
  const v = p.score ?? p.value ?? p.state?.score ?? p.value?.score;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function TrendShiftsCard({ rows, loading }: Props) {
  const trends = FAMILIES.map(([label, prefix]) => {
    const [latest, prior] = findTwoLatest(rows, prefix);
    const lv = extractScore(latest);
    const pv = extractScore(prior);
    const delta = lv != null && pv != null ? lv - pv : null;
    return { label, prefix, latest, delta };
  });

  const newest = trends.map((t) => t.latest).filter(Boolean)[0] ?? null;
  const p = newest ? projectLatest(newest) : EMPTY_PROJECTION;

  return (
    <IntelligenceCardShell
      title="Trends"
      subtitle="What's changing week over week"
      icon={<TrendingUp className="h-4 w-4 text-primary" />}
      projection={p}
      loading={loading}
      emptyMessage="Not enough events to compute a shift"
    >
      <ul className="space-y-1.5">
        {trends.map((t) => {
          const Icon = t.delta == null ? Minus : t.delta > 0 ? TrendingUp : t.delta < 0 ? TrendingDown : Minus;
          return (
            <li key={t.prefix} className="flex items-center justify-between text-sm">
              <span>{t.label}</span>
              <span className="flex items-center gap-1 tabular-nums">
                <Icon className="h-3 w-3" />
                {t.delta == null ? "—" : (t.delta > 0 ? "+" : "") + t.delta.toFixed(2)}
              </span>
            </li>
          );
        })}
      </ul>
    </IntelligenceCardShell>
  );
}
