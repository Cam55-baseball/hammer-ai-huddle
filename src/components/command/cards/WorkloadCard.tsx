import { Dumbbell } from "lucide-react";
import { IntelligenceCardShell } from "../IntelligenceCardShell";
import { projectLatest, windowCount, EMPTY_PROJECTION } from "@/lib/command/projections";
import { useScheduleWindow } from "@/hooks/command/useScheduleWindow";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

interface Props { rows: AsbEventRow[] | undefined; loading?: boolean }

export function WorkloadCard({ rows, loading }: Props) {
  const { count, latest } = windowCount(rows, "athlete.schedule.day_type", 7);
  const p = latest ? projectLatest(latest, { staleAfterHours: 168 }) : EMPTY_PROJECTION;
  const sched = useScheduleWindow();
  const hasUpcoming = !sched.unknown && (sched.totalGames > 0 || sched.totalPractices > 0);

  return (
    <IntelligenceCardShell
      title="Stress Load"
      subtitle="How much load you've been carrying (last 7 days)"
      icon={<Dumbbell className="h-4 w-4 text-primary" />}
      projection={p}
      loading={loading}
      emptyMessage="No scheduled days yet"
      action={{ label: "See today's strength block", href: "/command#hammer-plan-strength" }}
    >
      <div className="space-y-2">
        <div className="flex items-end gap-3">
          <span className="text-3xl font-semibold tabular-nums">{count}</span>
          <span className="pb-1 text-xs text-muted-foreground">training days this week</span>
        </div>
        {hasUpcoming && (
          <p className="text-xs text-muted-foreground">
            Next 7 days:{" "}
            <span className="font-medium text-foreground tabular-nums">{sched.totalGames}</span> game
            {sched.totalGames === 1 ? "" : "s"} ·{" "}
            <span className="font-medium text-foreground tabular-nums">{sched.totalPractices}</span> practice
            {sched.totalPractices === 1 ? "" : "s"}
            {sched.upcomingCompetition && sched.upcomingCompetition.daysUntil <= 2 && (
              <>
                {" · "}
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  competition in {sched.upcomingCompetition.daysUntil}d
                </span>
              </>
            )}
          </p>
        )}
        {!hasUpcoming && !sched.unknown && !sched.loading && (
          <p className="text-xs text-muted-foreground">
            Next 7 days: no scheduled games or practices.
          </p>
        )}
      </div>
    </IntelligenceCardShell>
  );
}
