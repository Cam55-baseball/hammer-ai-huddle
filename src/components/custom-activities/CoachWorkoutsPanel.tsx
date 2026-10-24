/**
 * CoachWorkoutsPanel — the player's home for coach-sent workouts inside
 * My Custom Activities (owner request Oct 24, run 6). Two shelves:
 *   - "From my coaches": every unanswered send — any-day cards, today's and
 *     future scheduled days — each with its schedule and a "Use today" /
 *     "Add alongside today" activation that goes through the same server
 *     safety check as a same-day choice, same category only.
 *   - "Saved for later": cards the player shelved, activatable any day.
 * Interpretive UI — it never authors training by itself.
 */
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Loader2, CalendarDays, Bookmark } from "lucide-react";
import { useMyCoachWorkouts, type CoachPrescription, type CoachRxChoice } from "@/hooks/useCoachPrescriptions";
import { scheduleSummary, type ScheduleInput } from "@/lib/coachRx/schedule";

const CATEGORY_LABEL: Record<string, string> = {
  hitting: "hitting", pitching: "pitching", throwing: "throwing", fielding: "fielding",
  baserunning: "baserunning", lift: "lifting", speed: "speed", conditioning: "conditioning",
  warmup: "warm-up", mobility: "mobility", recovery: "recovery", vision: "vision/timing",
};

function rxSchedule(rx: CoachPrescription): string {
  return scheduleSummary({
    type: rx.schedule_type ?? "date",
    startDate: rx.plan_date,
    weekdays: rx.recur_weekdays ?? undefined,
    everyWeeks: rx.recur_every_weeks ?? undefined,
    monthlyOrdinal: rx.recur_monthly_ordinal ?? undefined,
    monthlyWeekday: rx.recur_monthly_weekday ?? undefined,
    endDate: rx.recur_end ?? undefined,
    count: rx.recur_count ?? undefined,
  } as ScheduleInput);
}

function dayLabel(rx: CoachPrescription, today: string): string {
  if (rx.schedule_type === "any_day") return "Any day — you pick when";
  if (rx.plan_date === today) return "Today";
  return new Date(`${rx.plan_date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function CoachWorkoutsPanel() {
  const { fromCoaches, savedForLater, isLoading, today, activate, activating } = useMyCoachWorkouts();
  const [blocked, setBlocked] = useState<Record<string, { reasons: string[]; safeOption: string | null }>>({});

  if (isLoading) return null;

  const pick = async (rx: CoachPrescription, choice: CoachRxChoice) => {
    const r = await activate(rx.id, choice);
    if (!r.applied && r.reasons?.length) {
      setBlocked((b) => ({ ...b, [rx.id]: { reasons: r.reasons ?? [], safeOption: r.safeOption ?? null } }));
    } else {
      setBlocked((b) => { const n = { ...b }; delete n[rx.id]; return n; });
    }
  };

  const renderCard = (rx: CoachPrescription) => {
    const label = CATEGORY_LABEL[rx.category] ?? rx.category;
    const b = blocked[rx.id];
    return (
      <div key={rx.id} className="space-y-2 rounded-lg border border-border p-3" data-coach-workout={rx.id}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{rx.title}</p>
          <Badge variant="secondary" className="text-xs capitalize">{label}</Badge>
        </div>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays className="h-3 w-3" />
          {dayLabel(rx, today)} · {rxSchedule(rx)}
        </p>
        {Array.isArray(rx.exercises) && rx.exercises.length > 0 && (
          <ul className="list-inside list-disc text-xs text-muted-foreground">
            {rx.exercises.slice(0, 4).map((e, i) => (
              <li key={i}>{String((e as any).name ?? "Exercise")}</li>
            ))}
            {rx.exercises.length > 4 && <li>+{rx.exercises.length - 4} more</li>}
          </ul>
        )}
        {b && (
          <div className="rounded-md bg-muted/50 p-2 text-xs" role="alert">
            {b.reasons.map((r, i) => <p key={i}>{r}</p>)}
            {b.safeOption && <p className="mt-1 font-medium">{b.safeOption}</p>}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={activating} data-use-today onClick={() => void pick(rx, "use_instead")}>
            {activating && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Use today instead of my {label} card
          </Button>
          <Button size="sm" variant="outline" disabled={activating} onClick={() => void pick(rx, "add_alongside")}>
            Add alongside today
          </Button>
          {rx.status === "pending" && (
            <Button size="sm" variant="ghost" disabled={activating} onClick={() => void pick(rx, "save_for_later")}>
              Save for later
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" data-coach-workouts-panel>
      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="flex items-center gap-2 text-sm font-bold">
            <ClipboardList className="h-4 w-4" />
            From my coaches
          </p>
          {fromCoaches.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing waiting from your coaches right now.</p>
          ) : (
            fromCoaches.map(renderCard)
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="flex items-center gap-2 text-sm font-bold">
            <Bookmark className="h-4 w-4" />
            Saved for later
          </p>
          {savedForLater.length === 0 ? (
            <p className="text-xs text-muted-foreground">Cards you save for later show up here.</p>
          ) : (
            savedForLater.map(renderCard)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
