/**
 * E2E WP4 item 3 — youth throwing rules shown and enforced on the pitching card.
 * Reads a year of pitching logs, height readings and today's check-in, and
 * shows one plain verdict. When a cap is full or the arm is flagged tired the
 * card says stop, and the log buttons above are paired with that instruction.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHammerAthleteContext } from "@/lib/hammer/context/athleteContext";
import { ageFrom, throwRoleFrom } from "@/lib/throwing/armLedgerEntry";
import { youthPitchingToday, type PitchDay } from "@/lib/throwing/youthPitchingToday";

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 0;
};

function toDays(rows: any[]): PitchDay[] {
  const by = new Map<string, PitchDay>();
  for (const r of rows ?? []) {
    const m = r.metrics ?? {};
    let pitches = 0;
    let innings = num(m.innings);
    for (const rd of Array.isArray(m.rounds) ? m.rounds : []) {
      pitches += num(rd?.pitches ?? rd?.reps);
      innings += num(rd?.innings);
    }
    const d = by.get(r.plan_date) ?? { date: r.plan_date, pitches: 0, innings: 0 };
    d.pitches += pitches;
    d.innings += innings;
    by.set(r.plan_date, d);
  }
  return [...by.values()];
}

export function YouthPitchingLimits({ today }: { today: string }) {
  const { user } = useAuth();
  const ctx = useHammerAthleteContext();
  const sport = ctx.get<unknown>("sport_primary")?.value === "softball" ? "softball" : "baseball";
  const age = ageFrom(ctx.get<string>("date_of_birth")?.value as string | null);
  const role = throwRoleFrom(ctx.get<unknown>("position_primary")?.value ?? null, ctx.get<unknown>("position_secondary")?.value ?? null);

  const q = useQuery({
    queryKey: ["youth-pitching", user?.id, today],
    enabled: !!user && sport === "baseball",
    staleTime: 60_000,
    queryFn: async () => {
      const yearStart = `${Number(today.slice(0, 4))}-01-01`;
      const from = new Date(Date.parse(today + "T00:00:00Z") - 130 * 86400000).toISOString().slice(0, 10);
      const start = from < yearStart ? from : yearStart;
      const [logs, heights, fatigue, profile] = await Promise.all([
        (supabase as any).from("wk_session_logs").select("plan_date, metrics").eq("user_id", user!.id)
          .gte("plan_date", start).lte("plan_date", today).in("template_id", ["bullpen_pitching", "pitching_outing"]).limit(1000),
        (supabase as any).from("athlete_height_checks").select("measured_on, inches").eq("user_id", user!.id).order("measured_on").limit(200),
        supabase.from("asb_events").select("payload, occurred_at").eq("athlete_id", user!.id).eq("topic_id", "behavioral.fatigue")
          .gte("occurred_at", `${today}T00:00:00`).order("occurred_at", { ascending: false }).limit(1),
        supabase.from("profiles").select("competitive_level").eq("id", user!.id).maybeSingle(),
      ]);
      return {
        days: toDays(logs.data ?? []),
        heights: ((heights.data ?? []) as any[]).map((h) => ({ date: h.measured_on, inches: Number(h.inches) })),
        fatigue: (fatigue.data?.[0]?.payload as any)?.score ?? null,
        level: (profile.data as any)?.competitive_level ?? null,
      };
    },
  });

  if (sport !== "baseball" || age == null || !q.data) return null;
  const v = youthPitchingToday({
    sport, age, level: q.data.level, today, days: q.data.days, heights: q.data.heights,
    seasonStart: null, checkInFatigue: q.data.fatigue != null ? Number(q.data.fatigue) : null,
    pitcherCatcher: role === "pitcher_catcher",
  });
  if (!v.applies) return null;

  return (
    <div className="space-y-1.5 rounded-md border bg-muted/20 p-3" data-testid="youth-pitching-limits">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Arm limits today</div>
      <p className="text-xs">Up to {v.dailyMax} pitches today.</p>
      {v.lines.map((l) => (
        <p key={l} className="text-xs font-medium text-destructive" data-testid="youth-pitching-stop">{l}</p>
      ))}
      {v.warnings.map((w) => (
        <p key={w} className="text-[11px] text-muted-foreground">{w}.</p>
      ))}
      {v.growthLine && <p className="text-[11px]">{v.growthLine}</p>}
      {v.pitcherCatcherLine && <p className="text-[11px] font-medium">{v.pitcherCatcherLine}</p>}
    </div>
  );
}
