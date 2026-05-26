import { RuntimeCard } from "@/components/runtime/RuntimeCard";
import { latestByTopicPrefix, projectLatest } from "@/lib/command/projections";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

type Bucket = "calm" | "watch" | "escalate" | "unknown";

/**
 * Compressed readiness distribution across the roster.
 * Pure projection — never aggregates beyond counts of canonical events.
 */
export function ReadinessDistributionStrip({
  rowsByAthlete,
}: {
  rowsByAthlete: Map<string, AsbEventRow[]>;
}) {
  const dist: Record<Bucket, number> = { calm: 0, watch: 0, escalate: 0, unknown: 0 };
  rowsByAthlete.forEach((rows) => {
    const latest = latestByTopicPrefix(rows, "athlete.readiness");
    const p = projectLatest(latest, { staleAfterHours: 30 });
    const v = p.value as Record<string, unknown> | null;
    if (!latest || !v || p.missingness === "no_signal") {
      dist.unknown += 1;
      return;
    }
    const score = typeof (v as any).score === "number" ? (v as any).score : null;
    if (score == null) dist.unknown += 1;
    else if (score >= 70) dist.calm += 1;
    else if (score >= 50) dist.watch += 1;
    else dist.escalate += 1;
  });
  const total = dist.calm + dist.watch + dist.escalate + dist.unknown || 1;

  return (
    <RuntimeCard eyebrow="Roster" title="Readiness distribution">
      <div className="flex h-3 w-full overflow-hidden rounded-full border border-border">
        <Seg n={dist.calm} total={total} cls="bg-state-calm" />
        <Seg n={dist.watch} total={total} cls="bg-state-watch" />
        <Seg n={dist.escalate} total={total} cls="bg-state-escalate" />
        <Seg n={dist.unknown} total={total} cls="bg-state-unknown" />
      </div>
      <dl className="mt-3 grid grid-cols-4 gap-2 text-xs">
        <Tile label="Calm" value={dist.calm} cls="text-state-calm" />
        <Tile label="Watch" value={dist.watch} cls="text-state-watch" />
        <Tile label="Escalate" value={dist.escalate} cls="text-state-escalate" />
        <Tile label="Unknown" value={dist.unknown} cls="text-state-unknown" />
      </dl>
    </RuntimeCard>
  );
}

function Seg({ n, total, cls }: { n: number; total: number; cls: string }) {
  if (n === 0) return null;
  return <div className={cls} style={{ width: `${(n / total) * 100}%` }} />;
}

function Tile({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={`text-lg font-semibold ${cls}`}>{value}</dd>
    </div>
  );
}
