import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  readinessSeries, readinessMeaning, missedDays, missedMeaning, checkinLine, armFeel, injuryLines, loadLevel,
  COLOR_LABEL, type ReadinessColor, type CheckinRow, type DailyLogRow, type LoadRow,
} from "@/lib/coach/checkinReadiness";

export const NOT_SHARED = "Not shared by the player";
export const COLOR_VAR: Record<ReadinessColor, string> = {
  good: "hsl(var(--success))", okay: "hsl(var(--wellness-warning))", low: "hsl(var(--destructive))", none: "hsl(var(--muted))",
};

export interface Checkins28 { shared: boolean; checkins?: CheckinRow[]; daily_logs?: DailyLogRow[]; load?: LoadRow[]; today?: string }

const Meaning = ({ children }: { children: string }) => <p className="text-xs text-muted-foreground"><span className="font-medium">What this means:</span> {children}</p>;

/** Coach View "Check-ins & readiness" — only for players who share check-ins (parent rule for minors). */
export function CoachCheckinsReadinessView({ data }: { data: Checkins28 }) {
  const [days, setDays] = useState<14 | 28>(14);
  if (!data.shared) return <div className="rounded-lg border p-3" data-testid="checkins-not-shared"><p className="text-sm font-medium">{NOT_SHARED}</p><p className="text-xs text-muted-foreground">This player hasn't turned on sharing check-ins with coaches (players under 18 need a parent to agree).</p></div>;
  const today = data.today ?? new Date().toLocaleDateString("en-CA");
  const rows = data.checkins ?? [];
  const series = readinessSeries(rows, today, days);
  const missed = missedDays(rows, today, days);
  const injuries = injuryLines(rows, data.daily_logs ?? []);
  const load = loadLevel(data.load ?? [], today);
  return (
    <div className="space-y-3" data-testid="checkins-readiness">
      <section className="rounded-lg border p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Readiness trend</h3>
          <div className="flex gap-1">{([14, 28] as const).map((n) => <Button key={n} size="sm" variant={days === n ? "default" : "outline"} onClick={() => setDays(n)}>{n} days</Button>)}</div>
        </div>
        <div className="h-36" aria-label={`Readiness for the last ${days} days`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series.map((s) => ({ ...s, v: s.readiness ?? 0.15 }))}>
              <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(8)} fontSize={10} interval={days === 14 ? 1 : 3} />
              <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} fontSize={10} width={20} />
              <Bar dataKey="v" radius={[3, 3, 0, 0]}>{series.map((s) => <Cell key={s.date} fill={COLOR_VAR[s.color]} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">{(["good", "okay", "low", "none"] as const).map((c) => <span key={c} className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_VAR[c] }} />{COLOR_LABEL[c]}</span>)}</div>
        <Meaning>{readinessMeaning(series)}</Meaning>
      </section>

      <section className="rounded-lg border p-3 space-y-1" data-testid="checkins-missed">
        <h3 className="text-sm font-semibold">Missed check-ins</h3>
        <p className="text-sm">{missed.length} of the last {days} days{missed.length ? `: ${missed.slice(-5).map((d) => d.slice(5)).join(", ")}${missed.length > 5 ? "…" : ""}` : ""}</p>
        <Meaning>{missedMeaning(missed.length, days)}</Meaning>
      </section>

      <section className="rounded-lg border p-3 space-y-2">
        <h3 className="text-sm font-semibold">Injury progress</h3>
        {injuries.length === 0 ? <p className="text-sm text-muted-foreground">No pain flags in the last 28 days.</p> : injuries.map((i) => (
          <div key={i.area} className="space-y-0.5"><p className="text-sm font-medium capitalize">{i.area}{i.points.length ? `: ${i.points.map((p) => p.pain).join(" → ")}` : ""}</p><Meaning>{i.meaning}</Meaning></div>
        ))}
      </section>

      <section className="rounded-lg border p-3 space-y-1" data-testid="checkins-load">
        <h3 className="text-sm font-semibold">Recent training load</h3>
        <p className="text-sm">{load.week} logged items this week · about {load.usualPerWeek} in a usual week · {load.level === "high" ? "Higher than usual" : load.level === "light" ? "Lighter than usual" : load.level === "usual" ? "Usual" : "No logs"}</p>
        <Meaning>{load.meaning}</Meaning>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Daily check-ins</h3>
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No check-ins in the last 28 days.</p>}
        {rows.slice(0, 14).map((r, i) => (
          <div key={i} className="rounded-lg border p-3 text-sm space-y-0.5">
            <p className="font-medium">{r.entry_date}</p>
            {checkinLine(r).map((f) => <p key={f}>{f}</p>)}
            {armFeel(r) && <p>{armFeel(r)}</p>}
          </div>
        ))}
        <p className="text-xs text-muted-foreground">Source: what the player entered in their check-in.</p>
      </section>
    </div>
  );
}

export function CoachCheckinsReadinessTab({ athleteId }: { athleteId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["coach-checkins-28", athleteId],
    queryFn: async (): Promise<Checkins28> => {
      const { data, error } = await (supabase as any).rpc("coach_athlete_checkins_28", { _athlete: athleteId });
      if (error) throw error;
      return data as Checkins28;
    },
  });
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading check-ins…</p>;
  if (isError || !data) return <p className="text-sm text-muted-foreground">Check-ins aren't available right now.</p>;
  return <CoachCheckinsReadinessView data={data} />;
}

export interface TeamReadinessRow { athlete_id: string; name: string; shared: boolean; readiness?: number | null; checked_in?: boolean }

export function TeamReadinessStripView({ rows }: { rows: TeamReadinessRow[] }) {
  const shared = rows.filter((r) => r.shared);
  const notIn = shared.filter((r) => !r.checked_in);
  return (
    <section className="rounded-lg border p-3 space-y-2" data-testid="team-readiness-strip">
      <h2 className="text-sm font-semibold">Today's readiness</h2>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">No connected players yet.</p> : (
        <div className="flex flex-wrap gap-2">
          {rows.map((r) => {
            const label = !r.shared ? NOT_SHARED : !r.checked_in ? "Not checked in yet" : r.readiness == null ? "Checked in" : COLOR_LABEL[r.readiness >= 4 ? "good" : r.readiness >= 3 ? "okay" : "low"];
            const color = !r.shared || !r.checked_in || r.readiness == null ? COLOR_VAR.none : COLOR_VAR[r.readiness >= 4 ? "good" : r.readiness >= 3 ? "okay" : "low"];
            return <span key={r.athlete_id} className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />{r.name} · {label}</span>;
          })}
        </div>
      )}
      {shared.length > 0 && <p className="text-xs text-muted-foreground">{notIn.length ? `Not checked in yet: ${notIn.map((r) => r.name).join(", ")}.` : "Everyone who shares has checked in today."}</p>}
    </section>
  );
}

export function TeamReadinessStrip() {
  const { data, isError } = useQuery({
    queryKey: ["coach-team-readiness-today"],
    queryFn: async (): Promise<TeamReadinessRow[]> => {
      const { data, error } = await (supabase as any).rpc("coach_team_readiness_today");
      if (error) throw error;
      return (data ?? []) as TeamReadinessRow[];
    },
  });
  if (isError) return <p className="text-sm text-muted-foreground">Today's readiness isn't available right now.</p>;
  if (!data) return null;
  return <TeamReadinessStripView rows={data} />;
}
