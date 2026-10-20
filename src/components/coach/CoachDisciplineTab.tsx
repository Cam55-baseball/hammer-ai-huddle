import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { practiceLogging } from "@/lib/discipline/practiceLogging";
import { completion, currentStreak, missedDays, windowDays, loggingConsistency, adherenceLinks, type DayRecord } from "@/lib/discipline/discipline";

export function CoachDisciplineTab({ athleteId }: { athleteId: string }) {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["coach-discipline", athleteId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("coach_athlete_discipline" as any, { _athlete: athleteId });
      if (error) throw error;
      return data as { days: Array<{ date: string; prescribed: number; done: number }>; skips: Array<{ slot: string; skipped: number; prescribed: number }>; from: string; to: string };
    },
  });
  const practice = useQuery({
    queryKey: ["coach-discipline-practice", user?.id, athleteId, data?.from, data?.to],
    enabled: !!user && !!data,
    queryFn: async () => {
      if (!user || !data) throw new Error("Sign in first");
      // RPC access is broader than session SELECT access. Denied reads are never zero logs.
      if (user.id !== athleteId) {
        const access = await supabase.rpc("is_linked_coach", { p_coach_id: user.id, p_player_id: athleteId });
        if (access.error) throw access.error;
        if (!access.data) return null;
      }
      const logs = await supabase.from("performance_sessions")
        .select("id,session_date,session_type,deleted_at")
        .eq("user_id", athleteId).gte("session_date", data.from).lte("session_date", data.to)
        .in("session_type", ["solo_work", "team_session", "lesson", "live_abs"]).is("deleted_at", null)
        .order("session_date", { ascending: true });
      if (logs.error) throw logs.error;
      return logs.data;
    },
  });
  const trends = useQuery({
    queryKey: ["coach-discipline-links", athleteId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("coach_athlete_trends", { _athlete: athleteId });
      if (error) throw error;
      return (data ?? []).flatMap((m: any) => ((m.recent ?? []) as any[]).map((o) => ({
        metric: m.metric_key as string, value: Number(o.value), date: String(o.recorded_at).slice(0, 10), unit: o.unit ?? m.unit,
      })));
    },
  });
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error || !data) return <p className="text-sm text-muted-foreground">Could not load discipline.</p>;

  const projected = practiceLogging(data.days.map((d) => ({ ...d, logged: d.done > 0 })), practice.data ?? [], data.from, data.to);
  const past: DayRecord[] = projected.days.filter((d) => d.date < data.to);
  const end = past[past.length - 1]?.date ?? data.to;
  const pct = (n: 7 | 28 | 90) => { const c = completion(windowDays(past, end, n)); return c === null ? "Not enough data" : `${c}%`; };

  return (
    <div className="space-y-3">
      <Card className="p-4 space-y-2">
        <h3 className="font-semibold">Work done vs work set (days before today)</h3>
        <p className="text-sm">Last 7 days: {pct(7)}</p>
        <p className="text-sm">Last 28 days: {pct(28)}</p>
        <p className="text-sm">Last 90 days: {pct(90)}</p>
        <p className="text-sm">Current streak (days with all work done): {past.length ? currentStreak(past) : "Not enough data"}</p>
        <p className="text-sm">Missed days, last 90 (work set, nothing logged): {past.length ? missedDays(past) : "Not enough data"}</p>
        <p className="text-sm">Logging consistency, last 28 days (days with work set that have a saved log): {(() => { if (practice.isLoading) return "Loading…"; if (practice.error || practice.data === null) return "Practice logs unavailable"; const c = loggingConsistency(windowDays(past, end, 28)); return c === null ? "Not enough data" : `${c}%`; })()}</p>
        <p className="text-xs text-muted-foreground">Source: the player's plan and their saved workout logs.</p>
      </Card>
      <Card className="p-4 space-y-2">
        <h3 className="font-semibold">Saved practice</h3>
        {practice.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : practice.error || practice.data === null ?
          <p role="alert" className="text-sm text-muted-foreground">Practice logs unavailable for this view.</p> : <>
            <p className="text-sm">Practice sessions: {projected.sessions} · {data.from} to {data.to}</p>
            <p className="text-sm">Latest practice date: {projected.dates[projected.dates.length - 1] ?? "Not entered"}</p>
            <p className="text-xs text-muted-foreground">Source: the player's saved practice logs. Practice logging does not mark a workout complete.</p>
          </>}
      </Card>
      <Card className="p-4 space-y-2">
        <h3 className="font-semibold">Most skipped, by card type (last 90 days)</h3>
        {data.skips.length === 0 ? <p className="text-sm text-muted-foreground">Not enough data</p> :
          data.skips.map((s) => <p key={s.slot} className="text-sm">Card type {s.slot}: skipped {s.skipped} of {s.prescribed}</p>)}
      </Card>
      <Card className="p-4 space-y-2">
        <h3 className="font-semibold">Links between doing the work and results</h3>
        <p className="text-xs text-muted-foreground">Each result is paired with how much work was done in the 28 days before it. A link never shows cause. At least 8 results are needed.</p>
        {(() => {
          const links = adherenceLinks(past, trends.data ?? []);
          if (!links.length) return <p className="text-sm text-muted-foreground">Not enough data</p>;
          return links.slice(0, 8).map((l) => (
            <p key={l.metric} className="text-sm">
              Result {l.metric.replace(/_/g, " ")}{l.unit ? ` (${l.unit})` : ""}: {l.result.label}
              {l.from ? ` · ${l.from} to ${l.to}` : ""}
            </p>
          ));
        })()}
      </Card>
    </div>
  );
}
