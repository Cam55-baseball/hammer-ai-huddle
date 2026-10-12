import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { FacilityBoardRow } from "@/lib/org/facilityBoard";

interface TestingDay {
  id: string;
  athlete_id: string;
  scheduled_for: string;
  tests: string[];
  status: "scheduled" | "done" | "skipped";
  skip_reason: string | null;
  verified_at: string | null;
  video_url: string | null;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Plan v3.1 owner addition — testing day for facility athletes. */
export function TestingDays({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const [athlete, setAthlete] = useState("");
  const [date, setDate] = useState(today());
  const [tests, setTests] = useState("");

  const { data: roster } = useQuery({
    queryKey: ["org-facility-board", orgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("org_facility_board", { _org: orgId });
      if (error) throw error;
      return (data ?? []) as FacilityBoardRow[];
    },
  });
  const names = Object.fromEntries((roster ?? []).map((r) => [r.athlete_id, r.name ?? "Player"]));

  const { data: days } = useQuery({
    queryKey: ["testing-days", orgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("testing_days")
        .select("id,athlete_id,scheduled_for,tests,status,skip_reason,verified_at,video_url")
        .eq("organization_id", orgId)
        .order("scheduled_for", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TestingDay[];
    },
  });

  // Sends any due reminders (3 days ahead and on the day) when staff open this tab.
  useEffect(() => {
    (supabase as any).rpc("send_testing_day_reminders", { _org: orgId }).then(() => {});
  }, [orgId]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["testing-days", orgId] });
  const call = async (fn: string, args: Record<string, unknown>, ok: string) => {
    const { error } = await (supabase as any).rpc(fn, args);
    if (error) return toast.error(error.message);
    toast.success(ok);
    refresh();
  };

  const schedule = () => {
    const list = tests.split(",").map((t) => t.trim()).filter(Boolean);
    if (!athlete || list.length === 0) return toast.error("Pick a player and list at least one test.");
    call("schedule_testing_day", { _org: orgId, _athlete: athlete, _date: date, _tests: list }, "Testing day scheduled. Coaches were notified.").then(() => setTests(""));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Schedule a testing day</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="td-player">Player</Label>
            <select id="td-player" className="w-full rounded-md border border-input bg-background p-2 text-sm" value={athlete} onChange={(e) => setAthlete(e.target.value)}>
              <option value="">Pick a player</option>
              {(roster ?? []).map((r) => <option key={r.athlete_id} value={r.athlete_id}>{r.name ?? "Player"}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="td-date">Date</Label>
            <Input id="td-date" type="date" min={today()} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="td-tests">Tests (separate with commas)</Label>
            <Input id="td-tests" placeholder="60-yard sprint, Broad jump" value={tests} onChange={(e) => setTests(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">The player's head coach and assigned coaches get a notice now, 3 days before, and on the day.</p>
          <Button onClick={schedule}>Schedule</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Testing days</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(days ?? []).length === 0 && <p className="text-sm text-muted-foreground">No testing days yet.</p>}
          {(days ?? []).map((d) => <DayRow key={d.id} d={d} name={names[d.athlete_id] ?? "Player"} call={call} />)}
        </CardContent>
      </Card>
    </div>
  );
}

function DayRow({ d, name, call }: { d: TestingDay; name: string; call: (fn: string, a: Record<string, unknown>, ok: string) => Promise<unknown> }) {
  const [mode, setMode] = useState<null | "run" | "move" | "skip">(null);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [video, setVideo] = useState("");
  const [newDate, setNewDate] = useState(d.scheduled_for);
  const [reason, setReason] = useState("");
  const canRun = d.status === "scheduled" && d.scheduled_for <= today();

  const submit = () => {
    const results: Record<string, number | string> = {};
    for (const t of d.tests) {
      const v = (vals[t] ?? "").trim();
      if (v) results[t] = Number.isFinite(Number(v)) ? Number(v) : v;
    }
    if (Object.keys(results).length === 0) return;
    call("record_testing_day", { _id: d.id, _results: results, _video_url: video.trim() || null }, "Results saved as verified in person.");
  };

  return (
    <div className="space-y-2 rounded-md border border-border p-3 text-sm">
      <p className="font-medium">{name}</p>
      <p>Date: {d.scheduled_for}</p>
      <p>Tests: {d.tests.join(", ")}</p>
      <p>
        Status:{" "}
        {d.status === "done"
          ? `Done — verified in person on ${d.verified_at?.slice(0, 10)}`
          : d.status === "skipped"
            ? `Skipped${d.skip_reason ? ` — ${d.skip_reason}` : ""}`
            : "Scheduled"}
      </p>
      {d.video_url && <a className="text-primary underline" href={d.video_url} target="_blank" rel="noreferrer">Video link</a>}
      {d.status === "scheduled" && (
        <div className="flex flex-wrap gap-2">
          {canRun && <Button size="sm" onClick={() => setMode("run")}>Enter results</Button>}
          <Button size="sm" variant="outline" onClick={() => setMode("move")}>Reschedule</Button>
          <Button size="sm" variant="outline" onClick={() => setMode("skip")}>Skip</Button>
        </div>
      )}
      {mode === "run" && (
        <div className="space-y-2">
          {d.tests.map((t) => (
            <div key={t} className="space-y-1">
              <Label>{t} — result</Label>
              <Input aria-label={`${t} result`} value={vals[t] ?? ""} onChange={(e) => setVals({ ...vals, [t]: e.target.value })} />
            </div>
          ))}
          <Label>Video link (optional)</Label>
          <Input aria-label="Video link" placeholder="https://" value={video} onChange={(e) => setVideo(e.target.value)} />
          <Button size="sm" onClick={submit}>Save as verified in person</Button>
        </div>
      )}
      {mode === "move" && (
        <div className="flex gap-2">
          <Input type="date" aria-label="New date" min={today()} value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <Button size="sm" onClick={() => call("reschedule_testing_day", { _id: d.id, _date: newDate }, "Moved. Coaches were notified.")}>Save</Button>
        </div>
      )}
      {mode === "skip" && (
        <div className="flex gap-2">
          <Input aria-label="Reason" placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button size="sm" variant="outline" onClick={() => call("skip_testing_day", { _id: d.id, _reason: reason }, "Skipped. Coaches were notified.")}>Skip</Button>
        </div>
      )}
    </div>
  );
}
