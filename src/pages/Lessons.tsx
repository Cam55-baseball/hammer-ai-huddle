import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { callFn } from "@/lib/addons/client";

interface Session { id: string; lesson_number: number; start_at: string; status: string; requested_start_at: string | null; meet_url: string | null }
interface Booking { id: string; status: "awaiting_times" | "requested" | "confirmed"; lesson_sessions: Session[] }
interface Slot { start: string; end: string }

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: tz });
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZone: tz });
const localDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: tz });

/** Group open slots by the player's own calendar day. */
export function groupByDay(slots: Slot[]) {
  const map = new Map<string, Slot[]>();
  for (const s of slots) { const k = localDay(s.start); map.set(k, [...(map.get(k) ?? []), s]); }
  return [...map.entries()];
}

export default function Lessons() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [picks, setPicks] = useState<string[]>([]);
  const [moving, setMoving] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const r = await callFn<{ bookings: Booking[] }>("lesson-booking", { action: "mine" });
    setBookings(r.bookings);
    if (r.bookings.some((b) => b.status === "awaiting_times" || b.status === "confirmed")) {
      try { setSlots((await callFn<{ slots: Slot[] }>("lesson-availability", {})).slots); }
      catch { setSlots([]); }
    }
  }, []);
  useEffect(() => { load().catch(() => setBookings([])); }, [load]);

  const days = useMemo(() => groupByDay(slots ?? []), [slots]);
  const active = bookings?.[0];

  const toggle = (start: string) => {
    setPicks((cur) => {
      if (cur.includes(start)) return cur.filter((p) => p !== start);
      const withoutSameDay = cur.filter((p) => localDay(p) !== localDay(start));
      return withoutSameDay.length >= 4 ? withoutSameDay : [...withoutSameDay, start];
    });
  };

  const submit = async () => {
    if (!active) return;
    setSaving(true);
    try {
      await callFn("lesson-booking", { action: "submit_times", bookingId: active.id, picks, timeZone: tz });
      toast({ title: "Sent! The coach will confirm your times." });
      setPicks([]); await load();
    } catch (e) {
      toast({ title: "Couldn't send", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
      await load();
    } finally { setSaving(false); }
  };

  const reschedule = async (sessionId: string, newStart: string) => {
    try {
      await callFn("lesson-booking", { action: "request_reschedule", sessionId, newStart });
      toast({ title: "Asked to move it. The coach will approve or keep the time." });
      setMoving(null); await load();
    } catch (e) {
      toast({ title: "Couldn't ask to move it", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <h1 className="text-xl font-bold text-foreground">Hammers Online — Private lessons</h1>
        <p className="text-xs text-muted-foreground">Times are shown in your time zone ({tz}).</p>
        {!bookings && <p className="text-sm text-muted-foreground">Loading…</p>}
        {bookings && !active && <p className="text-sm text-muted-foreground">You don't have lessons yet. You can buy them in Add-ons on <Link className="text-primary underline" to="/training-plans">Find Your Training Plan</Link>.</p>}

        {active?.status === "awaiting_times" && (
          <div className="space-y-3">
            <p className="text-sm text-foreground">Pick 4 times, each on a different day. Picked: {picks.length} of 4.</p>
            {slots === null && <p className="text-sm text-muted-foreground">Loading open times…</p>}
            {slots?.length === 0 && <p className="text-sm text-muted-foreground">No open times right now. Check back soon.</p>}
            {days.map(([day, list]) => (
              <div key={day} className="rounded-md border border-border p-2">
                <p className="text-xs font-semibold text-muted-foreground mb-1">{dayLabel(list[0].start)}</p>
                <div className="flex flex-wrap gap-2">
                  {list.map((s) => (
                    <Button key={s.start} size="sm" variant={picks.includes(s.start) ? "default" : "outline"} onClick={() => toggle(s.start)}>
                      {timeLabel(s.start)}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
            <Button disabled={picks.length !== 4 || saving} onClick={submit}>Send my 4 times</Button>
          </div>
        )}

        {active && active.status !== "awaiting_times" && (
          <div className="space-y-2">
            <p className="text-sm text-foreground">{active.status === "requested" ? "Waiting for the coach to confirm these times:" : "Your confirmed lessons:"}</p>
            {[...active.lesson_sessions].sort((a, b) => a.lesson_number - b.lesson_number).map((s) => (
              <div key={s.id} className="rounded-md border border-border p-3 text-sm">
                <p className="font-semibold text-foreground">Lesson {s.lesson_number}: {dayLabel(s.start_at)}, {timeLabel(s.start_at)}</p>
                {s.meet_url && <a className="text-primary underline text-xs" href={s.meet_url} target="_blank" rel="noreferrer">Join on Google Meet</a>}
                {s.status === "reschedule_requested" && s.requested_start_at && (
                  <p className="text-xs text-muted-foreground">You asked to move this to {dayLabel(s.requested_start_at)}, {timeLabel(s.requested_start_at)}. Waiting for the coach.</p>
                )}
                {s.status === "confirmed" && new Date(s.start_at).getTime() - Date.now() < 86400000 && new Date(s.start_at).getTime() > Date.now() && (
                  <p className="text-xs text-foreground mt-1">Reminder: this lesson is within the next 24 hours.</p>
                )}
                {s.status === "confirmed" && (
                  moving === s.id ? (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(slots ?? []).slice(0, 40).map((x) => (
                        <Button key={x.start} size="sm" variant="outline" onClick={() => reschedule(s.id, x.start)}>{dayLabel(x.start)} {timeLabel(x.start)}</Button>
                      ))}
                      <Button size="sm" variant="ghost" onClick={() => setMoving(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" className="mt-1 px-0" onClick={() => setMoving(s.id)}>Ask to move this lesson</Button>
                  )
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">Questions about your lessons? <a className="underline" href="mailto:hammersmodality@hammersmodality.org">Contact us</a></p>
      </div>
    </DashboardLayout>
  );
}
