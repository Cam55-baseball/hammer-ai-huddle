/**
 * Owner Nov 1 rounds 3–4 — "WHERE ARE YOU STARTING FROM?" Pure; shared by app and server.
 * Owner-approved questions (round 3) and starting points (round 4). Subscription-specific
 * with no bleed-over; sport-specific wording. Logged history wins once an area has
 * 2 logged weeks in the last 28 days. The greenlight rule then steps each start up.
 */
import { GREENLIGHT_AREAS, type GreenlightArea } from "./greenlight.ts";

export type Sport = "baseball" | "softball";
export type Program = "pitcher" | "5tool" | "golden2way";
export type Category = "overall" | "throwing" | "pitching" | "hitting" | "defense" | "speed" | "lifting" | "jumps" | "bunting";

export interface Question { id: string; category: Category; label: string; options: readonly string[] }

export function programOf(sport: Sport, modules: readonly string[]): Program | null {
  if (modules.includes(`${sport}_golden2way`)) return "golden2way";
  if (modules.includes(`${sport}_5tool`)) return "5tool";
  if (modules.includes(`${sport}_pitcher`)) return "pitcher";
  return null;
}

/** Owner Nov 1 round 5: Golden 2Way must pick Pitcher or Position player first (no default). */
export function golden2wayRoleMissing(sport: Sport, modules: readonly string[], primaryFocus: string | null | undefined): boolean {
  return modules.includes(`${sport}_golden2way`) && primaryFocus !== "pitcher" && primaryFocus !== "position";
}

export function categoriesFor(program: Program): Category[] {
  const all: Category[] = ["overall", "throwing", "pitching", "hitting", "defense", "speed", "lifting", "jumps", "bunting"];
  if (program === "pitcher") return all.filter((c) => !["hitting", "defense", "bunting"].includes(c));
  if (program === "5tool") return all.filter((c) => c !== "pitching");
  return all;
}

const DISTANCE: Record<Sport, readonly string[]> = {
  baseball: ["Under 60 ft", "60–90 ft", "90–120 ft", "120–180 ft", "180+ ft"],
  softball: ["Under 40 ft", "40–60 ft", "60–90 ft", "90–150 ft", "150+ ft"],
};

export function questionsFor(sport: Sport, program: Program): Question[] {
  const sb = sport === "softball";
  const q: Question[] = [
    { id: "last_trained", category: "overall", label: "When did you last train 3+ days a week, consistently?", options: ["Right now", "1–2 weeks ago", "3–6 weeks ago", "2–6 months ago", "6+ months ago", "Never"] },
    { id: "throw_days", category: "throwing", label: "How many days a week do you throw right now?", options: ["0", "1–2", "3–4", "5–6"] },
    { id: "throws_per_day", category: "throwing", label: "On a normal day, how many throws (warm-ups count)?", options: ["0–25", "25–50", "50–75", "75–100", "100+"] },
    { id: "throw_distance", category: "throwing", label: "How far can you throw at about 70% effort with no pain?", options: DISTANCE[sport] },
    { id: "pitch_outings", category: "pitching", label: sb ? "How many bullpens or circle outings a week right now?" : "How many bullpens or outings a week right now?", options: ["0", "1", "2", "3+"] },
    { id: "pitch_last_count", category: "pitching", label: "How many pitches in your last one?", options: ["0–25", "25–50", "50–75", "75+"] },
    { id: "pitch_days_since", category: "pitching", label: "How many days since your last one?", options: ["0–3", "4–7", "8–13", "14+", "Never"] },
    { id: "hit_days", category: "hitting", label: "How many days a week do you swing a bat?", options: ["0", "1–2", "3–4", "5+"] },
    { id: "swings_per_session", category: "hitting", label: "How many swings in a session?", options: ["0–25", "25–50", "50–100", "100+"] },
    { id: "live_pitching", category: "hitting", label: sb ? "Have you faced live pitching or a machine lately?" : "Have you faced live pitching or a machine lately?", options: ["Yes", "No"] },
    { id: "defense_days", category: "defense", label: "How many days a week do you take ground balls or fly balls?", options: ["0", "1–2", "3–4", "5+"] },
    { id: "defense_reps", category: "defense", label: "How many reps in a session?", options: ["0–25", "25–50", "50–100", "100+"] },
    { id: "defense_throw_share", category: "defense", label: "About what share of those reps end with a throw?", options: ["0–25%", "25–50%", "50–75%", "75–100%"] },
    { id: "run_days", category: "speed", label: "How many days a week do you sprint or run?", options: ["0", "1–2", "3–4", "5+"] },
    { id: "sprint_volume", category: "speed", label: "How many sprint yards in a session?", options: ["None", "Under 200 yd", "200–500 yd", "500–1,000 yd"] },
    { id: "max_sprints", category: "speed", label: "Do you do all-out sprints regularly?", options: ["Yes", "No"] },
    { id: "lift_days", category: "lifting", label: "How many days a week do you lift right now?", options: ["0", "1", "2", "3+"] },
    { id: "lift_history", category: "lifting", label: "How long have you lifted consistently?", options: ["Never", "Under 6 months", "6–24 months", "2+ years"] },
    { id: "jumps", category: "jumps", label: "How often do you do jumps or plyos?", options: ["Never", "Sometimes", "Weekly"] },
    { id: "bunt_days", category: "bunting", label: "How many times a week do you practice bunting?", options: ["0", "1–2", "3+"] },
  ];
  const cats = new Set(categoriesFor(program));
  return q.filter((x) => cats.has(x.category));
}

export type Answers = Record<string, string>;

/** Every shown question answered with one of its options. */
export function answersComplete(sport: Sport, program: Program, a: Answers | null | undefined): boolean {
  if (!a) return false;
  return questionsFor(sport, program).every((q) => q.options.includes(a[q.id] ?? ""));
}

const THROW_SHARE: Record<string, number> = { "0–25%": 0.125, "25–50%": 0.375, "50–75%": 0.625, "75–100%": 0.875 };
/** Low end of each 70%-effort distance band (ft); "Under" starts at a short-toss distance. */
const DISTANCE_START_FT: Record<Sport, readonly number[]> = { baseball: [45, 60, 90, 120, 180], softball: [30, 40, 60, 90, 150] };

const MID: Record<string, number> = { "0": 0, "1": 1, "2": 2, "3+": 3, "1–2": 1.5, "3–4": 3.5, "5–6": 5.5, "5+": 5, "0–25": 12.5, "25–50": 37.5, "50–75": 62.5, "75–100": 87.5, "100+": 100, "50–100": 75, "75+": 75 };

/** "Last trained" → share of the answered amount; null = beginner level. */
export function recencyFactor(lastTrained: string | undefined): number | null {
  switch (lastTrained) {
    case "Right now": return 1;
    case "1–2 weeks ago": return 0.9;
    case "3–6 weeks ago": return 0.75;
    case "2–6 months ago": return 0.5;
    default: return null; // 6+ months or never → beginner level
  }
}

export interface StartingLevels {
  /** Starting raw throws for the week (used until throws are logged). */
  throwsPerWeek: number | null;
  /** Defense throws per week inside throwsPerWeek (defense throws count in the throw budget). */
  defenseThrowsPerWeek: number | null;
  /** Starting throwing distance (ft): low end of the 70%-effort, no-pain answer. */
  startThrowDistanceFt: number | null;
  /** Swings / defense reps per session. */
  swingsPerSession: number | null;
  defenseRepsPerSession: number | null;
  teeFirst: boolean;
  /** Sprint yards per session (pitchers stay inside their 1000-yd rule). */
  sprintYards: number | null;
  buildUpsFirstWeeks: number;
  lifting: "written" | "easing_back" | "foundation" | null;
  jumps: "easiest" | "written" | null;
  pitching: { flatGroundFirst: boolean; lastPitchCount: number | null } | null;
  /** Bunt reps per side (null = identity rules). */
  buntRepsPerSide: number | null;
  /** Plain words per area for Because lines. */
  why: Partial<Record<Category, string>>;
}

const EASING = "easing back in";

export function startingLevels(sport: Sport, program: Program, a: Answers, positionWeekLow: number | null): StartingLevels {
  const cats = new Set(categoriesFor(program));
  const f = recencyFactor(a.last_trained);
  const beginner = f === null;
  const why: Partial<Record<Category, string>> = {};
  const recencyWord = beginner ? "beginner level" : f === 1 ? "as you answered" : f === 0.5 ? `${EASING} (50% less)` : `${Math.round((1 - f) * 100)}% less because of your time off`;
  const scale = (n: number) => Math.round(n * (f ?? 1));

  let throwsPerWeek: number | null = null;
  if (cats.has("throwing")) {
    const days = MID[a.throw_days ?? ""] ?? 0;
    const perDay = MID[a.throws_per_day ?? ""] ?? 0;
    const half = positionWeekLow != null ? Math.round(positionWeekLow / 2) : null;
    throwsPerWeek = beginner || days === 0 ? half : scale(perDay * days);
    why.throwing = days === 0 || beginner ? "half the low end of your position's weekly range" : `about ${throwsPerWeek} throws a week (${recencyWord})`;
  }
  // Owner Nov 1 round 5: defense reps that end with a throw count in the starting throw budget.
  let defenseThrowsPerWeek: number | null = null;
  if (cats.has("defense") && cats.has("throwing")) {
    const share = THROW_SHARE[a.defense_throw_share ?? ""] ?? 0;
    const dDays = MID[a.defense_days ?? ""] ?? 0;
    const reps = beginner ? 12.5 : MID[a.defense_reps ?? ""] ?? 0;
    defenseThrowsPerWeek = Math.round(dDays * reps * share * (f ?? 1));
    if (defenseThrowsPerWeek > 0) {
      throwsPerWeek = (throwsPerWeek ?? 0) + defenseThrowsPerWeek;
      why.throwing = `${why.throwing ?? ""}, including about ${defenseThrowsPerWeek} defense throws`;
    }
  }
  let startThrowDistanceFt: number | null = null;
  if (cats.has("throwing")) {
    const i = DISTANCE[sport].indexOf(a.throw_distance ?? "");
    startThrowDistanceFt = i < 0 ? null : DISTANCE_START_FT[sport][i];
    if (startThrowDistanceFt != null) why.throwing = `${why.throwing}; longer throws start at about ${startThrowDistanceFt} ft at easy-to-medium effort`;
  }
  const lowest = (opts: string) => MID[opts] ?? 0;
  const swingsPerSession = cats.has("hitting") ? (beginner ? lowest("0–25") : scale(MID[a.swings_per_session ?? ""] ?? 0)) : null;
  const defenseRepsPerSession = cats.has("defense") ? (beginner ? lowest("0–25") : scale(MID[a.defense_reps ?? ""] ?? 0)) : null;
  if (swingsPerSession != null) why.hitting = `about ${swingsPerSession} swings a session (${recencyWord})`;
  if (defenseRepsPerSession != null) why.defense = `about ${defenseRepsPerSession} reps a session (${recencyWord})`;

  let sprintYards: number | null = null;
  let buildUpsFirstWeeks = 0;
  if (cats.has("speed")) {
    const base = beginner ? 40 : ({ "None": 40, "Under 200 yd": 200, "200–500 yd": 350, "500–1,000 yd": 700 } as Record<string, number>)[a.sprint_volume ?? ""] ?? 40;
    sprintYards = beginner || base === 40 ? 40 : scale(base);
    buildUpsFirstWeeks = a.max_sprints === "Yes" ? 0 : 2;
    why.speed = `about ${sprintYards} sprint yards a session${buildUpsFirstWeeks ? ", with 2 weeks of build-ups before all-out sprints" : ""}`;
  }

  let lifting: StartingLevels["lifting"] = null;
  if (cats.has("lifting")) {
    const h = a.lift_history;
    // Lifting's own history decides: never/<6 months → Foundation; lifting now → written; a break → easing back in.
    if (h === "Never" || h === "Under 6 months") lifting = "foundation";
    else lifting = a.lift_days !== "0" && f === 1 ? "written" : "easing_back";
    why.lifting = lifting === "foundation" ? "the beginner Foundation track" : lifting === "easing_back" ? `${EASING}: about 65–70% of your normal weight with the same sets, then about 5% more each green week` : "your normal written lifting";
  }
  const jumps = cats.has("jumps") ? (beginner || a.jumps === "Never" ? "easiest" : "written") : null;
  if (jumps) why.jumps = jumps === "easiest" ? "the easiest jumps with small counts" : "the written jump levels";

  let pitching: StartingLevels["pitching"] = null;
  if (cats.has("pitching")) {
    const since = a.pitch_days_since;
    const flat = beginner || since === "14+" || since === "Never";
    pitching = { flatGroundFirst: flat, lastPitchCount: flat ? null : (MID[a.pitch_last_count ?? ""] ?? null) };
    why.pitching = flat ? (sport === "softball" ? "flat ground, then shortbox, then circle bullpens" : "flat ground, then shortbox, then bullpens") : `your last pitch count (about ${pitching.lastPitchCount}), inside the arm rules`;
  }
  let buntRepsPerSide: number | null = null;
  if (cats.has("bunting")) {
    buntRepsPerSide = a.bunt_days === "0" || beginner ? 5 : a.bunt_days === "1–2" ? 7 : null;
    why.bunting = buntRepsPerSide ? `${buntRepsPerSide} bunts per side` : "your bunting identity rules";
  }
  return { throwsPerWeek, defenseThrowsPerWeek, startThrowDistanceFt, swingsPerSession, defenseRepsPerSession, teeFirst: cats.has("hitting") && a.live_pitching === "No", sprintYards, buildUpsFirstWeeks, lifting, jumps, pitching, buntRepsPerSide, why };
}

/** Logged history wins once an area has 2 logged weeks in the last 28 days. */
export const HISTORY_WEEKS_TO_WIN = 2;
export function historyWins(loggedWeeksLast28: number): boolean { return loggedWeeksLast28 >= HISTORY_WEEKS_TO_WIN; }

/** Owner Nov 1 round 5: easing back in starts at about 65–70% WEIGHT with the same sets. */
export const EASING_BACK_LIFT_SHARE = 0.675;
/** Easing back in steps up about 5% weight per green week until normal. */
export const EASING_BACK_LIFT_STEP = 0.05;

export type AreaStarts = Partial<Record<GreenlightArea, number>>;
export { GREENLIGHT_AREAS };
