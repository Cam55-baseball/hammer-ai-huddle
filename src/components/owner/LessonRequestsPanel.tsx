import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { callFn } from "@/lib/addons/client";

const ET = "America/New_York";
const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: ET }) + " ET";
const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const fromHHMM = (s: string) => { const [h, m] = s.split(":").map(Number); return h * 60 + (m || 0); };

function LessonHoursSettings() {
  const { toast } = useToast();
  const [s, setS] = useState<any>(null);
  useEffect(() => { supabase.from("lesson_hours_settings").select("*").eq("id", 1).maybeSingle().then(({ data }) => setS(data)); }, []);
  if (!s) return null;
  const save = async () => {
    const { error } = await supabase.from("lesson_hours_settings").update({
      weekdays: s.weekdays, start_minute: s.start_minute, end_minute: s.end_minute,
      min_notice_hours: s.min_notice_hours, max_weeks_ahead: s.max_weeks_ahead, updated_at: new Date().toISOString(),
    }).eq("id", 1);
    toast({ title: error ? "Couldn't save" : "Lesson hours saved", variant: error ? "destructive" : undefined });
  };
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <h3 className="font-semibold text-foreground">Lesson hours (Eastern time)</h3>
      <div className="flex flex-wrap gap-2">
        {WEEK.map((d, i) => (
          <Button key={d} size="sm" variant={s.weekdays.includes(i) ? "default" : "outline"}
            onClick={() => setS({ ...s, weekdays: s.weekdays.includes(i) ? s.weekdays.filter((x: number) => x !== i) : [...s.weekdays, i].sort() })}>{d}</Button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <label>From <Input type="time" value={toHHMM(s.start_minute)} onChange={(e) => setS({ ...s, start_minute: fromHHMM(e.target.value) })} /></label>
        <label>To <Input type="time" value={toHHMM(s.end_minute)} onChange={(e) => setS({ ...s, end_minute: fromHHMM(e.target.value) })} /></label>
        <label>Notice (hours) <Input type="number" min={0} value={s.min_notice_hours} onChange={(e) => setS({ ...s, min_notice_hours: Number(e.target.value) })} /></label>
        <label>Weeks ahead <Input type="number" min={1} value={s.max_weeks_ahead} onChange={(e) => setS({ ...s, max_weeks_ahead: Number(e.target.value) })} /></label>
      </div>
      <p className="text-xs text-muted-foreground">Each lesson is 1 hour; the 4 lessons are on 4 different days. Busy times on your Google Calendar are removed.</p>
      <Button size="sm" onClick={save}>Save lesson hours</Button>
    </div>
  );
}

export function LessonRequestsPanel() {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { setRows((await callFn<{ bookings: any[] }>("lesson-booking", { action: "owner_list" })).bookings); } catch { setRows([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const act = async (key: string, body: any, ok: string) => {
    setBusy(key);
    try { await callFn("lesson-booking", body); toast({ title: ok }); await load(); }
    catch (e) { toast({ title: "Didn't work", description: e instanceof Error ? e.message : undefined, variant: "destructive" }); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h3 className="font-semibold text-foreground">Lesson requests</h3>
        {rows === null && <p className="text-sm text-muted-foreground">Loading…</p>}
        {rows?.length === 0 && <p className="text-sm text-muted-foreground">No lesson bookings yet.</p>}
        {rows?.map((b) => (
          <div key={b.id} className="rounded-md border border-border p-3 space-y-1 text-sm">
            <p className="font-semibold text-foreground">{b.player_name} — {b.status === "awaiting_times" ? "paid, picking times" : b.status === "requested" ? "waiting for you" : "confirmed"}</p>
            {[...(b.lesson_sessions ?? [])].sort((x: any, y: any) => x.lesson_number - y.lesson_number).map((s: any) => (
              <div key={s.id} className="text-xs text-muted-foreground">
                Lesson {s.lesson_number}: {fmt(s.start_at)} {s.meet_url && <a className="underline text-primary" href={s.meet_url} target="_blank" rel="noreferrer">Meet</a>}
                {s.status === "reschedule_requested" && s.requested_start_at && (
                  <span className="block text-foreground">Wants to move to {fmt(s.requested_start_at)}{" "}
                    <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act(s.id, { action: "owner_reschedule", sessionId: s.id, approve: true }, "Moved")}>Approve</Button>{" "}
                    <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => act(s.id, { action: "owner_reschedule", sessionId: s.id, approve: false }, "Kept original time")}>Keep</Button>
                  </span>
                )}
              </div>
            ))}
            {b.status === "requested" && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" disabled={!!busy} onClick={() => act(b.id, { action: "owner_confirm", bookingId: b.id }, "Confirmed — invites sent")}>Confirm &amp; send invites</Button>
                <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act(b.id, { action: "owner_return", bookingId: b.id }, "Asked the player to pick new times")}>Ask for new times</Button>
              </div>
            )}
          </div>
        ))}
      </div>
      <LessonHoursSettings />
    </div>
  );
}
