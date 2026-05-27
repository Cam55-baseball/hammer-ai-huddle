import { CalendarDays } from "lucide-react";
import { IntelligenceCardShell } from "../IntelligenceCardShell";
import { projectLatest, scheduleByDay, EMPTY_PROJECTION } from "@/lib/command/projections";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

interface Props { rows: AsbEventRow[] | undefined; loading?: boolean }

const DAY_TYPE_LABELS: Record<string, string> = {
  practice: "Practice",
  game: "Game",
  lift: "Lift",
  rest: "Rest",
  travel: "Travel",
  off: "Off day",
  recovery: "Recovery",
  competition: "Competition",
};

function humanize(key: string): string {
  if (DAY_TYPE_LABELS[key]) return DAY_TYPE_LABELS[key];
  const tail = key.includes(".") ? key.split(".").pop()! : key;
  return tail
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SchedulingLoadCard({ rows, loading }: Props) {
  const schedule = scheduleByDay(rows);
  const counts = new Map<string, number>();
  for (const s of schedule) counts.set(s.eventType, (counts.get(s.eventType) ?? 0) + 1);
  const latest = schedule[0]?.row ?? null;
  const p = latest ? projectLatest(latest, { staleAfterHours: 168 }) : EMPTY_PROJECTION;
  const items = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <IntelligenceCardShell
      title="Your week"
      subtitle="How packed your week looks"
      icon={<CalendarDays className="h-4 w-4 text-primary" />}
      projection={p}
      loading={loading}
      emptyMessage="No days scheduled yet"
    >
      {items.length === 0 ? (
        <span className="text-sm text-muted-foreground">—</span>
      ) : (
        <ul className="space-y-1">
          {items.map(([k, v]) => (
            <li key={k} className="flex items-center justify-between text-sm">
              <span>{humanize(k)}</span>
              <span className="tabular-nums">{v}</span>
            </li>
          ))}
        </ul>
      )}
    </IntelligenceCardShell>
  );
}
