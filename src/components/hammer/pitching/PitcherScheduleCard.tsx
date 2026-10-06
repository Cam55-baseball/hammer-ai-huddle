/**
 * Pitcher schedule — starters set start days or a rotation; relievers tap the
 * days they're available. Every outing records what actually happened.
 * Feeds the daily plan: priming the day before, recovery the day after,
 * lifting limits on start days, and the no-grip rule.
 */
import { useContext, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarClock, Check } from "lucide-react";
import { toast } from "sonner";
import { usePitcherSchedule, shiftIso, type PitcherRole } from "@/hooks/usePitcherSchedule";
import { HammersTodayContext } from "@/components/hammer/HammersTodayProvider";
import { useAuth } from "@/hooks/useAuth";
import { useHammerAthleteContext } from "@/lib/hammer/context/athleteContext";
import { readPitcherProfile, shouldShowPitchingCard } from "@/lib/hammer/pitching/pitcherProfile";

/** Mounts only for athletes who pitch — same rule as the pitching card. */
export function PitcherScheduleGate() {
  const { user } = useAuth();
  const ctx = useHammerAthleteContext();
  const show = shouldShowPitchingCard(
    readPitcherProfile(user?.id),
    ctx.get<unknown>("position_primary")?.value ?? null,
    ctx.get<unknown>("position_secondary")?.value ?? null,
  );
  return show ? <PitcherScheduleCard /> : null;
}

const ROLE_LABEL: Record<PitcherRole, string> = { starter: "Starter", reliever: "Reliever", both: "Both" };
const dayName = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" });
const dayLong = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });

export function PitcherScheduleCard() {
  const s = usePitcherSchedule();
  const plan = useContext(HammersTodayContext);
  const [startDate, setStartDate] = useState("");
  const [otherDay, setOtherDay] = useState<Record<string, string>>({});
  const role = s.data?.settings?.role ?? null;
  const rot = s.data?.settings;

  const after = (msg: string) => () => {
    toast.success(msg);
    try { plan?.generate?.(); } catch { /* plan refreshes next open */ }
  };
  const fail = (e: unknown) => toast.error(`Couldn't save: ${(e as Error)?.message ?? "try again"}`);

  if (s.isLoading) return null;
  if (s.isError) return (
    <Card><CardContent className="p-3 space-y-2">
      <p className="text-sm">Couldn't check your pitching days. Your saved schedule hasn't been cleared.</p>
      <Button size="sm" variant="outline" onClick={() => s.refetch()}>Try again</Button>
    </CardContent></Card>
  );

  return (
    <Card className="border-primary/30" data-testid="pitcher-schedule-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" /> Your pitching days
        </CardTitle>
        {!s.data?.settings && s.upcoming.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No pitching schedule recorded. Your plan still uses your games and check-ins. Add your pitching days to help it protect the next outing.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* What actually happened — asked once per outing */}
        {s.unconfirmed.map((o) => (
          <div key={o.id} className="rounded-md border border-border bg-muted/40 p-3 space-y-2" data-testid="outing-confirm">
            <p className="text-sm font-medium">Did you pitch on {dayLong(o.planned_date!)}?</p>
            <div className="grid grid-cols-3 gap-2">
              <Button size="sm" onClick={() => s.resolveOuting.mutate({ id: o.id, thrown: true, actualDate: o.planned_date }, { onSuccess: after("Saved. Your plan knows you pitched."), onError: fail })}>Yes, that day</Button>
              <Button size="sm" variant="outline" onClick={() => setOtherDay((m) => ({ ...m, [o.id]: m[o.id] ?? shiftIso(o.planned_date!, 1) }))}>Different day</Button>
              <Button size="sm" variant="outline" onClick={() => s.resolveOuting.mutate({ id: o.id, thrown: false, actualDate: null }, { onSuccess: after("Saved. Not counted as an outing."), onError: fail })}>No</Button>
            </div>
            {otherDay[o.id] && (
              <div className="flex gap-2">
                <Input type="date" value={otherDay[o.id]} max={s.today} onChange={(e) => setOtherDay((m) => ({ ...m, [o.id]: e.target.value }))} />
                <Button size="sm" onClick={() => s.resolveOuting.mutate({ id: o.id, thrown: true, actualDate: otherDay[o.id] }, { onSuccess: after("Saved on the day you really pitched."), onError: fail })}>Save</Button>
              </div>
            )}
          </div>
        ))}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Your role</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(ROLE_LABEL) as PitcherRole[]).map((r) => (
              <Button key={r} size="sm" variant={role === r ? "default" : "outline"} onClick={() => s.saveSettings.mutate({ role: r }, { onSuccess: after("Role saved."), onError: fail })}>{ROLE_LABEL[r]}</Button>
            ))}
          </div>
        </div>

        {(role === "starter" || role === "both" || role === null) && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next start</p>
            <div className="flex gap-2">
              <Input type="date" value={startDate} min={s.today} onChange={(e) => setStartDate(e.target.value)} aria-label="Start date" />
              <Button size="sm" disabled={!startDate} onClick={() => s.planStart.mutate(startDate, { onSuccess: () => { setStartDate(""); after("Start saved.")(); }, onError: fail })}>Add</Button>
            </div>
            {s.upcoming.length > 0 && (
              <p className="text-xs text-muted-foreground">Starts coming up: {s.upcoming.map((o) => dayLong(o.planned_date!)).join(", ")}</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Repeat: start every</span>
              {[4, 5, 6, 7].map((n) => (
                <Button key={n} size="sm" variant={rot?.rotation_active && rot.rotation_every_days === n ? "default" : "outline"} className="h-7 px-2"
                  onClick={() => {
                    const anchor = s.upcoming[0]?.planned_date ?? startDate ?? null;
                    if (!anchor) { toast.error("Add your next start first, then pick how often."); return; }
                    s.saveSettings.mutate({ rotation_active: true, rotation_every_days: n, rotation_anchor_date: anchor }, { onSuccess: after("Rotation saved."), onError: fail });
                  }}>{n === 7 ? "week" : `${n}th day`}</Button>
              ))}
              {rot?.rotation_active && (
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => s.saveSettings.mutate({ rotation_active: false }, { onSuccess: after("Rotation off."), onError: fail })}>Off</Button>
              )}
            </div>
          </div>
        )}

        {(role === "reliever" || role === "both") && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Days you can pitch</p>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }, (_, i) => shiftIso(s.today, i)).map((d) => {
                const cur = s.data?.availability.find((a) => a.date === d)?.available ?? null;
                const next = cur === null ? true : cur === true ? false : null;
                return (
                  <button key={d} type="button" aria-label={`${dayName(d)}: ${cur === null ? "not set" : cur ? "available" : "not available"}`}
                    className={`rounded-md border py-2 text-[11px] font-medium ${cur === true ? "border-primary bg-primary text-primary-foreground" : cur === false ? "border-border bg-muted text-muted-foreground line-through" : "border-border"}`}
                    onClick={() => s.setAvailable.mutate({ date: d, available: next }, { onSuccess: after("Saved."), onError: fail })}>
                    {dayName(d)}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Tap once for available, again for not available, again to clear.</p>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">I threw today</p>
          <div className="grid grid-cols-3 gap-2">
            {(["start", "relief", "bullpen"] as const).map((t) => (
              <Button key={t} size="sm" variant="outline" onClick={() => s.threwToday.mutate(t, { onSuccess: after("Saved. Tomorrow's plan will help you recover."), onError: fail })}>
                <Check className="h-3.5 w-3.5 mr-1" />{t === "start" ? "Start" : t === "relief" ? "Relief" : "Bullpen"}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
