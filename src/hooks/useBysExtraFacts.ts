import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { BysExtraFacts, ClipModule, CoachTag, GameFact } from "@/lib/hammer/bysExtraTriggers";
import type { IssueArea } from "@/lib/hammer/coachIssueTags";

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Owner Nov 5 round 3 — self-only reads feeding the extra Before-you-start triggers. Failures add nothing. */
export function useBysExtraFacts(sport: "baseball" | "softball", today: string, prescribedModules: readonly ClipModule[], recurringIssueLabels: readonly string[]) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["bys-extra-facts", user?.id, sport, today],
    enabled: Boolean(user?.id),
    staleTime: 60_000,
    queryFn: async (): Promise<Omit<BysExtraFacts, "prescribedModules" | "recurringIssueLabels">> => {
      const uid = user!.id;
      const since = iso(new Date(Date.parse(`${today}T12:00:00Z`) - 28 * 86_400_000));
      const [tags, games, signals, clips, tests, season, readiness] = await Promise.all([
        supabase.rpc("my_coach_issue_tags", { _days: 28 }),
        supabase.from("gp_games").select("id,game_date").eq("user_id", uid).eq("sport", sport).is("deleted_at", null).gte("game_date", since).lte("game_date", today).order("game_date").limit(60),
        supabase.from("wk_fault_signals").select("fault_key,source,discipline,sample_size,observed_at").eq("user_id", uid).gte("observed_at", `${since}T00:00:00Z`).limit(300),
        supabase.from("videos").select("module,created_at").eq("user_id", uid).eq("sport", sport).eq("status", "completed").order("created_at", { ascending: false }).limit(60),
        supabase.from("vault_performance_tests").select("test_date").eq("user_id", uid).eq("sport", sport).order("test_date", { ascending: false }).limit(1),
        supabase.from("athlete_mpi_settings").select("preseason_start_date,in_season_start_date").eq("user_id", uid).eq("sport", sport).maybeSingle(),
        supabase.from("asb_events").select("payload,occurred_at").eq("athlete_id", uid).eq("topic_id", "behavioral.readiness").gte("occurred_at", `${today}T00:00:00`).order("occurred_at", { ascending: false }).limit(1),
      ]);
      const gameIds = (games.data ?? []).map((g) => g.id);
      const [abs, runs] = gameIds.length ? await Promise.all([
        supabase.from("gp_at_bats").select("game_id,result,inning,ab_order").in("game_id", gameIds).eq("user_id", uid).order("inning").order("ab_order"),
        supabase.from("gp_baserun_events").select("game_id,event_type,success").in("game_id", gameIds).eq("user_id", uid),
      ]) : [{ data: [] }, { data: [] }];
      const gameFacts: GameFact[] = (games.data ?? []).map((g) => ({
        date: g.game_date,
        atBats: (abs.data ?? []).filter((a) => a.game_id === g.id).map((a) => ({ result: a.result })),
        baserun: (runs.data ?? []).filter((r) => r.game_id === g.id).map((r) => ({ event_type: r.event_type, success: r.success })),
      }));
      const sig = signals.data ?? [];
      const tendency = new Map<string, number>();
      for (const s of sig) if (s.source === "game_hub") tendency.set(s.fault_key, (tendency.get(s.fault_key) ?? 0) + Math.max(1, Number(s.sample_size) || 1));
      const lastClip: Partial<Record<ClipModule, string | null>> = {};
      for (const c of clips.data ?? []) {
        const m = c.module as ClipModule;
        if ((m === "hitting" || m === "pitching" || m === "throwing") && !lastClip[m]) lastClip[m] = c.created_at;
      }
      const score = Number((readiness.data?.[0]?.payload as Record<string, unknown> | null)?.score);
      return {
        today,
        coachTags: (tags.data ?? []).map((t): CoachTag => ({ area: t.issue_area as IssueArea, label: t.issue_label, coachName: t.coach_name, createdAt: t.created_at })),
        games: gameFacts,
        lowReadinessToday: Number.isFinite(score) && score <= 4,
        lateSwingFaults: sig.filter((s) => s.source === "video_analysis" && s.discipline === "hitting" && /late/i.test(s.fault_key)).map((s) => s.fault_key),
        gameTendencyFaults: [...tendency].filter(([, n]) => n >= 2).map(([k]) => k),
        lastClipByModule: lastClip,
        lastTestDate: tests.data?.[0]?.test_date ?? null,
        preseasonStart: season.data?.preseason_start_date ?? null,
        inSeasonStart: season.data?.in_season_start_date ?? null,
      };
    },
    select: (d): BysExtraFacts => ({ ...d, prescribedModules, recurringIssueLabels }),
  });
}
