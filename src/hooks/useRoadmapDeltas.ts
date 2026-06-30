/**
 * useRoadmapDeltas — compares current 7d gpSignal vs prior 7d signal
 * and returns named milestone deltas. Drives the General "drift markers"
 * card and any Hammer surface that wants to call out week-over-week
 * change without claiming organism truth.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { gp } from "@/lib/games/ledger";
import { useGpSignal, type GpSignal } from "@/hooks/useGpSignal";
import { deltasFromSignals, type RoadmapDelta } from "@/lib/gp/roadmapDeltas";

function isoDaysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

/**
 * Build the prior 7-day window signal (days 7→14 ago) using the same
 * derivation as useGpSignal but shifted back.
 */
function usePriorWindowSignal(): GpSignal | null {
  const { user } = useAuth();
  const sinceDate = isoDaysAgo(14);
  const untilDate = isoDaysAgo(7);

  const games = useQuery({
    queryKey: ["gp-delta-prior-games", user?.id, sinceDate, untilDate],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await gp("gp_games")
        .select("id")
        .eq("user_id", user!.id)
        .gte("game_date", sinceDate)
        .lt("game_date", untilDate);
      return ((data ?? []) as Array<{ id: string }>).map((g) => g.id);
    },
  });

  const ids = games.data ?? [];
  const hasGames = ids.length > 0;

  const abQ = useQuery({
    queryKey: ["gp-delta-prior-ab", user?.id, ids.length],
    enabled: !!user && hasGames,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await gp("gp_at_bats").select("result").in("game_id", ids);
      return (data ?? []) as Array<{ result: string | null }>;
    },
  });
  const pchQ = useQuery({
    queryKey: ["gp-delta-prior-pch", user?.id, ids.length],
    enabled: !!user && hasGames,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await gp("gp_pitches")
        .select("perspective,result,location")
        .in("game_id", ids);
      return (data ?? []) as Array<{
        perspective: string;
        result: string | null;
        location: { zone?: number } | null;
      }>;
    },
  });
  const defQ = useQuery({
    queryKey: ["gp-delta-prior-def", user?.id, ids.length],
    enabled: !!user && hasGames,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await gp("gp_defense_plays")
        .select("position,error_flag")
        .in("game_id", ids);
      return (data ?? []) as Array<{ position: string | null; error_flag: boolean | null }>;
    },
  });

  return useMemo<GpSignal | null>(() => {
    if (!user || !hasGames) return null;
    const ab = abQ.data ?? [];
    const pch = (pchQ.data ?? []).filter((p) => p.perspective === "hitter");
    const def = defQ.data ?? [];

    const swings = pch.filter(
      (p) => p.result === "swinging_strike" || p.result === "foul" || p.result === "in_play",
    );
    const whiffs = pch.filter((p) => p.result === "swinging_strike");
    const whiffPct = swings.length >= 20 ? Math.round((whiffs.length / swings.length) * 100) : null;

    const ooz = pch.filter((p) => p.location && !p.location.zone);
    const chases = ooz.filter(
      (p) => p.result === "swinging_strike" || p.result === "foul" || p.result === "in_play",
    );
    const chasePct = ooz.length >= 20 ? Math.round((chases.length / ooz.length) * 100) : null;

    const ks = ab.filter((a) => a.result === "K_swinging" || a.result === "K_looking");
    const kRate = ab.length >= 6 ? Math.round((ks.length / ab.length) * 100) : null;

    const errs: Record<string, number> = {};
    for (const d of def) {
      if (d.error_flag && d.position) errs[d.position] = (errs[d.position] ?? 0) + 1;
    }
    const miscueClusters = Object.entries(errs)
      .filter(([, n]) => n >= 2)
      .map(([position, errors]) => ({ position, errors }))
      .sort((a, b) => b.errors - a.errors);

    return {
      loading: false,
      windowDays: 7,
      atBats: ab.length,
      pitchesSeen: pch.length,
      defensivePlays: def.length,
      gameToday: false,
      whiffPct,
      chasePct,
      kRate,
      miscueClusters,
      advisories: [],
    };
  }, [user, hasGames, abQ.data, pchQ.data, defQ.data]);
}

export interface UseRoadmapDeltasResult {
  readonly loading: boolean;
  readonly deltas: ReadonlyArray<RoadmapDelta>;
}

export function useRoadmapDeltas(): UseRoadmapDeltasResult {
  const current = useGpSignal(7);
  const prior = usePriorWindowSignal();
  const deltas = useMemo(() => deltasFromSignals(current, prior), [current, prior]);
  return { loading: current.loading, deltas };
}
