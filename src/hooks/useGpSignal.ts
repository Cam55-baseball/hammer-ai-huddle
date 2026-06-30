/**
 * useGpSignal — lineage-bound derived signal from the gp_* ledger.
 *
 * Reads the last 7 days of at-bats, pitches (as hitter), and defensive
 * plays for the current user and returns a small projection the Hammer
 * daily plan + The General can consume.
 *
 * Interpretive only — never authors organism truth. Missingness is
 * preserved (everything starts null until threshold n is met).
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { gp } from "@/lib/games/ledger";

export interface GpSignal {
  readonly loading: boolean;
  readonly windowDays: number;
  readonly atBats: number;
  readonly pitchesSeen: number;
  readonly defensivePlays: number;
  /** True iff a gp_games row exists for today — used to suppress lifts. */
  readonly gameToday: boolean;
  /** Whiff% on swings, last 7d. null if n<20 swings. */
  readonly whiffPct: number | null;
  /** Chase% (swings at out-of-zone), last 7d. null if n<20 out-of-zone pitches. */
  readonly chasePct: number | null;
  /** Strikeout rate of last 7d. null if n<6 AB. */
  readonly kRate: number | null;
  /** Map of position → error count over the window (only positions with ≥2). */
  readonly miscueClusters: ReadonlyArray<{ position: string; errors: number }>;
  /** Short, action-oriented advisory lines for surfaces to render. */
  readonly advisories: ReadonlyArray<{
    readonly kind: "discipline" | "defense" | "whiff";
    readonly message: string;
  }>;
}

const EMPTY: GpSignal = {
  loading: false,
  windowDays: 7,
  atBats: 0,
  pitchesSeen: 0,
  defensivePlays: 0,
  gameToday: false,
  whiffPct: null,
  chasePct: null,
  kRate: null,
  miscueClusters: [],
  advisories: [],
};

function isoDaysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

export function useGpSignal(windowDays = 7): GpSignal {
  const { user } = useAuth();
  const sinceDate = isoDaysAgo(windowDays);

  const todayIso = new Date().toISOString().slice(0, 10);
  const recentGames = useQuery({
    queryKey: ["gp-signal-games", user?.id, sinceDate],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await gp("gp_games")
        .select("id,game_date")
        .eq("user_id", user!.id)
        .gte("game_date", sinceDate);
      return (data ?? []) as Array<{ id: string; game_date: string | null }>;
    },
  });

  const gameRows = recentGames.data ?? [];
  const gameIds = gameRows.map((g) => g.id);
  const hasGames = gameIds.length > 0;
  const gameToday = gameRows.some((g) => g.game_date === todayIso);

  const atBats = useQuery({
    queryKey: ["gp-signal-ab", user?.id, sinceDate, gameIds.length],
    enabled: !!user && hasGames,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await gp("gp_at_bats")
        .select("result")
        .in("game_id", gameIds);
      return (data ?? []) as Array<{ result: string | null }>;
    },
  });

  const pitches = useQuery({
    queryKey: ["gp-signal-pitches", user?.id, sinceDate, gameIds.length],
    enabled: !!user && hasGames,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await gp("gp_pitches")
        .select("perspective,result,location")
        .in("game_id", gameIds);
      return (data ?? []) as Array<{
        perspective: string;
        result: string | null;
        location: { zone?: number; outZone?: string | null } | null;
      }>;
    },
  });

  const defense = useQuery({
    queryKey: ["gp-signal-def", user?.id, sinceDate, gameIds.length],
    enabled: !!user && hasGames,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await gp("gp_defense_plays")
        .select("position,error_flag")
        .in("game_id", gameIds);
      return (data ?? []) as Array<{ position: string | null; error_flag: boolean | null }>;
    },
  });

  return useMemo<GpSignal>(() => {
    if (!user) return EMPTY;
    const loading =
      recentGames.isLoading || atBats.isLoading || pitches.isLoading || defense.isLoading;
    if (!hasGames) return { ...EMPTY, loading, gameToday };

    const abRows = atBats.data ?? [];
    const pchRows = (pitches.data ?? []).filter((p) => p.perspective === "hitter");
    const defRows = defense.data ?? [];

    // Whiff%
    const swings = pchRows.filter(
      (p) =>
        p.result === "swinging_strike" ||
        p.result === "foul" ||
        p.result === "in_play",
    );
    const whiffs = pchRows.filter((p) => p.result === "swinging_strike");
    const whiffPct =
      swings.length >= 20 ? Math.round((whiffs.length / swings.length) * 100) : null;

    // Chase% — swing at out-of-zone (no zone, but pitch logged)
    const outOfZone = pchRows.filter((p) => p.location && !p.location.zone);
    const chases = outOfZone.filter(
      (p) =>
        p.result === "swinging_strike" ||
        p.result === "foul" ||
        p.result === "in_play",
    );
    const chasePct =
      outOfZone.length >= 20 ? Math.round((chases.length / outOfZone.length) * 100) : null;

    // K rate
    const ks = abRows.filter((a) => a.result === "K_swinging" || a.result === "K_looking");
    const kRate = abRows.length >= 6 ? Math.round((ks.length / abRows.length) * 100) : null;

    // Miscue clusters
    const errsByPos: Record<string, number> = {};
    for (const d of defRows) {
      if (d.error_flag && d.position) {
        errsByPos[d.position] = (errsByPos[d.position] ?? 0) + 1;
      }
    }
    const miscueClusters = Object.entries(errsByPos)
      .filter(([, n]) => n >= 2)
      .map(([position, errors]) => ({ position, errors }))
      .sort((a, b) => b.errors - a.errors);

    const advisories: Array<{ kind: "discipline" | "defense" | "whiff"; message: string }> = [];
    if (chasePct != null && chasePct > 35) {
      advisories.push({
        kind: "discipline",
        message: `Chase rate ${chasePct}% over last ${windowDays}d — Tex-Vision pitch-recognition block today.`,
      });
    }
    if (whiffPct != null && whiffPct > 30) {
      advisories.push({
        kind: "whiff",
        message: `Whiff% ${whiffPct} on swings — bias bat-tracking / contact reps.`,
      });
    }
    for (const c of miscueClusters) {
      advisories.push({
        kind: "defense",
        message: `${c.errors} errors at ${c.position} in last ${windowDays}d — defensive rep block prioritized.`,
      });
    }

    return {
      loading: false,
      windowDays,
      atBats: abRows.length,
      pitchesSeen: pchRows.length,
      defensivePlays: defRows.length,
      gameToday,
      whiffPct,
      chasePct,
      kRate,
      miscueClusters,
      advisories,
    };
  }, [
    user,
    hasGames,
    gameToday,
    windowDays,
    recentGames.isLoading,
    atBats.isLoading,
    atBats.data,
    pitches.isLoading,
    pitches.data,
    defense.isLoading,
    defense.data,
  ]);
}
