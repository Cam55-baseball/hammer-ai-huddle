import { CalendarDays } from "lucide-react";
import { IntelligenceCardShell } from "../IntelligenceCardShell";
import { projectLatest, scheduleByDay, EMPTY_PROJECTION } from "@/lib/command/projections";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

interface Props { rows: AsbEventRow[] | undefined; loading?: boolean }

export function SchedulingLoadCard({ rows, loading }: Props) {
  const schedule = scheduleByDay(rows);
  // Group counts by event_type, raw — no weighting.
  const counts = new Map<string, number>();
  for (const s of schedule) counts.set(s.eventType, (counts.get(s.eventType) ?? 0) + 1);
  const latest = schedule[0]?.row ?? null;
  const p = latest ? projectLatest(latest, { staleAfterHours: 168 }) : EMPTY_PROJECTION;
  const items = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <IntelligenceCardShell
      title="Scheduling load"
      subtitle="Raw day_type distribution across recent window"
      icon={<CalendarDays className="h-4 w-4 text-primary" />}
      projection={p}
      loading={loading}
      emptyMessage="No scheduled days yet"
    >
      {items.length === 0 ? (
        <span className="text-sm text-muted-foreground">—</span>
      ) : (
        <ul className="space-y-1">
          {items.map(([k, v]) => (
            <li key={k} className="flex items-center justify-between text-sm">
              <span className="font-mono">{k}</span>
              <span className="font-mono tabular-nums">{v}</span>
            </li>
          ))}
        </ul>
      )}
    </IntelligenceCardShell>
  );
}
