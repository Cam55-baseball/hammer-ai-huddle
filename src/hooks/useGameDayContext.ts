/**
 * useGameDayContext — unified, elite season + game-schedule projection.
 *
 * Combines:
 *   - canonical `useSeasonStatus` (preseason / in_season / post_season / off_season + date windows)
 *   - `useScheduleWindow` for the next 7 days (games + practices)
 *   - direct read of `games` for the trailing 7 days
 *
 * Derived signals every consumer can rely on:
 *   - isGameToday / isGameTomorrow
 *   - daysSinceLastGame
 *   - consecutiveGameDays (e.g. 16-in-a-row stretch detection)
 *   - gamesNext7d / gamesLast7d
 *   - scheduleKnown (false when in-season but the user hasn't told us anything)
 *   - phaseLabel + a short, action-grade summary line
 *
 * Read-only. Never authors organism truth. Missingness is preserved.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSeasonStatus } from "@/hooks/useSeasonStatus";
import { useScheduleWindow } from "@/hooks/command/useScheduleWindow";

export interface GameDayContext {
  loading: boolean;
  seasonPhase: "preseason" | "in_season" | "post_season" | "off_season";
  phaseLabel: string;
  isGameToday: boolean;
  isGameTomorrow: boolean;
  daysSinceLastGame: number | null;
  gamesLast7d: number;
  gamesNext7d: number;
  consecutiveGameDays: number; // including today if there's a game today
  scheduleKnown: boolean;
  /** Short, action-oriented context line for the Hammer header. */
  summaryLine: string;
  /** When true, today is a "freshness" day — strength/speed should ceiling out. */
  freshnessMode: boolean;
  /** When true, recent density is high — recovery ceiling active. */
  highDensity: boolean;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function useGameDayContext(): GameDayContext {
  const { user } = useAuth();
  const season = useSeasonStatus();
  const sched = useScheduleWindow();

  const today = new Date();
  const start7dAgo = isoDate(new Date(today.getTime() - 7 * 24 * 3600 * 1000));
  const startToday = isoDate(today);

  const recentGames = useQuery({
    queryKey: ["gameday-recent-games", user?.id, start7dAgo, startToday],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("games")
        .select("game_date")
        .eq("user_id", user!.id)
        .gte("game_date", start7dAgo)
        .lte("game_date", startToday)
        .not("status", "in", "(canceled,cancelled,rescheduled)")
        .order("game_date", { ascending: false });
      return (data ?? []) as Array<{ game_date: string }>;
    },
  });

  return useMemo<GameDayContext>(() => {
    const loading = season.isLoading || sched.loading || recentGames.isLoading;

    const phase = season.resolvedPhase;
    const phaseLabel = season.phaseProfile?.label ?? phase;

    const isGameToday = sched.today.some((s) => s.kind === "game");
    const isGameTomorrow = sched.tomorrow.some((s) => s.kind === "game");
    const gamesNext7d = sched.totalGames;
    const gamesLast7d = recentGames.data?.length ?? 0;

    // Days since last game (look back 7d).
    let daysSinceLastGame: number | null = null;
    const last = recentGames.data?.[0]?.game_date;
    if (last) {
      const ms = Date.now() - new Date(last + "T00:00:00").getTime();
      daysSinceLastGame = Math.max(0, Math.floor(ms / 86400000));
    }

    // Consecutive-game-day stretch (no off-day gaps) ending today/yesterday.
    let consecutiveGameDays = 0;
    const seen = new Set((recentGames.data ?? []).map((g) => g.game_date));
    // Walk backwards from today; allow start at today or yesterday.
    const startDate = new Date(today);
    if (!seen.has(isoDate(startDate))) {
      startDate.setDate(startDate.getDate() - 1);
    }
    let cursor = new Date(startDate);
    while (seen.has(isoDate(cursor))) {
      consecutiveGameDays += 1;
      cursor.setDate(cursor.getDate() - 1);
      if (consecutiveGameDays > 30) break;
    }

    // Schedule known: either we have a future game on the books, or we are
    // explicitly off/post and no games are expected.
    const scheduleKnown =
      gamesNext7d > 0 ||
      phase === "off_season" ||
      phase === "post_season" ||
      sched.unknown === false; // window query succeeded

    const freshnessMode = isGameToday || isGameTomorrow;
    const highDensity = consecutiveGameDays >= 5 || gamesLast7d >= 5;

    // Summary line — short, decisive, action-oriented.
    let summaryLine: string;
    if (isGameToday) {
      summaryLine = "Game today — freshness mode. Strength/speed ceiling lowered.";
    } else if (isGameTomorrow) {
      summaryLine = "Game tomorrow — short, sharp today, recovery prioritized.";
    } else if (highDensity) {
      summaryLine = `Dense stretch (${consecutiveGameDays}-day run, ${gamesLast7d} games in 7d) — recovery ceiling active.`;
    } else if (phase === "in_season" && gamesNext7d === 0) {
      summaryLine = "In-season, no games on the schedule yet — add games so I can plan around them.";
    } else if (phase === "in_season") {
      summaryLine = `In-season — ${gamesNext7d} game${gamesNext7d === 1 ? "" : "s"} in the next 7 days.`;
    } else if (phase === "preseason") {
      summaryLine = "Pre-season — rising volume + intent, sharpening for opening day.";
    } else if (phase === "post_season") {
      summaryLine = "Post-season — decompression window. Resolving pain comes first.";
    } else {
      summaryLine = "Off-season — building the engine.";
    }

    return {
      loading,
      seasonPhase: phase as GameDayContext["seasonPhase"],
      phaseLabel,
      isGameToday,
      isGameTomorrow,
      daysSinceLastGame,
      gamesLast7d,
      gamesNext7d,
      consecutiveGameDays,
      scheduleKnown,
      summaryLine,
      freshnessMode,
      highDensity,
    };
  }, [season, sched, recentGames.data, recentGames.isLoading]);
}
