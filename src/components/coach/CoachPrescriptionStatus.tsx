/**
 * CoachPrescriptionStatus — the coach's (and org admin's) "Sent workouts"
 * view (owner request Oct 24, run 6): each prescription with its schedule,
 * each player's response (used instead / added / saved / declined / not
 * yet), completion of the plan rows it created, and edit / cancel / resend
 * for future unanswered dates. Read-only presentation plus server-checked
 * manage actions; it never authors training.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Loader2, CalendarDays } from "lucide-react";
import { useManageSentWorkouts } from "@/hooks/useCoachPrescriptions";
import { scheduleSummary, type ScheduleInput } from "@/lib/coachRx/schedule";
import { actualResultText, type WorkoutActual } from "@/lib/coachRx/results";

const STATUS_LABEL: Record<string, string> = {
  pending: "Not yet answered",
  used_instead: "Used instead of their card",
  added_alongside: "Added alongside",
  saved_for_later: "Saved for later",
  declined: "Declined",
};

export function CoachPrescriptionStatus() {
  const { rows, isLoading, error, reschedule, cancel, cancelSeries, resend, acting } = useManageSentWorkouts();
  const [editDate, setEditDate] = useState<Record<string, string>>({});
  const today = new Date().toLocaleDateString("en-CA");

  if (isLoading) return <p role="status" className="text-sm text-muted-foreground">Loading sent workouts…</p>;
  if (error) return <p role="alert" className="text-sm text-destructive">Couldn't load sent workouts. Try again.</p>;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No sent workouts yet.</p>;
  const perform = async (action: Promise<unknown>) => { try { await action; } catch { /* Mutation reports the error. */ } };

  const fmtDay = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <Card data-coach-rx-status>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="h-5 w-5" />
          Sent workouts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((rx) => {
          const future = rx.status === "pending" && !rx.cancelled_at && rx.plan_date >= today;
          const sched = scheduleSummary({
            type: rx.schedule_type ?? "date",
            startDate: rx.plan_date,
            weekdays: rx.schedule?.recur_weekdays ?? undefined,
            everyWeeks: rx.schedule?.recur_every_weeks ?? undefined,
            monthlyOrdinal: rx.schedule?.recur_monthly_ordinal ?? undefined,
            monthlyWeekday: rx.schedule?.recur_monthly_weekday ?? undefined,
            endDate: rx.schedule?.recur_end ?? undefined,
            count: rx.schedule?.recur_count ?? undefined,
          } as ScheduleInput);
          return (
            <div key={rx.id} className="space-y-1.5 rounded-md border border-border px-3 py-2 text-sm" data-sent-rx={rx.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words font-medium">{rx.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {rx.recipient_name} · {rx.category} · {fmtDay(rx.plan_date)}
                    {rx.cancelled_at && " · cancelled"}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    {sched}
                  </p>
                </div>
                <Badge variant={rx.status === "used_instead" ? "default" : "secondary"} className="shrink-0 text-xs">
                  {STATUS_LABEL[rx.status] ?? rx.status}
                </Badge>
              </div>
              {rx.completion?.total > 0 && (
                <p className="text-xs text-muted-foreground" data-rx-completion>
                  Done: {rx.completion.done} of {rx.completion.total} activities
                </p>
              )}
              {(rx.overrides ?? []).map((override: { actor_id: string; occurred_at: string; action: string; warnings: Array<{ code: string; date: string; rule: string }> }, i: number) => (
                <div key={`${override.occurred_at}:${i}`} className="border-l-2 border-primary pl-2 text-xs" data-coach-override>
                  <p className="font-semibold">Coach override · {override.action} · {new Date(override.occurred_at).toLocaleString()}</p>
                  {override.warnings.map((warning, j) => <p key={`${warning.code}:${j}`}>{warning.date}: {warning.rule}</p>)}
                  <p className="text-muted-foreground">Confirmed by {override.actor_id === rx.recipient_id ? rx.recipient_name : "you"}</p>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-2">
                {(rx.results ?? []).map((log: WorkoutActual) => <div key={log.id} className="w-full border-t border-border pt-2" data-rx-result={log.id}><p className="font-medium">{log.prescription?.movement_name ?? log.movement_slug}</p><p className="text-xs">{actualResultText(log)}</p></div>)}
                {future && (
                  <>
                    <input
                      type="date"
                      aria-label={`New date for ${rx.title}`}
                      value={editDate[rx.id] ?? rx.plan_date}
                      min={today}
                      onChange={(e) => setEditDate((p) => ({ ...p, [rx.id]: e.target.value }))}
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                      data-edit-date
                    />
                    <Button
                      size="sm" variant="outline" disabled={acting} data-edit-save
                      onClick={() => void perform(reschedule(rx.id, editDate[rx.id] ?? rx.plan_date))}
                    >
                      {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Move"}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={acting} data-cancel-rx onClick={() => void perform(cancel(rx.id))}>
                      Cancel this date
                    </Button>
                    {rx.series_id && (
                      <Button size="sm" variant="ghost" disabled={acting} data-cancel-series onClick={() => void perform(cancelSeries(rx.series_id))}>
                        Cancel future dates
                      </Button>
                    )}
                  </>
                )}
                {!future && (rx.status === "declined" || rx.status === "used_instead" || rx.status === "added_alongside") && (
                  <>
                    <input
                      type="date"
                      aria-label={`Resend date for ${rx.title}`}
                      value={editDate[rx.id] ?? today}
                      min={today}
                      onChange={(e) => setEditDate((p) => ({ ...p, [rx.id]: e.target.value }))}
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                    />
                    <Button size="sm" variant="outline" disabled={acting} data-resend onClick={() => void perform(resend(rx.id, editDate[rx.id] ?? today))}>
                      Send again
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
