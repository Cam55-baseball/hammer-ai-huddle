// Owner Part B (Oct 31 2026): pitcher role cycle, mound/circle minimum, role lifts,
// sprint conditioning and the two-way arm split. Pure; shared by app and server.
// Only ORGANIZES work: every throw still passes the arm ledger, Pitch Smart, age,
// windmill and injury rules downstream, which may only remove work.

export type Sport = "baseball" | "softball";
export type PitchRole = "starter" | "bullpen" | "closer";
export type CycleDay = "start" | "outing" | "day_after" | "rest" | "long_toss" | "bullpen" | "light_mound" | "shortbox" | "pfp" | "available" | "pre_start";

export const FULL_DISTANCE_FT: Record<Sport, number> = { baseball: 60.5, softball: 43 };
/** Shortbox = 2/3 of the full pitching distance (≈40 ft baseball, ≈29 ft softball). */
export const SHORTBOX_FRACTION = 2 / 3;
export const shortboxFeet = (sport: Sport) => Math.round(FULL_DISTANCE_FT[sport] * SHORTBOX_FRACTION);
export const MOUND_MINIMUM_PER_WEEK = 3;
export const RELIEVER_VOLUME = 2 / 3;
export const TWO_WAY_MAJOR_SHARE = 0.7;

const DAY = 86_400_000;
const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
const between = (a: string, b: string) => Math.round((ms(b) - ms(a)) / DAY);

export interface CycleInput {
  sport: Sport;
  role: PitchRole;
  date: string;
  /** Dates actually pitched in a game (start or relief), any order. */
  outingDates: readonly string[];
  /** Planned/projected start dates. */
  plannedStarts: readonly string[];
  /** Game dates this player's team plays. */
  gameDates: readonly string[];
  /** Days the windmill program allows back-to-back circle work. */
  windmillAllowsDayTwo?: boolean;
}

/** One day of the role cycle, before the arm law trims anything. */
export function cycleDay(i: CycleInput): CycleDay {
  const past = [...i.outingDates].filter((d) => d < i.date).sort().reverse();
  const last = past[0];
  const since = last ? between(last, i.date) : 99;
  const startsToday = i.plannedStarts.includes(i.date) || (i.role === "starter" && i.outingDates.includes(i.date));
  const next = [...i.plannedStarts].filter((d) => d > i.date).sort()[0];
  const until = next ? between(i.date, next) : 99;
  if (i.role === "starter") {
    if (startsToday) return "start";
    if (since === 1) return "day_after";
    if (since === 2) return i.sport === "softball" && i.windmillAllowsDayTwo ? "light_mound" : "rest";
    if (until === 1) return "pre_start";
    if (since === 3) return "long_toss";
    if (since === 4 || until === 2) return "bullpen";
    return since % 2 === 1 ? "shortbox" : "light_mound";
  }
  // Bullpen arms and closers.
  if (i.outingDates.includes(i.date)) return "outing";
  const backToBack = since === 1 && past[1] != null && between(past[1], last!) === 1;
  if (since === 1) return "day_after";
  if (since === 2 && backToBack === false && past[1] != null && between(past[1], last!) === 1) return "rest";
  if (since === 2 && past[1] != null && between(past[1], last!) === 1) return "day_after";
  if (i.gameDates.includes(i.date)) return "available";
  const dow = new Date(ms(i.date)).getUTCDay();
  if (dow === 0) return "rest";
  return dow % 3 === 0 ? "long_toss" : dow % 2 === 0 ? "shortbox" : "light_mound";
}

export interface MoundWork { kind: "full_bullpen" | "light_mound" | "shortbox" | "circle" | "shortbox_circle"; feet: number; intensity: "catch_light" | "medium" | "full"; label: string }

/** Mound (baseball) or circle (softball) work this day counts toward the 3×/week minimum. */
export function moundWork(sport: Sport, day: CycleDay): MoundWork | null {
  const full = FULL_DISTANCE_FT[sport];
  const sb = shortboxFeet(sport);
  const place = sport === "softball" ? "circle" : "mound";
  if (day === "bullpen") return { kind: sport === "softball" ? "circle" : "full_bullpen", feet: full, intensity: "medium", label: sport === "softball" ? "Circle session" : "Bullpen" };
  if (day === "shortbox") return { kind: sport === "softball" ? "shortbox_circle" : "shortbox", feet: sb, intensity: "catch_light", label: `Shortbox from the ${place} (${sb} ft) — command, pitches in the zone` };
  if (day === "light_mound" || day === "pre_start") return { kind: sport === "softball" ? "circle" : "light_mound", feet: full, intensity: "catch_light", label: sport === "softball" ? "Light circle work — as light as playing catch" : "Light mound work — as light as playing catch" };
  return null;
}

export function dayLabel(sport: Sport, day: CycleDay): string {
  const place = sport === "softball" ? "circle" : "mound";
  switch (day) {
    case "start": return "Start — compete";
    case "outing": return "Outing — short, low-pitch";
    case "day_after": return "Light catch + 2-hand med-ball overhead throws (throwing mobility)";
    case "rest": return "Rest day — no throwing";
    case "long_toss": return "Long toss";
    case "bullpen": return sport === "softball" ? "Circle session" : "Bullpen";
    case "pre_start": return `Light ${place} work, no lower-body lift`;
    case "available": return "Available — on call, short PFP";
    case "pfp": return "Short PFP";
    default: return moundWork(sport, day)?.label ?? "";
  }
}

export interface LiftRule { volume: number; loadChange: false; heavy: boolean; noLowerBody: boolean; noLift: boolean }
/** Lifts never get lighter by role: relievers lose volume, not weight. */
export function liftRule(role: PitchRole, day: CycleDay, prevDay: CycleDay | null): LiftRule {
  return {
    volume: role === "starter" ? 1 : RELIEVER_VOLUME,
    loadChange: false,
    heavy: role === "starter" && prevDay === "rest",
    noLowerBody: day === "pre_start" || day === "start",
    noLift: day === "start" || day === "rest",
  };
}
export const reliefSets = (sets: number, role: PitchRole) => role === "starter" ? sets : Math.max(2, Math.round(sets * RELIEVER_VOLUME));

const LOWER = /squat|deadlift|rdl|hinge|lunge|step[-_ ]?up|split|jump|bound|leg|calf|nordic|hip[-_ ]thrust|sled|cossack|clean|snatch/i;
export const isLowerBodyLift = (slug: string, pattern?: string | null) => LOWER.test(`${slug} ${pattern ?? ""}`);

/** Sprint conditioning: starters build max-effort capacity week to week; relievers repeat short sprints. */
export function sprintDose(role: PitchRole, weekIndex: number): { reps: number; yards: number; restSeconds: number; kind: "max_sprint" | "repeat_sprint" } {
  if (role === "starter") return { reps: Math.min(10, 4 + weekIndex), yards: 30, restSeconds: 45, kind: "max_sprint" };
  return { reps: 6, yards: 20, restSeconds: 20, kind: "repeat_sprint" };
}

/** Two-way split inside one budget: the minority kind may use at most 30% of the room left after warm-ups. */
export function minorityCap(room: number, focus: "pitcher" | "position" | null | undefined): { pitching: number; position: number } {
  if (focus === "pitcher") return { pitching: room, position: Math.floor(room * (1 - TWO_WAY_MAJOR_SHARE)) };
  if (focus === "position") return { pitching: Math.floor(room * (1 - TWO_WAY_MAJOR_SHARE)), position: room };
  return { pitching: room, position: room };
}

/** Week checks used by the simulations. Returns plain-word violations. */
export function weekViolations(sport: Sport, role: PitchRole, days: readonly { date: string; day: CycleDay }[]): string[] {
  const out: string[] = [];
  const mound = days.filter((d) => moundWork(sport, d.day)).length;
  if (mound < MOUND_MINIMUM_PER_WEEK) out.push(`only ${mound} ${sport === "softball" ? "circle" : "mound"} days`);
  for (let k = 1; k < days.length; k++) {
    const prev = days[k - 1].day, cur = days[k].day;
    if ((prev === "start" || prev === "outing") && cur !== "day_after") out.push(`${days[k].date}: no recovery day after outing`);
    if (role === "starter" && prev === "start" && k + 1 < days.length && !(days[k + 1].day === "rest" || (sport === "softball" && days[k + 1].day === "light_mound"))) out.push(`${days[k + 1].date}: second day after start not rest`);
    if (cur === "start" && prev !== "pre_start" && k > 0) out.push(`${days[k].date}: day before start not light`);
  }
  return out;
}
