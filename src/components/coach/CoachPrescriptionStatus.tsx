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

const STATUS_LABEL: Record<string, string> = {
  pending: "Not yet answered",
  used_instead: "Used instead of their card",
  added_alongside: "Added alongside",
  saved_for_later: "Saved for later",
  declined: "Declined",
};

export function CoachPrescriptionStatus() {
  const { rows, isLoading, reschedule, cancel, cancelSeries, resend, acting } = useManageSentWorkouts();
  const [editDate, setEditDate] = useState<Record<string, string>>({});
  const today = new Date().toLocaleDateString("en-CA");

  if (isLoading || rows.length === 0) return null;

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
        {rows.slice(0, 30).map((rx) => {
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
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{rx.title}</p>
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
              <div className="flex flex-wrap items-center gap-2">
                {future && (
                  <>
                    <input
                      type="date"
                      value={editDate[rx.id] ?? rx.plan_date}
                      min={today}
                      onChange={(e) => setEditDate((p) => ({ ...p, [rx.id]: e.target.value }))}
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                      data-edit-date
                    />
                    <Button
                      size="sm" variant="outline" disabled={acting} data-edit-save
                      onClick={() => void reschedule(rx.id, editDate[rx.id] ?? rx.plan_date)}
                    >
                      {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Move"}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={acting} data-cancel-rx onClick={() => void cancel(rx.id)}>
                      Cancel this date
                    </Button>
                    {rx.series_id && (
                      <Button size="sm" variant="ghost" disabled={acting} data-cancel-series onClick={() => void cancelSeries(rx.series_id)}>
                        Cancel future dates
                      </Button>
                    )}
                  </>
                )}
                {!future && (rx.status === "declined" || rx.status === "used_instead" || rx.status === "added_alongside") && (
                  <>
                    <input
                      type="date"
                      value={editDate[rx.id] ?? today}
                      min={today}
                      onChange={(e) => setEditDate((p) => ({ ...p, [rx.id]: e.target.value }))}
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                    />
                    <Button size="sm" variant="outline" disabled={acting} data-resend onClick={() => void resend(rx.id, editDate[rx.id] ?? today)}>
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
