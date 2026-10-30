// Owner decisions Oct 28: 6 training days + 1 soft-recovery rest day, fixed weekly
// skill minimums, no week-by-week ramp; readiness changes intensity/volume INSIDE a
// session (low-taxing version keeps the minimum); one non-physical Mind item daily.
// Pure rules only — arm/throw rules and lifting stay owned by their existing modules.

export type Sport = "baseball" | "softball";
export type SkillCategory = "hitting" | "defense" | "baserunning" | "bunting";
export type Readiness = "high" | "normal" | "low";
export type SessionVersion = "full" | "standard" | "low_taxing";

export const TRAINING_DAYS_PER_WEEK = 6;
export const REST_DAYS_PER_WEEK = 1;

/** Season-density model: baseball mimics an MLB season, softball the college season. */
export const SEASON_MODEL: Record<Sport, string> = {
  baseball: "mlb_season",
  softball: "college_season",
};

export const WEEKLY_MINIMUMS: Record<SkillCategory, number> = {
  hitting: 3,
  defense: 4,
  baserunning: 1,
  bunting: 2,
};

/** Programs whose base running and conditioning are one combined session (owner Oct 30). */
export const COMBINED_BASE_CONDITIONING = new Set(["5tool", "golden_2way"]);
export const COMBINED_BASE_CONDITIONING_MIN = 2;
/** Card title for the day's running work: combined for 5Tool/G2W, pitcher conditioning otherwise. */
export function runningCardTitle(program: { has5Tool: boolean; hasG2W: boolean }): string {
  return program.has5Tool || program.hasG2W ? "Base running & conditioning" : "Conditioning";
}

/** Bunting minimum applies only to these programs. */
export const BUNTING_PROGRAMS = new Set(["5tool", "golden_2way"]);

export function weeklyMinimums(owned: SkillCategory[], program: string): Partial<Record<SkillCategory, number>> {
  const out: Partial<Record<SkillCategory, number>> = {};
  for (const c of owned) {
    if (c === "bunting" && !BUNTING_PROGRAMS.has(program)) continue;
    out[c] = WEEKLY_MINIMUMS[c];
    // Owner Oct 30: for 5Tool/Golden 2Way base-route conditioning IS the
    // base-running session, so the combined session meets the higher floor (2).
    if (c === "baserunning" && COMBINED_BASE_CONDITIONING.has(program)) out[c] = Math.max(WEEKLY_MINIMUMS.baserunning, COMBINED_BASE_CONDITIONING_MIN);
  }
  return out;
}

/** Readiness from check-in + load. Missing check-in is not "low" — it stays normal. */
export function perceivedReadiness(input: { checkIn?: number | null; loadRatio?: number | null }): Readiness {
  const c = input.checkIn;
  const l = input.loadRatio;
  if ((c != null && c <= 2) || (l != null && l >= 1.5)) return "low";
  if (c != null && c >= 4 && (l == null || l <= 1.1)) return "high";
  return "normal";
}

/** Volume multiplier inside a session; never zero (the minimum is kept). */
export function sessionVersion(r: Readiness): { version: SessionVersion; volume: number } {
  if (r === "low") return { version: "low_taxing", volume: 0.5 };
  if (r === "high") return { version: "full", volume: 1 };
  return { version: "standard", volume: 0.85 };
}

export type MindKind = "situations" | "film_study" | "tex_vision" | "breathing" | "focus_routine" | "journaling";
const MIND_ROTATION: MindKind[] = ["situations", "journaling", "film_study", "focus_routine", "journaling", "situations", "focus_routine"]; // Owner Oct30: breathing is only the recovery card's last task, never a Mind duplicate.

/** One non-physical item every day (rest days included). Tex Vision only when prescribed. */
export function dailyMindItem(dayIndex: number, texVisionPrescribed: boolean): { kind: MindKind; physical: false; countsIn: "discipline" } {
  const kind = texVisionPrescribed && dayIndex % 7 === 2 ? "tex_vision" : MIND_ROTATION[((dayIndex % 7) + 7) % 7];
  return { kind, physical: false, countsIn: "discipline" };
}

/**
 * Owner Oct 28 placement: study items (film, game situations, Tex Vision) go in
 * "Before you start"; mental-health and reflection items (breathing, focus routine,
 * journaling) are the very last task of the recovery card. Same on rest days.
 */
export type MindPlacement = "before_you_start" | "recovery_last";
export const MIND_STUDY: ReadonlySet<MindKind> = new Set(["situations", "film_study", "tex_vision"]);
export function mindPlacement(kind: MindKind): MindPlacement {
  return MIND_STUDY.has(kind) ? "before_you_start" : "recovery_last";
}

/** Owner Oct 28: every player gets at least 2 running-conditioning sessions a week, never on the rest day. */
export const CONDITIONING_WEEKLY_MINIMUM = 2;

export interface DayPlan {
  dayIndex: number;
  rest: boolean;
  sessions: { category: SkillCategory; version: SessionVersion; volume: number }[];
  mind: ReturnType<typeof dailyMindItem>;
}

/**
 * Spread each owned minimum across the 6 training days (rest day = index restDay).
 * Session COUNT never depends on week number or readiness — only the version does.
 */
export function buildWeek(input: {
  owned: SkillCategory[];
  program: string;
  restDay?: number;
  readinessByDay: Readiness[];
  texVisionPrescribed?: boolean;
  weekIndex?: number;
}): DayPlan[] {
  const restDay = input.restDay ?? 6;
  const mins = weeklyMinimums(input.owned, input.program);
  const trainingDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => d !== restDay);
  const days: DayPlan[] = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
    dayIndex: d,
    rest: d === restDay,
    sessions: [],
    mind: dailyMindItem((input.weekIndex ?? 0) * 7 + d, !!input.texVisionPrescribed),
  }));
  let cursor = 0;
  for (const [cat, n] of Object.entries(mins) as [SkillCategory, number][]) {
    // spaced placement: step through training days so a category doesn't stack
    const step = Math.max(1, Math.floor(trainingDays.length / n));
    for (let i = 0; i < n; i++) {
      const day = trainingDays[(cursor + i * step) % trainingDays.length];
      const v = sessionVersion(input.readinessByDay[day] ?? "normal");
      days[day].sessions.push({ category: cat, ...v });
    }
    cursor++;
  }
  return days;
}
