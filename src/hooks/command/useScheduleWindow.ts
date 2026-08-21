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
  | "trainer_session"
  | "solo_practice"
  | "camp"
  | "travel"
  | "other";

/** Canonical practice taxonomy stored on `scheduled_practice_sessions`. */
export type PracticeKind = "team" | "trainer" | "solo" | "showcase" | "travel" | "other";

/** Practice load carried by a slot — drives plan modulation downstream. */
export type PracticeIntensity = "light" | "standard" | "heavy";

export interface ScheduleSlot {
  kind: ScheduleKind;
  date: string; // YYYY-MM-DD
  daysUntil: number; // 0 = today, 1 = tomorrow, …
  label: string;
  /** Canonical taxonomy for practice-derived slots (null for games). */
  practiceKind?: PracticeKind | null;
  /** Athlete-declared load for practice-derived slots. */
  intensity?: PracticeIntensity | null;
  durationMinutes?: number | null;
  /** True when this slot came from a weekly recurring practice rule. */
  recurring?: boolean;
  startTime?: string | null;
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
  /** True when a team practice or showcase lands today. */
  heavyPracticeToday: boolean;
  /** All practice-derived slots landing today. */
  practicesToday: ScheduleSlot[];
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
        .select(
          "id, scheduled_date, title, status, session_type, session_module, practice_kind, intensity, duration_minutes, start_time, recurring_active, recurring_days",
        )
        .eq("user_id", uid!)
        .not("status", "in", "(canceled,cancelled,rescheduled)")
        // Exact-date rows inside the window, plus recurring rules (expanded below).
        .or(`and(scheduled_date.gte.${start},scheduled_date.lte.${end}),recurring_active.is.true`)
        .order("scheduled_date", { ascending: true })
        .limit(200);
      return (data ?? []) as Array<{
        id: string;
        scheduled_date: string;
        title: string;
        status: string | null;
        session_type: string | null;
        session_module: string | null;
        practice_kind: string | null;
        intensity: string | null;
        duration_minutes: number | null;
        start_time: string | null;
        recurring_active: boolean | null;
        recurring_days: number[] | null;
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
      heavyPracticeToday: false,
      practicesToday: [],
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
  // Window dates (today … today+7d) used to expand recurring practice rules.
  const windowDates: string[] = [];
  for (let i = 0; i <= 7; i++) {
    windowDates.push(isoDate(new Date(today.getTime() + i * 24 * 3600 * 1000)));
  }

  const normalizeKind = (p: {
    practice_kind: string | null;
    session_type: string | null;
    title: string | null;
  }): PracticeKind => {
    const raw = (p.practice_kind ?? "").toLowerCase();
    if (["team", "trainer", "solo", "showcase", "travel", "other"].includes(raw)) {
      return raw as PracticeKind;
    }
    // Legacy rows predate the taxonomy — infer from type/title, never invent.
    const t = (p.session_type ?? "").toLowerCase();
    const titleLc = (p.title ?? "").toLowerCase();
    if (t === "camp" || t === "showcase" || t === "clinic" || /\b(camp|showcase|clinic|combine|tryout)\b/.test(titleLc)) return "showcase";
    if (t === "travel" || /\btravel\b/.test(titleLc)) return "travel";
    if (t === "trainer" || t === "trainer_session" || /\b(lesson|trainer|academy|private)\b/.test(titleLc)) return "trainer";
    if (t === "solo" || t === "solo_practice" || /\b(cage|solo|on my own|long toss)\b/.test(titleLc)) return "solo";
    return "team";
  };

  const SLOT_KIND: Record<PracticeKind, ScheduleKind> = {
    team: "team_practice",
    trainer: "trainer_session",
    solo: "solo_practice",
    showcase: "camp",
    travel: "travel",
    other: "other",
  };
  const DEFAULT_INTENSITY: Record<PracticeKind, PracticeIntensity> = {
    team: "heavy",
    showcase: "heavy",
    trainer: "standard",
    solo: "light",
    travel: "light",
    other: "light",
  };
  const FALLBACK_LABEL: Record<PracticeKind, string> = {
    team: "Team practice",
    trainer: "Trainer session",
    solo: "Personal practice",
    showcase: "Showcase",
    travel: "Travel",
    other: "Scheduled event",
  };

  for (const p of practices.data ?? []) {
    const practiceKind = normalizeKind(p);
    const kind = SLOT_KIND[practiceKind];
    const intensity = (["light", "standard", "heavy"] as const).includes(
      (p.intensity ?? "") as PracticeIntensity,
    )
      ? (p.intensity as PracticeIntensity)
      : DEFAULT_INTENSITY[practiceKind];
    const label = p.title || FALLBACK_LABEL[practiceKind];

    // Dates this rule occupies inside the window: the exact date and/or each
    // matching weekday for an active recurring rule.
    const dates = new Set<string>();
    if (p.scheduled_date >= start && p.scheduled_date <= end) dates.add(p.scheduled_date);
    if (p.recurring_active && Array.isArray(p.recurring_days) && p.recurring_days.length) {
      for (const d of windowDates) {
        const dow = new Date(`${d}T12:00:00Z`).getUTCDay();
        if (p.recurring_days.includes(dow) && (!p.scheduled_date || p.scheduled_date <= d)) {
          dates.add(d);
        }
      }
    }

    for (const date of dates) {
      slots.push({
        kind,
        date,
        daysUntil: daysBetween(date, today),
        label,
        practiceKind,
        intensity,
        durationMinutes: p.duration_minutes ?? null,
        startTime: p.start_time ?? null,
        recurring: !!p.recurring_active && date !== p.scheduled_date,
      });
    }
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
  const practiceSlots = slots.filter((s) => !!s.practiceKind && s.practiceKind !== "travel" && s.practiceKind !== "other");
  const totalPractices = practiceSlots.length;
  const practicesToday = practiceSlots.filter((s) => s.daysUntil === 0);
  const heavyPracticeToday = practicesToday.some(
    (s) => s.intensity === "heavy" || s.practiceKind === "team" || s.practiceKind === "showcase",
  );

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
    heavyPracticeToday,
    practicesToday,
  };
}

