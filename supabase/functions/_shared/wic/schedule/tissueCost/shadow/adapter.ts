// Tissue Cost Scheduler — stage S3 shadow mode, input adapter.
// Spec: docs/wic/tissue-cost-scheduler-v1.md §2 (inputs and their defaults).
//
// PURE: no database, no clock, no network. Rows are fetched elsewhere and
// handed in. Every missing input takes the documented default and records a
// diagnostic so the gap is visible in the stored decision.

import {
  type CheckIn,
  type DaySchedule,
  type GameRole,
  type LiftEntry,
  type PainFlag,
  type Phase,
  type PracticeIntensity,
  type Profile,
  type SessionClass,
  type TrainingAgeBand,
} from "../types.ts";

export const SHADOW_ADAPTER_VERSION = "tcs_shadow_adapter_v1";

/* ------------------------------------------------------------------ raw rows */

export interface RawPrescription {
  plan_date: string;
  slot: string | null;
  movement_slug: string | null;
  cns_cost: number | null;
  sets: number | null;
  status: string | null;
  intensity_mode?: string | null;
}

export interface RawSessionLog {
  plan_date: string;
  movement_slug: string | null;
  sets_completed: number | null;
}

export interface RawGame {
  game_date: string;
  my_positions?: string[] | null;
  is_starting_pitcher?: boolean | null;
  is_doubleheader?: boolean | null;
  ignored_for_training?: boolean | null;
  deleted_at?: string | null;
}

export interface RawCalendarEvent {
  event_date: string;
  event_type: string | null;
  is_starting_pitcher?: boolean | null;
  is_doubleheader?: boolean | null;
  ignored_for_training?: boolean | null;
  deleted_at?: string | null;
}

export interface RawPractice {
  scheduled_date: string;
  practice_kind?: string | null;
  intensity?: string | null;
  duration_minutes?: number | null;
  status?: string | null;
}

export interface RawThrowingRep {
  created_at: string;
  metric?: string | null;
  value?: number | null;
  unit?: string | null;
}

export interface RawSpeedSession {
  session_date: string;
  distances?: unknown;
}

export interface RawQuiz {
  entry_date: string;
  hours_slept?: number | null;
  sleep_quality?: number | null;
  perceived_recovery?: number | null;
  pain_location?: string[] | null;
  pain_scale?: number | null;
}

export interface RawDailyLog {
  entry_date: string;
  day_status?: string | null;
  injury_mode?: boolean | null;
  injury_body_region?: string | null;
  game_logged?: boolean | null;
}

export interface RawMpi {
  sport?: string | null;
  primary_position?: string | null;
  date_of_birth?: string | null;
  season_status?: string | null;
  preseason_start_date?: string | null;
  preseason_end_date?: string | null;
  in_season_start_date?: string | null;
  in_season_end_date?: string | null;
  post_season_start_date?: string | null;
  post_season_end_date?: string | null;
}

export interface RawContext {
  sport_primary?: string | null;
  position_primary?: string | null;
  season_phase?: string | null;
  lifting_age_years?: number | null;
  competition_level?: string | null;
}

export interface RawShadowData {
  userId: string;
  today: string;
  timezone: string;
  windowStart: string;
  horizonEnd: string;
  mpi: RawMpi | null;
  context: RawContext | null;
  prescriptions: RawPrescription[];
  sessionLogs: RawSessionLog[];
  games: RawGame[];
  calendarEvents: RawCalendarEvent[];
  practices: RawPractice[];
  throwingReps: RawThrowingRep[];
  speedSessions: RawSpeedSession[];
  quizzes: RawQuiz[];
  dailyLogs: RawDailyLog[];
}

export interface ShadowInputs {
  profile: Profile;
  history: DaySchedule[];
  calendar: DaySchedule[];
  checkIns: CheckIn[];
  diagnostics: string[];
}

/* -------------------------------------------------------------------- helpers */

const isoDay = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const s = String(v);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
};

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Class from the day's prescribed lift intensity (§2, plan-only correctness). */
export function classFromPrescriptions(rows: RawPrescription[]): SessionClass | null {
  const lifts = rows.filter((r) => (r.slot ?? "").toLowerCase() === "lift");
  if (lifts.length === 0) return null;
  const peak = lifts.reduce((m, r) => Math.max(m, num(r.cns_cost) ?? 0), 0);
  if (peak >= 5) return "H";
  if (peak >= 3) return "M";
  return "L";
}

function positionRole(
  position: string | null | undefined,
  startingPitcher: boolean,
): GameRole {
  const p = (position ?? "").toLowerCase();
  if (p.startsWith("c") && !p.startsWith("cf")) return "catcher";
  if (startingPitcher || p.startsWith("p") || p.includes("pitch")) {
    return startingPitcher ? "starting_pitcher" : "position";
  }
  return "position";
}

function practiceIntensityOf(v: string | null | undefined): PracticeIntensity {
  const s = (v ?? "").toLowerCase();
  if (s.includes("high") || s.includes("hard") || s.includes("intense")) return "high";
  if (s.includes("light") || s.includes("easy")) return "light";
  return "moderate";
}

export function phaseFrom(mpi: RawMpi | null, context: RawContext | null, today: string): Phase {
  const within = (a?: string | null, b?: string | null) => {
    const s = isoDay(a);
    const e = isoDay(b);
    return !!s && !!e && today >= s && today <= e;
  };
  if (within(mpi?.in_season_start_date, mpi?.in_season_end_date)) return "in_season";
  if (within(mpi?.preseason_start_date, mpi?.preseason_end_date)) return "pre_season";
  if (within(mpi?.post_season_start_date, mpi?.post_season_end_date)) return "post_season";
  const s = (mpi?.season_status ?? context?.season_phase ?? "").toLowerCase();
  if (s.includes("in_season") || s === "in season") return "in_season";
  if (s.includes("pre")) return "pre_season";
  if (s.includes("post")) return "post_season";
  return "offseason";
}

export function trainingAgeBandFrom(context: RawContext | null): TrainingAgeBand {
  const level = (context?.competition_level ?? "").toLowerCase();
  if (level.includes("pro")) return "professional";
  const years = num(context?.lifting_age_years);
  if (years === null) return "beginner";
  if (years >= 8) return "elite";
  if (years >= 5) return "advanced";
  if (years >= 3) return "intermediate";
  if (years >= 1) return "developing";
  return "beginner";
}

export function ageFrom(dob: string | null | undefined, today: string): number | null {
  const d = isoDay(dob);
  if (!d) return null;
  const [by, bm, bd] = d.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age >= 5 && age <= 60 ? age : null;
}

function sumDistances(v: unknown): number {
  if (Array.isArray(v)) {
    return v.reduce<number>((t, e) => {
      if (typeof e === "number") return t + e;
      if (e && typeof e === "object") {
        const y = num((e as Record<string, unknown>).yards) ??
          num((e as Record<string, unknown>).distance) ?? 0;
        const reps = num((e as Record<string, unknown>).reps) ?? 1;
        return t + y * reps;
      }
      return t;
    }, 0);
  }
  if (v && typeof v === "object") {
    return Object.values(v as Record<string, unknown>).reduce<number>(
      (t, e) => t + (num(e) ?? 0),
      0,
    );
  }
  return 0;
}

/* --------------------------------------------------------------------- build */

export function buildShadowInputs(raw: RawShadowData): ShadowInputs {
  const diagnostics: string[] = [];
  const days = new Map<string, DaySchedule>();
  const day = (date: string): DaySchedule => {
    const existing = days.get(date);
    if (existing) return existing;
    const fresh: DaySchedule = { date };
    days.set(date, fresh);
    return fresh;
  };

  const phase = phaseFrom(raw.mpi, raw.context, raw.today);
  const position = raw.mpi?.primary_position ?? raw.context?.position_primary ?? null;

  /* lifts — prescribed counts as done unless marked skipped */
  const byDate = new Map<string, RawPrescription[]>();
  for (const p of raw.prescriptions) {
    const d = isoDay(p.plan_date);
    if (!d) continue;
    byDate.set(d, [...(byDate.get(d) ?? []), p]);
  }
  const loggedDates = new Set(
    raw.sessionLogs.map((l) => isoDay(l.plan_date)).filter((d): d is string => !!d),
  );
  if (raw.sessionLogs.length === 0) diagnostics.push("no_session_logs_prescribed_counts_as_done");
  for (const [date, rows] of byDate) {
    const cls = classFromPrescriptions(rows);
    if (!cls) continue;
    const lifts = rows.filter((r) => (r.slot ?? "").toLowerCase() === "lift");
    const skipped = lifts.length > 0 &&
      lifts.every((r) => (r.status ?? "").toLowerCase() === "skipped");
    const hardSets = lifts.reduce((t, r) => t + (num(r.sets) ?? 0), 0);
    const entry: LiftEntry = {
      class: cls,
      method: lifts.some((r) => (r.movement_slug ?? "").includes("double_ecc"))
        ? "double_eccentric"
        : "standard",
      hardSets: hardSets > 0 ? hardSets : null,
      skipped,
    };
    if (hardSets === 0) diagnostics.push(`no_hard_sets_${date}`);
    if (!loggedDates.has(date) && date < raw.today) diagnostics.push(`lift_unlogged_${date}`);
    day(date).lift = entry;
  }
  if (byDate.size === 0) diagnostics.push("no_prescriptions");

  /* games — gp_games first, then calendar events not already covered */
  const gameDates = new Set<string>();
  for (const g of raw.games) {
    if (g.deleted_at || g.ignored_for_training) continue;
    const d = isoDay(g.game_date);
    if (!d) continue;
    gameDates.add(d);
    const startingPitcher = g.is_starting_pitcher === true;
    const pos = g.my_positions?.[0] ?? position;
    if (!g.my_positions?.length && !position) diagnostics.push(`game_position_default_${d}`);
    const target = day(d);
    target.games = {
      role: positionRole(pos, startingPitcher),
      count: (target.games?.count ?? 0) + (g.is_doubleheader ? 2 : 1),
      doubleheader: g.is_doubleheader === true,
    };
    if (startingPitcher) target.pitcherStartDay = true;
  }
  for (const e of raw.calendarEvents) {
    if (e.deleted_at || e.ignored_for_training) continue;
    const d = isoDay(e.event_date);
    if (!d || gameDates.has(d)) continue;
    const kind = (e.event_type ?? "").toLowerCase();
    if (!kind.includes("game")) continue;
    diagnostics.push(`game_from_calendar_${d}`);
    const target = day(d);
    target.games = {
      role: positionRole(position, e.is_starting_pitcher === true),
      count: (target.games?.count ?? 0) + (e.is_doubleheader ? 2 : 1),
      doubleheader: e.is_doubleheader === true,
    };
    if (e.is_starting_pitcher) target.pitcherStartDay = true;
  }

  /* practices */
  if (raw.practices.length === 0) diagnostics.push("no_practices_default_none");
  for (const p of raw.practices) {
    const d = isoDay(p.scheduled_date);
    if (!d) continue;
    if ((p.status ?? "").toLowerCase() === "cancelled") continue;
    const minutes = num(p.duration_minutes);
    if (minutes === null) diagnostics.push(`practice_minutes_default_${d}`);
    const target = day(d);
    target.practiceMinutes = (target.practiceMinutes ?? 0) + (minutes ?? 60);
    target.practiceIntensity = practiceIntensityOf(p.intensity ?? p.practice_kind);
  }

  /* throwing */
  if (raw.throwingReps.length === 0) diagnostics.push("no_throwing_logs");
  for (const t of raw.throwingReps) {
    const d = isoDay(t.created_at);
    if (!d) continue;
    const metric = (t.metric ?? "").toLowerCase();
    if (!metric.includes("throw") && !metric.includes("pitch")) continue;
    const v = num(t.value) ?? 0;
    if (v <= 0) continue;
    const target = day(d);
    target.maxIntentThrows = (target.maxIntentThrows ?? 0) + v;
  }

  /* sprints and jumps outside the lift */
  for (const s of raw.speedSessions) {
    const d = isoDay(s.session_date);
    if (!d) continue;
    const yards = sumDistances(s.distances);
    if (yards <= 0) continue;
    const target = day(d);
    target.maxSprintYards = (target.maxSprintYards ?? 0) + yards;
  }

  /* check-ins — neutral when missing */
  const checkInByDate = new Map<string, CheckIn>();
  for (const q of raw.quizzes) {
    const d = isoDay(q.entry_date);
    if (!d) continue;
    const hours = num(q.hours_slept);
    const quality = num(q.sleep_quality);
    const recovery = num(q.perceived_recovery);
    const scale = num(q.pain_scale) ?? 0;
    const pain: PainFlag[] = (q.pain_location ?? [])
      .filter((r) => !!r)
      .map((region) => ({
        region,
        tank: null,
        blocksLoadedWork: scale >= 6,
      }));
    checkInByDate.set(d, {
      date: d,
      poorSleep: (hours !== null && hours < 6) || (quality !== null && quality <= 2),
      highSoreness: recovery !== null && recovery <= 3,
      pain: pain.length > 0 ? pain : null,
    });
  }
  for (const l of raw.dailyLogs) {
    const d = isoDay(l.entry_date);
    if (!d) continue;
    if (!l.injury_mode) continue;
    const existing = checkInByDate.get(d) ?? { date: d };
    checkInByDate.set(d, {
      ...existing,
      pain: [
        ...(existing.pain ?? []),
        { region: l.injury_body_region ?? "unspecified", tank: null, blocksLoadedWork: true },
      ],
    });
  }
  if (checkInByDate.size === 0) diagnostics.push("no_check_ins_neutral");

  const all = [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
  const history = all.filter((d) => d.date < raw.today);
  const calendar = all.filter((d) => d.date >= raw.today);
  const checkIns = [...checkInByDate.values()].sort((a, b) => a.date.localeCompare(b.date));

  const nothingAtAll = byDate.size === 0 && gameDates.size === 0 && raw.practices.length === 0;
  if (nothingAtAll) diagnostics.push("no_plan_no_calendar_default_m_cap");

  const age = ageFrom(raw.mpi?.date_of_birth, raw.today);
  if (age === null) diagnostics.push("age_missing_default");

  const profile: Profile = {
    athleteId: raw.userId,
    age,
    growthMode: age !== null && age <= 15,
    trainingAgeBand: trainingAgeBandFrom(raw.context),
    sport: raw.mpi?.sport ?? raw.context?.sport_primary ?? "baseball",
    position: positionRole(position, false),
    phase,
    isStartingPitcher: all.some((d) => d.pitcherStartDay === true),
    phaseTemplateClass: nothingAtAll ? "M" : null,
  };

  return { profile, history, calendar, checkIns, diagnostics };
}
