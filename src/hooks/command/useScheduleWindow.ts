/**
 * Schedule window — bounded antecedent reader for the Command Center.
 *
 * Sprint: Command Center Authority Restoration §C (RFL-064).
 *
 * Reads two concrete schedule sources for `[today, today+7d]`:
 *   - `games`                       (game_date)
 *   - `scheduled_practice_sessions` (scheduled_date)
 *
 * Returns a typed, missingness-preserving window. Never authors organism
 * truth. Never feeds back into the canonical ledger. Daily plan + WorkloadCard
 * consume it as an additive, lineage-visible hint.
 *
 * Subordinate to Eternal Laws, RR-6 (athlete-reported pain outranks schedule),
 * Phase 46 ledger supremacy. Missing data is *visible*, never imputed.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ScheduleKind =
  | "game"
  | "tournament"
  | "practice"
  | "team_practice"
  | "camp"
  | "travel"
  | "other";

export interface ScheduleSlot {
  kind: ScheduleKind;
  date: string; // YYYY-MM-DD
  daysUntil: number; // 0 = today, 1 = tomorrow, …
  label: string;
}

export interface TournamentWindow {
  startDate: string;
  endDate: string;
  totalDays: number;
  dayIndex: number; // 1-based, relative to today (0 if today is not inside)
}

export interface ScheduleWindow {
  loading: boolean;
  /** True when the underlying queries succeeded but returned zero rows. */
  empty: boolean;
  /** True when the queries are not enabled (no user) — neither empty nor loaded. */
  unknown: boolean;
  /** Slot collections within the next 7 days. */
  today: ScheduleSlot[];
  tomorrow: ScheduleSlot[];
  /** Slots indexed by ISO date for the next 7 days. */
  slotsByDate: Record<string, ScheduleSlot[]>;
  /** First competition (game / tournament) within the next 7 days, if any. */
  upcomingCompetition: ScheduleSlot | null;
  /** Tournament window covering today, if any. */
  tournamentWindow: TournamentWindow | null;
  /** Total slots in the window. */
  totalGames: number;
  totalPractices: number;
}


function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: string, today: Date): number {
  const a = new Date(from + "T00:00:00");
  const b = new Date(today.toISOString().slice(0, 10) + "T00:00:00");
  return Math.round((a.getTime() - b.getTime()) / (24 * 3600 * 1000));
}

export function useScheduleWindow(): ScheduleWindow {
  const { user } = useAuth();
  const uid = user?.id ?? null;

  const today = new Date();
  const start = isoDate(today);
  const end = isoDate(new Date(today.getTime() + 7 * 24 * 3600 * 1000));

  const games = useQuery({
    queryKey: ["schedule-window-games", uid, start, end],
    enabled: !!uid,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("gp_games")
        .select("id, game_date, opponent_team, status, game_type")
        .eq("user_id", uid!)
        .gte("game_date", start)
        .lte("game_date", end)
        .not("status", "in", "(canceled,cancelled,rescheduled)")
        .order("game_date", { ascending: true });
      return ((data ?? []) as any[]).map((g: any) => ({
        id: g.id,
        game_date: g.game_date,
        opponent_name: g.opponent_team ?? "",
        status: g.status,
        game_type: g.game_type,
      })) as Array<{
        id: string;
        game_date: string;
        opponent_name: string;
        status: string;
        game_type: string | null;
      }>;
    },
  });

  const practices = useQuery({
    queryKey: ["schedule-window-practices", uid, start, end],
    enabled: !!uid,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("scheduled_practice_sessions")
        .select("id, scheduled_date, title, status, session_type, session_module")
        .eq("user_id", uid!)
        .gte("scheduled_date", start)
        .lte("scheduled_date", end)
        .not("status", "in", "(canceled,cancelled,rescheduled)")
        .order("scheduled_date", { ascending: true });
      return (data ?? []) as Array<{
        id: string;
        scheduled_date: string;
        title: string;
        status: string | null;
        session_type: string | null;
        session_module: string | null;
      }>;
    },
  });

  const loading = games.isLoading || practices.isLoading;

  if (!uid) {
    return {
      loading: false,
      empty: false,
      unknown: true,
      today: [],
      tomorrow: [],
      slotsByDate: {},
      upcomingCompetition: null,
      tournamentWindow: null,
      totalGames: 0,
      totalPractices: 0,
    };
  }

  const slots: ScheduleSlot[] = [];
  for (const g of games.data ?? []) {
    const isTournament = (g.game_type ?? "").toLowerCase() === "tournament";
    slots.push({
      kind: isTournament ? "tournament" : "game",
      date: g.game_date,
      daysUntil: daysBetween(g.game_date, today),
      label: g.opponent_name ? `vs ${g.opponent_name}` : isTournament ? "Tournament" : "Game",
    });
  }
  for (const p of practices.data ?? []) {
    const t = (p.session_type ?? "").toLowerCase();
    const titleLc = (p.title ?? "").toLowerCase();
    const isCamp =
      t === "camp" || t === "showcase" || t === "clinic" ||
      /\b(camp|showcase|clinic)\b/.test(titleLc);
    const isTravel = t === "travel" || /\btravel\b/.test(titleLc);
    const isTeamPractice =
      t === "team_practice" || t === "team-practice" ||
      /\bteam practice\b/.test(titleLc);
    const kind: ScheduleKind = isCamp
      ? "camp"
      : isTravel
        ? "travel"
        : isTeamPractice
          ? "team_practice"
          : t === "practice"
            ? "practice"
            : t === "other"
              ? "other"
              : "practice";
    slots.push({
      kind,
      date: p.scheduled_date,
      daysUntil: daysBetween(p.scheduled_date, today),
      label: p.title || (kind === "camp" ? "Camp" : kind === "travel" ? "Travel" : "Practice"),
    });
  }

  const todaySlots = slots.filter((s) => s.daysUntil === 0);
  const tomorrowSlots = slots.filter((s) => s.daysUntil === 1);
  const slotsByDate: Record<string, ScheduleSlot[]> = {};
  for (const s of slots) {
    (slotsByDate[s.date] ??= []).push(s);
  }
  const upcomingCompetition =
    slots
      .filter((s) => (s.kind === "game" || s.kind === "tournament") && s.daysUntil >= 0)
      .sort((a, b) => a.daysUntil - b.daysUntil)[0] ?? null;

  // Tournament window covering today: contiguous tournament dates including today.
  let tournamentWindow: TournamentWindow | null = null;
  const tournamentDates = Array.from(
    new Set(slots.filter((s) => s.kind === "tournament").map((s) => s.date)),
  ).sort();
  if (tournamentDates.length > 0) {
    const todayIso = isoDate(today);
    // Find contiguous run containing today (or starting at today).
    const dayMs = 24 * 3600 * 1000;
    let runStart: string | null = null;
    let runEnd: string | null = null;
    for (let i = 0; i < tournamentDates.length; i++) {
      const d = tournamentDates[i];
      let j = i;
      while (
        j + 1 < tournamentDates.length &&
        new Date(tournamentDates[j + 1] + "T00:00:00").getTime() -
          new Date(tournamentDates[j] + "T00:00:00").getTime() ===
          dayMs
      ) {
        j++;
      }
      if (d <= todayIso && tournamentDates[j] >= todayIso) {
        runStart = d;
        runEnd = tournamentDates[j];
        break;
      }
      i = j;
    }
    if (runStart && runEnd) {
      const total =
        Math.round(
          (new Date(runEnd + "T00:00:00").getTime() -
            new Date(runStart + "T00:00:00").getTime()) /
            (24 * 3600 * 1000),
        ) + 1;
      const idx =
        Math.round(
          (new Date(todayIso + "T00:00:00").getTime() -
            new Date(runStart + "T00:00:00").getTime()) /
            (24 * 3600 * 1000),
        ) + 1;
      tournamentWindow = {
        startDate: runStart,
        endDate: runEnd,
        totalDays: total,
        dayIndex: idx,
      };
    }
  }

  const totalGames = slots.filter((s) => s.kind === "game" || s.kind === "tournament").length;
  const totalPractices = slots.filter(
    (s) => s.kind === "practice" || s.kind === "team_practice",
  ).length;

  return {
    loading,
    empty: !loading && slots.length === 0,
    unknown: false,
    today: todaySlots,
    tomorrow: tomorrowSlots,
    slotsByDate,
    upcomingCompetition,
    tournamentWindow,
    totalGames,
    totalPractices,
  };
}

