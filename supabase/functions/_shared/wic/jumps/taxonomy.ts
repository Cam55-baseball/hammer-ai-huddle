/**
 * Owner Nov 1 round 6 — JUMP TRAINING CLASSIFICATION, TAGGING AND PROGRESSION.
 * ONE structure for the database columns (wk_movement_catalog.jump_*), the admin editor
 * and the programming engine. Pure; shared by the app and the server.
 *
 * Built ON TOP of the written rules, never replacing them: the jump tiers T1–T3
 * (plyo_tier), plyo contact limits, age gates, Growth Mode and the stop-the-set
 * quality gate all still apply first. This layer only narrows the choice further.
 */

export const JUMP_CLASSES = ["landing_skill", "force_absorption", "force_production", "reactive", "maximal_expression", "coordination"] as const;
export const JUMP_MECHANICS = ["eccentric", "concentric", "isometric", "ssc", "reactive", "repeated_elastic"] as const;
export const JUMP_INTENSITIES = ["low", "moderate", "high", "maximal"] as const;
export const JUMP_DIRECTIONS = ["vertical", "horizontal", "lateral", "rotational", "multidirectional"] as const;
export const JUMP_STANCES = ["bilateral", "unilateral", "alternating"] as const;
export const JUMP_EXECUTIONS = ["single", "repeated", "continuous", "reactive_rebound", "stick"] as const;
export const JUMP_LANDINGS = ["controlled", "stick", "rebound", "reactive_rebound"] as const;
export const JUMP_LOADS = ["bodyweight", "light", "loaded"] as const;
export const JUMP_OBJECTIVES = ["force_absorption", "force_production", "reactive_strength", "elasticity", "coordination", "maximal_expression", "landing_control", "multidirectional_power"] as const;
export const JUMP_LEVELS = ["introduction", "foundation", "intermediate", "advanced", "elite"] as const;
/** How ground contacts are counted from reps. */
export const CONTACT_METHODS = ["per_rep", "per_landing", "each_side", "per_rep_x"] as const;
export const JUMP_SPORTS = ["baseball", "softball", "general"] as const;
export const JUMP_ROLES = ["pitcher", "catcher", "infielder", "outfielder", "hitter", "thrower", "runner"] as const;

export type JumpClass = typeof JUMP_CLASSES[number];
export type JumpMechanic = typeof JUMP_MECHANICS[number];
export type JumpIntensity = typeof JUMP_INTENSITIES[number];
export type JumpDirection = typeof JUMP_DIRECTIONS[number];
export type JumpStance = typeof JUMP_STANCES[number];
export type JumpExecution = typeof JUMP_EXECUTIONS[number];
export type JumpLanding = typeof JUMP_LANDINGS[number];
export type JumpLoad = typeof JUMP_LOADS[number];
export type JumpObjective = typeof JUMP_OBJECTIVES[number];
export type JumpLevel = typeof JUMP_LEVELS[number];
export type ContactMethod = typeof CONTACT_METHODS[number];

export const JUMP_LABELS: Record<string, string> = {
  landing_skill: "Jump & Landing Skill", force_absorption: "Force Absorption", force_production: "Force Production",
  reactive: "Reactive / Plyometric", maximal_expression: "Maximal Jump Expression", coordination: "Jump Coordination",
  eccentric: "Eccentric Dominant", concentric: "Concentric Dominant", isometric: "Isometric Emphasis", ssc: "Stretch-Shortening Cycle",
  repeated_elastic: "Repeated Elastic Contact",
  low: "Low", moderate: "Moderate", high: "High", maximal: "Maximal Intent",
  vertical: "Vertical", horizontal: "Horizontal", lateral: "Lateral", rotational: "Rotational", multidirectional: "Multidirectional",
  bilateral: "Bilateral", unilateral: "Unilateral", alternating: "Alternating",
  single: "Single Effort", repeated: "Repeated", continuous: "Continuous", reactive_rebound: "Reactive Rebound", stick: "Stick Landing",
  controlled: "Controlled", rebound: "Rebound",
  bodyweight: "Bodyweight", light: "Lightly Loaded", loaded: "Loaded",
  reactive_strength: "Reactive Strength", elasticity: "Elasticity", maximal_expression_obj: "Maximal Jump Expression",
  landing_control: "Landing Control", multidirectional_power: "Multidirectional Power",
  introduction: "Introduction", foundation: "Foundation", intermediate: "Intermediate", advanced: "Advanced", elite: "Elite Performance",
  per_rep: "1 per rep", per_landing: "1 per landing (each hop counts)", each_side: "Reps are per side (×2)", per_rep_x: "Uses contacts per rep",
  baseball: "Baseball", softball: "Softball", general: "General Athlete",
  pitcher: "Pitcher", catcher: "Catcher", infielder: "Infielder", outfielder: "Outfielder", hitter: "Hitter", thrower: "Thrower", runner: "Runner",
};

/** Database row shape (wk_movement_catalog jump_* columns + the written fields it builds on). */
export interface JumpRow {
  slug: string;
  name: string;
  plyo_tier?: number | null;
  contacts_per_rep?: number | null;
  min_age_years?: number | null;
  default_sets?: number | null;
  default_reps?: number | null;
  jump_class?: string[] | null;
  jump_mechanics?: string[] | null;
  jump_intensity?: string | null;
  jump_direction?: string[] | null;
  jump_stance?: string | null;
  jump_execution?: string | null;
  jump_landing_strategy?: string | null;
  jump_load?: string | null;
  jump_objectives?: string[] | null;
  jump_level?: string | null;
  jump_min_readiness?: number | null;
  contact_method?: string | null;
  jump_sport_tags?: string[] | null;
  jump_role_tags?: string[] | null;
  jump_rest_seconds?: number | null;
}

export const levelIndex = (l: string | null | undefined): number => {
  const i = JUMP_LEVELS.indexOf((l ?? "") as JumpLevel);
  return i < 0 ? -1 : i;
};
export const isTaggedJump = (r: JumpRow): boolean => levelIndex(r.jump_level) >= 0 && (r.jump_class?.length ?? 0) > 0;

/** Ground contacts for one prescribed row, by the exercise's own counting method. */
export function jumpContacts(r: Pick<JumpRow, "contact_method" | "contacts_per_rep">, sets: number, reps: number): number {
  const s = Math.max(0, sets), n = Math.max(0, reps);
  switch (r.contact_method) {
    case "each_side": return s * n * 2;
    case "per_rep_x": return s * n * Math.max(1, Number(r.contacts_per_rep ?? 1));
    case "per_landing": case "per_rep": return s * n;
    default: return s * n * Math.max(1, Number(r.contacts_per_rep ?? 1)); // untagged: the written field
  }
}

// ---------- Beginner rule (owner): lowest-level jumps only, ~20–25 contacts ----------
export const BEGINNER_CONTACTS = { min: 20, max: 25 } as const;
/** Owner examples: 2 × 2 × 5 = 20; 2 × 2 × 6 = 24; 3 × 2 × 4 = 24 (exercises × sets × reps). */
export const BEGINNER_PATTERNS: ReadonlyArray<{ exercises: number; sets: number; reps: number }> = [
  { exercises: 2, sets: 2, reps: 6 }, { exercises: 3, sets: 2, reps: 4 }, { exercises: 2, sets: 2, reps: 5 },
];

/** Never for an athlete without foundational competency (owner §4). */
export function beginnerForbidden(r: JumpRow): string | null {
  if ((r.plyo_tier ?? 1) >= 2) return "above the first jump tier";
  if (r.jump_class?.includes("reactive") && r.jump_intensity !== "low") return "advanced reactive jump";
  if (/depth/.test(r.slug)) return "depth jump";
  if (r.jump_intensity === "maximal" || r.jump_class?.includes("maximal_expression")) return "maximal jump";
  if (r.jump_stance === "unilateral" && r.jump_intensity !== "low") return "high-impact single-leg jump";
  if (r.jump_load && r.jump_load !== "bodyweight") return "loaded jump";
  return null;
}

export interface JumpAthlete {
  /** Current competency level (from logging); the starting answer "Never" = introduction. */
  level: JumpLevel;
  /** 0–1 today's readiness, null unknown (unknown never unlocks a readiness-gated jump). */
  readiness: number | null;
  sport: "baseball" | "softball";
  roles?: readonly string[];
  /** Last session's landing quality dropped → beginner target goes to the low end. */
  qualityDropped?: boolean;
}

/** Is this exercise allowed for this athlete at all (after the written tier/age/Growth rules)? */
export function jumpEligible(r: JumpRow, a: JumpAthlete): boolean {
  if (!isTaggedJump(r)) return false;
  if (levelIndex(r.jump_level) > levelIndex(a.level)) return false;
  const minR = r.jump_min_readiness ?? null;
  if (minR != null && minR > 0 && (a.readiness == null || a.readiness < minR)) return false;
  if (levelIndex(a.level) <= 0 && beginnerForbidden(r)) return false;
  if (r.jump_load === "loaded" && levelIndex(a.level) < levelIndex("advanced")) return false;
  return true;
}

/** Rank eligible jumps for an objective; sport and role tags RANK, never restrict (owner §7). */
export function rankJumps(pool: readonly JumpRow[], a: JumpAthlete, objective?: JumpObjective | null): JumpRow[] {
  const score = (r: JumpRow) =>
    (objective && r.jump_objectives?.includes(objective) ? 10 : 0)
    + (r.jump_sport_tags?.includes(a.sport) ? 2 : 0)
    + ((a.roles ?? []).some((x) => r.jump_role_tags?.includes(x)) ? 2 : 0)
    + (levelIndex(r.jump_level) === levelIndex(a.level) ? 1 : 0); // working level first, easier ones behind
  return pool.filter((r) => jumpEligible(r, a)).map((r, i) => ({ r, i, s: score(r) })).sort((x, y) => y.s - x.s || x.i - y.i).map((x) => x.r);
}

export interface JumpDose { slug: string; name: string; sets: number; reps: number; contacts: number }

/**
 * Beginner session: introduction-level jumps only, ~20–25 contacts as a target (not a minimum).
 * Uses the owner's patterns; one-landing-per-rep counting so the total is exact.
 * Quality dropped last time → the 20-contact pattern.
 */
export function beginnerSession(pool: readonly JumpRow[], a: JumpAthlete, day = 0): JumpDose[] {
  const intro = pool.filter((r) => isTaggedJump(r) && r.jump_level === "introduction" && !beginnerForbidden(r) && jumpEligible(r, { ...a, level: "introduction" }));
  if (!intro.length) return [];
  const patterns = a.qualityDropped ? [BEGINNER_PATTERNS[2]] : BEGINNER_PATTERNS;
  const sorted = [...intro].sort((x, y) => x.slug.localeCompare(y.slug));
  for (const p of patterns) {
    if (sorted.length < p.exercises) continue;
    const start = Math.abs(day) % sorted.length;
    const picks = Array.from({ length: p.exercises }, (_, k) => sorted[(start + k) % sorted.length]);
    // reps are per contact: each_side reps halve so contacts stay on target
    const out = picks.map((r) => {
      const reps = r.contact_method === "each_side" ? Math.max(1, Math.round(p.reps / 2)) : p.reps;
      return { slug: r.slug, name: r.name, sets: p.sets, reps, contacts: jumpContacts(r, p.sets, reps) };
    });
    const total = out.reduce((s, d) => s + d.contacts, 0);
    if (total >= BEGINNER_CONTACTS.min - 2 && total <= BEGINNER_CONTACTS.max) return out;
  }
  const r = sorted[0];
  return [{ slug: r.slug, name: r.name, sets: 2, reps: 10, contacts: jumpContacts(r, 2, 10) }];
}

// ---------- Competency step-up (owner round 6) ----------
export type LandingRating = "solid" | "wobble" | "sloppy";
export interface JumpSession { date: string; ratings: LandingRating[] }
/** A session is SOLID: no "Sloppy" set and at most one "Some wobble". */
export const solidSession = (s: JumpSession) => s.ratings.length > 0 && !s.ratings.includes("sloppy") && s.ratings.filter((x) => x === "wobble").length <= 1;
export const sloppySession = (s: JumpSession) => s.ratings.includes("sloppy");

export interface JumpCompetency { level: JumpLevel; change: -1 | 0 | 1; because: string }

/**
 * Walk finished weeks (oldest → newest). A week steps up ONE level only when it is a
 * greenlight GREEN week AND the last 2 rated sessions up to that week are SOLID in a row.
 * Any session with a "Sloppy" set in the week steps back one level (never below introduction).
 * Everything else holds. Never moves more than one level a week; intensity, complexity
 * and volume never rise together because volume is set by level, not by the last session.
 */
export function jumpCompetency(start: JumpLevel, weeks: ReadonlyArray<{ weekStart: string; green: boolean; sessions: JumpSession[] }>, held = false): JumpCompetency {
  let i = levelIndex(start), change: -1 | 0 | 1 = 0, last: "up" | "down" | "hold" | "none" = "none";
  const history: JumpSession[] = [];
  for (const w of weeks) {
    change = 0;
    const sessions = [...w.sessions].sort((a, b) => a.date.localeCompare(b.date));
    history.push(...sessions);
    if (sessions.some(sloppySession)) { if (i > 0) { i -= 1; change = -1; } last = "down"; continue; }
    const rated = history.filter((s) => s.ratings.length > 0);
    const lastTwo = rated.slice(-2);
    if (!held && w.green && lastTwo.length === 2 && lastTwo.every(solidSession) && i < JUMP_LEVELS.length - 1) { i += 1; change = 1; last = "up"; }
    else last = "hold";
  }
  const level = JUMP_LEVELS[Math.max(0, i)];
  const L = JUMP_LABELS[level];
  const because = held ? `Because: the step-up check isn't on, so your jumps stay at ${L}.`
    : last === "up" ? `Because: you had a green week and 2 sessions in a row of solid landings, so your jumps step up to ${L}.`
    : last === "down" ? `Because: some landings were sloppy, so your jumps step back to ${L} until they're solid again.`
    : last === "hold" ? `Because: to step up you need a green week plus 2 sessions in a row of solid landings. Your jumps stay at ${L}.`
    : `Because: no rated jump week yet, so your jumps start at ${L}.`;
  return { level, change, because };
}

/** Starting level from the "Where are you starting from?" answer + the written tier already earned. */
export function jumpStartLevel(answer: "easiest" | "written" | null, earnedTier: 1 | 2 | 3 | null): JumpLevel {
  if (answer === "easiest") return "introduction";
  if (earnedTier === 3) return "advanced";
  if (earnedTier === 2) return "intermediate";
  return "foundation";
}

// ---------- Workload (owner §8) ----------
export interface JumpWorkload {
  total: number;
  byIntensity: Record<JumpIntensity | "untagged", number>;
  byDirection: Record<string, number>;
  unilateral: number;
  bilateral: number;
  reactive: number;
  nonReactive: number;
  /** Managed separately: high-intensity reactive and maximal contacts. */
  highReactive: number;
  maximal: number;
  byExercise: Record<string, number>;
}
export function jumpWorkload(rows: ReadonlyArray<{ row: JumpRow; sets: number; reps: number }>): JumpWorkload {
  const w: JumpWorkload = { total: 0, byIntensity: { low: 0, moderate: 0, high: 0, maximal: 0, untagged: 0 }, byDirection: {}, unilateral: 0, bilateral: 0, reactive: 0, nonReactive: 0, highReactive: 0, maximal: 0, byExercise: {} };
  for (const { row, sets, reps } of rows) {
    const c = jumpContacts(row, sets, reps);
    w.total += c;
    w.byExercise[row.slug] = (w.byExercise[row.slug] ?? 0) + c;
    const it = (JUMP_INTENSITIES as readonly string[]).includes(row.jump_intensity ?? "") ? row.jump_intensity as JumpIntensity : "untagged";
    w.byIntensity[it] += c;
    for (const d of row.jump_direction ?? []) w.byDirection[d] = (w.byDirection[d] ?? 0) + c;
    if (row.jump_stance === "bilateral") w.bilateral += c; else if (row.jump_stance) w.unilateral += c;
    const reactive = !!row.jump_class?.includes("reactive") || !!row.jump_mechanics?.includes("reactive");
    if (reactive) w.reactive += c; else w.nonReactive += c;
    if (reactive && (it === "high" || it === "maximal")) w.highReactive += c;
    if (it === "maximal" || row.jump_class?.includes("maximal_expression")) w.maximal += c;
  }
  return w;
}

/** Validate a tag edit against the vocabulary (+ admin-added extra values). Returns problems. */
export function jumpTagProblems(t: Partial<JumpRow>, extra: Partial<Record<string, string[]>> = {}): string[] {
  const out: string[] = [];
  const many = (k: keyof JumpRow, base: readonly string[]) => { for (const v of (t[k] as string[] | null | undefined) ?? []) if (![...base, ...(extra[k as string] ?? [])].includes(v)) out.push(`${String(k)}: ${v}`); };
  const one = (k: keyof JumpRow, base: readonly string[]) => { const v = t[k] as string | null | undefined; if (v && ![...base, ...(extra[k as string] ?? [])].includes(v)) out.push(`${String(k)}: ${v}`); };
  many("jump_class", JUMP_CLASSES); many("jump_mechanics", JUMP_MECHANICS); many("jump_direction", JUMP_DIRECTIONS);
  many("jump_objectives", JUMP_OBJECTIVES); many("jump_sport_tags", JUMP_SPORTS); many("jump_role_tags", JUMP_ROLES);
  one("jump_intensity", JUMP_INTENSITIES); one("jump_stance", JUMP_STANCES); one("jump_execution", JUMP_EXECUTIONS);
  one("jump_landing_strategy", JUMP_LANDINGS); one("jump_load", JUMP_LOADS); one("jump_level", JUMP_LEVELS); one("contact_method", CONTACT_METHODS);
  if (t.jump_min_readiness != null && !(t.jump_min_readiness >= 0 && t.jump_min_readiness <= 1)) out.push("jump_min_readiness: 0–1");
  return out;
}
