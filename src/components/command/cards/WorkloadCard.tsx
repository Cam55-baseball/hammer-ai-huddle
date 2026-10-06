import { Dumbbell } from "lucide-react";
import { IntelligenceCardShell } from "../IntelligenceCardShell";
import { projectLatest, windowCount, EMPTY_PROJECTION } from "@/lib/command/projections";
import { useScheduleWindow } from "@/hooks/command/useScheduleWindow";
import { usePitcherSchedule } from "@/hooks/usePitcherSchedule";
import { resolveOutingFacts } from "../../../../supabase/functions/_shared/wic/pitching/outingFacts";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

interface Props { rows: AsbEventRow[] | undefined; loading?: boolean }

export function WorkloadCard({ rows, loading }: Props) {
  const { count, latest } = windowCount(rows, "athlete.schedule.day_type", 7);
  const p = latest ? projectLatest(latest, { staleAfterHours: 168 }) : EMPTY_PROJECTION;
  const sched = useScheduleWindow();
  const pitching = usePitcherSchedule();
  const confirmedOutings = (pitching.data?.outings ?? []).filter((o) =>
    o.status === "thrown" && o.actual_date && o.actual_date <= pitching.today &&
    o.actual_date >= new Date(new Date(`${pitching.today}T12:00:00Z`).getTime() - 6 * 86400000).toISOString().slice(0, 10));
  const upcomingStarts = pitching.data ? resolveOutingFacts({ planDate: pitching.today, ...pitching.data }).plannedStartDates
    .filter((date) => date >= pitching.today && date <= new Date(new Date(`${pitching.today}T12:00:00Z`).getTime() + 6 * 86400000).toISOString().slice(0, 10)) : [];
  const availability = (pitching.data?.availability ?? []).filter((a) => a.available);
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
        {pitching.isError ? <p className="text-xs text-amber-600 dark:text-amber-400">Couldn't read your pitching days. Your saved schedule hasn't been cleared.</p>
          : (confirmedOutings.length > 0 || upcomingStarts.length > 0 || availability.length > 0) && (
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Pitching load comes from recorded days, not an assumed pitch count.</p>
              {confirmedOutings.length > 0 && <p>Confirmed outings this week: {confirmedOutings.map((o) => `${o.actual_date} (${o.outing_type})`).join(", ")}</p>}
              {upcomingStarts.length > 0 && <p>Start days reserved this week: {upcomingStarts.join(", ")}. Keep extra work light around these days.</p>}
              {availability.length > 0 && <p>Available to pitch: {availability.map((a) => a.date).join(", ")}. Availability isn't a thrown outing.</p>}
            </div>
          )}
      </div>
    </IntelligenceCardShell>
  );
}
