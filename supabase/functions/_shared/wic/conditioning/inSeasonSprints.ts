/**
 * Owner Nov 5 round 3, Group B — IN-SEASON CONDITIONING FOR DENSE SCHEDULES. Locked (no drift).
 * Pure; shared by the app tests and wk-generate-daily. Position players only, in-season only.
 *
 * In-season the games are the conditioning and the speed work. Each game is CREDITED in
 * base-length sprints from the game log (or the morning check-in's at-bats answer, labeled an
 * estimate). Games count first toward the weekly load and the 2-a-week running floor; short
 * submax TOP-UPS (4–8 bases) fill a gap; ONE max-intent SPEED EXPOSURE (3–6 bases, full rest)
 * is placed each week on the lowest-load day. Never two hard sprint days in a row; readiness
 * still lightens. Off-season and pre-season keep positionSprints.ts (build-up to 20 a day).
 */

/**
 * Owner Nov 5 round 4 — OPTIMIZED IN-SEASON DEFAULTS (every value editable in the Coaching
 * Console under conditioning rules → `inSeason`). Reasons are reported to the owner.
 */
export interface InSeasonStandards {
  /** Max-effort base sprints on the weekly speed day (owner r4: 3, full rest). */
  speedSprints: number;
  /** Top-up = this share of the daily count, kept between topupMin and topupMax bases. */
  topupShare: number; topupMin: number; topupMax: number;
  /** A day counts toward the weekly running floor once it reaches this many bases. */
  runningDayBases: number;
  /** Weekly target = this many full days of the normal daily count. */
  weeklyTargetDays: number;
  /** A game at or above this share of the daily count is a heavy game. */
  heavyGameShare: number;
  /** Base-length sprint credit per defensive chance, by where the player played. */
  chanceOutfield: number; chanceMiddleInfield: number; chanceCornerCatcher: number;
  /** Morning at-bats estimate: default bases per plate appearance, and the logged plate appearances needed to use the player's own average. */
  basesPerPaDefault: number; ownAverageMinPa: number;
}
export const DEFAULT_IN_SEASON_STANDARDS: InSeasonStandards = {
  speedSprints: 3,
  topupShare: 0.5, topupMin: 4, topupMax: 8,
  runningDayBases: 4,
  weeklyTargetDays: 2,
  heavyGameShare: 0.6,
  chanceOutfield: 1, chanceMiddleInfield: 0.5, chanceCornerCatcher: 0.25,
  basesPerPaDefault: 1, ownAverageMinPa: 15,
};
export function inSeasonStandards(raw: unknown): InSeasonStandards {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_IN_SEASON_STANDARDS;
  const n = (k: keyof InSeasonStandards, lo: number, hi: number) => { const v = Number(o[k]); return Number.isFinite(v) && v >= lo && v <= hi ? v : d[k]; };
  const s: InSeasonStandards = {
    speedSprints: n("speedSprints", 1, 6), topupShare: n("topupShare", 0.1, 1), topupMin: n("topupMin", 1, 20), topupMax: n("topupMax", 1, 20),
    runningDayBases: n("runningDayBases", 1, 20), weeklyTargetDays: n("weeklyTargetDays", 1, 6), heavyGameShare: n("heavyGameShare", 0.1, 1),
    chanceOutfield: n("chanceOutfield", 0, 4), chanceMiddleInfield: n("chanceMiddleInfield", 0, 4), chanceCornerCatcher: n("chanceCornerCatcher", 0, 4),
    basesPerPaDefault: n("basesPerPaDefault", 0, 4), ownAverageMinPa: n("ownAverageMinPa", 1, 200),
  };
  if (s.topupMax < s.topupMin) { s.topupMin = d.topupMin; s.topupMax = d.topupMax; }
  return s;
}
const D = DEFAULT_IN_SEASON_STANDARDS;
export const TOPUP_MIN = D.topupMin;
export const TOPUP_MAX = D.topupMax;
/** Owner r4: the speed day is exactly 3 max-effort sprints (kept short). */
export const SPEED_MIN = D.speedSprints;
export const SPEED_MAX = D.speedSprints;
/** A game at or above this share of capacity is a HEAVY game (next day = flush only). */
export const HEAVY_GAME_SHARE = D.heavyGameShare;
/** Running sessions required per week (existing 2-a-week floor). */
export const WEEKLY_RUNNING_FLOOR = 2;

/** Bases reached on the hit itself (running out the play). */
const RESULT_BASES: Record<string, number> = {
  "1B": 1, "SINGLE": 1, "BB": 1, "WALK": 1, "IBB": 1, "HBP": 1, "E": 1, "ROE": 1, "FC": 1,
  "2B": 2, "DOUBLE": 2, "3B": 3, "TRIPLE": 3, "HR": 4, "HOME_RUN": 4,
};
export const resultBases = (r: string | null | undefined) => RESULT_BASES[String(r ?? "").trim().toUpperCase()] ?? 0;

/** Credit for one defensive chance by position: outfield runs farthest, catcher/1B/pitcher least. */
export function chanceCredit(position: string | null | undefined, std: InSeasonStandards = D): number {
  const p = String(position ?? "").trim().toUpperCase();
  if (["LF", "CF", "RF", "OF"].includes(p)) return std.chanceOutfield;
  if (["C", "1B", "P"].includes(p)) return std.chanceCornerCatcher;
  return std.chanceMiddleInfield; // 2B/SS/3B and unknown
}

export interface GameLogFacts {
  date: string;
  /** gp_at_bats.result for this game (empty when nothing logged). */
  atBatResults: readonly (string | null)[];
  /** gp_baserun_events for this game. */
  baserun: readonly { event_type: string | null; base_from: number | null; base_to: number | null }[];
  /** gp_defense_plays rows (each a defensive chance). */
  defenseChances: number;
  /** Position of each defensive chance, when known (weights the chance). */
  defensePositions?: readonly (string | null)[];
  /** Morning check-in answer, used only when no at-bats are logged. */
  selfReportedAtBats: number | null;
  /** The player's own logged bases per plate appearance (null = not enough logs → default). */
  ownBasesPerPa?: number | null;
}

export interface GameCredit { date: string; bases: number; source: "log" | "estimate" | "unknown" }

function baserunBases(baserun: GameLogFacts["baserun"]): number {
  let b = 0;
  for (const e of baserun) {
    const from = Number(e.base_from), to = Number(e.base_to);
    if (e.base_from != null && e.base_to != null && Number.isFinite(from) && Number.isFinite(to) && to > from) b += to - from;
    else if (String(e.event_type ?? "").toLowerCase().includes("steal")) b += 1;
  }
  return b;
}

/**
 * The player's own bases per plate appearance from logged games (bases reached on the at-bat plus
 * bases run afterwards). Null until they have `ownAverageMinPa` logged plate appearances.
 */
export function ownBasesPerPa(atBatResults: readonly (string | null)[], baserun: GameLogFacts["baserun"], std: InSeasonStandards = D): number | null {
  const pa = atBatResults.filter((r) => r != null && String(r).trim() !== "").length;
  if (pa < std.ownAverageMinPa) return null;
  let b = baserunBases(baserun);
  for (const r of atBatResults) b += resultBases(r);
  return Math.round((b / pa) * 100) / 100;
}

/**
 * Base-length sprints one game put on the player.
 * Log: bases reached on each at-bat + every base advanced on the bases (a caught-stealing attempt
 * still ran one base) + each defensive chance weighted by position.
 * No logged at-bats: the morning at-bats answer × the player's own bases per plate appearance
 * (or the default) — an estimate. Neither: unknown (0 toward the floor, heavy for recovery).
 */
export function gameCredit(g: GameLogFacts, std: InSeasonStandards = D): GameCredit {
  const logged = g.atBatResults.filter((r) => r != null).length > 0 || g.baserun.length > 0 || g.defenseChances > 0;
  if (logged) {
    let b = baserunBases(g.baserun);
    for (const r of g.atBatResults) b += resultBases(r);
    const pos = g.defensePositions ?? [];
    for (let i = 0; i < Math.max(0, g.defenseChances); i++) b += chanceCredit(pos[i] ?? null, std);
    return { date: g.date, bases: Math.round(b * 100) / 100, source: "log" };
  }
  if (g.selfReportedAtBats != null && g.selfReportedAtBats >= 0) {
    const per = g.ownBasesPerPa != null && Number.isFinite(g.ownBasesPerPa) ? g.ownBasesPerPa : std.basesPerPaDefault;
    return { date: g.date, bases: Math.round(g.selfReportedAtBats * per * 100) / 100, source: "estimate" };
  }
  return { date: g.date, bases: 0, source: "unknown" };
}

/** A doubleheader counts both games: credits for one date are summed. */
export function dayCredit(credits: readonly GameCredit[], date: string): GameCredit | null {
  const own = credits.filter((c) => c.date === date);
  if (!own.length) return null;
  const source = own.some((c) => c.source === "unknown") ? "unknown" : own.some((c) => c.source === "estimate") ? "estimate" : "log";
  return { date, bases: own.reduce((n, c) => n + c.bases, 0), source };
}

export const isHeavyGame = (c: GameCredit | null, capacity: number, std: InSeasonStandards = D) =>
  !!c && (c.source === "unknown" || c.bases >= Math.max(1, Math.ceil(capacity * std.heavyGameShare)));

/** A day's running counts toward the 2-a-week floor once it reaches the running-day threshold. */
export const countsAsRunningSession = (bases: number, std: InSeasonStandards = D) => bases >= std.runningDayBases;

/** Weekly in-season target: N full days of the normal daily count — games count first. */
export const weeklyTarget = (capacity: number, std: InSeasonStandards = D) => std.weeklyTargetDays * Math.max(0, capacity);

/** Owner r4: the speed day is short — a fixed number of max-effort sprints (default 3). */
export const speedBases = (_capacity: number, std: InSeasonStandards = D) => std.speedSprints;

export const topupBases = (capacity: number, std: InSeasonStandards = D) =>
  Math.min(std.topupMax, Math.max(std.topupMin, Math.floor(Math.max(0, capacity) * std.topupShare)));

/**
 * Owner r4 item 1: the proper progressive sprint prep that must END the warm-up before any
 * max-effort sprint. Catalog slugs; the generator refuses max sprints if it can't place these.
 */
export const SPRINT_PREP = [
  { slug: "wu_a_skip", label: "A-skips, then ankle dribbles", dose: "2 x 20 yd each", effort: "easy rhythm" },
  { slug: "build_up_sprint", label: "Build-ups", dose: "3 runs: about 60%, then 75%, then 90%", effort: "60% → 75% → 90%" },
] as const;
export const SPRINT_PREP_SLUGS = SPRINT_PREP.map((p) => p.slug);

/**
 * Places the sprint prep directly before the first max-effort sprint row. Returns null when the
 * prep can't be placed (missing catalog drill) — then max sprints must not be prescribed.
 */
export function withSprintPrep<R extends { movement_slug: string }>(
  rows: readonly R[], isMaxSprint: (r: R) => boolean, makePrep: (p: (typeof SPRINT_PREP)[number]) => R | null,
): R[] | null {
  const at = rows.findIndex(isMaxSprint);
  if (at < 0) return [...rows];
  const have = new Set(rows.slice(0, at).map((r) => r.movement_slug));
  const missing = SPRINT_PREP.filter((p) => !have.has(p.slug));
  const prep: R[] = [];
  for (const p of missing) { const r = makePrep(p); if (!r) return null; prep.push(r); }
  return [...rows.slice(0, at), ...prep, ...rows.slice(at)];
}
/** Validator: every max sprint is preceded (in order) by every sprint-prep item. */
export function sprintPrepOk(rows: readonly { movement_slug: string }[], isMaxSprint: (r: any) => boolean): boolean {
  const at = rows.findIndex(isMaxSprint);
  if (at < 0) return true;
  const before = rows.slice(0, at).map((r) => r.movement_slug);
  const ia = before.indexOf(SPRINT_PREP_SLUGS[0]), ib = before.indexOf(SPRINT_PREP_SLUGS[1]);
  return ia >= 0 && ib > ia;
}

/** Owner r4 item 3: the base route a top-up adds when the day has no base sprint (one base per rep). */
export const topupRouteSlug = (sport: "baseball" | "softball") => sport === "softball" ? "bases_single_sb" : "repeat_90ft_bb";
/** Day kinds that may add a short base-sprint item when the day has none (never before a game / after a heavy game — those kinds never get here). */
export const ADDS_ROW_KINDS: ReadonlySet<string> = new Set(["topup", "low_readiness", "speed"]);

/**
 * Lightest-load score for choosing the week's speed day (lower = lighter): a game the day before
 * weighs 1, a game the day after weighs 0.5. Ties go to the earlier day.
 */
export const dayLoadScore = (gameYesterday: boolean, gameTomorrow: boolean) => (gameYesterday ? 1 : 0) + (gameTomorrow ? 0.5 : 0);

export type InSeasonKind = "game" | "flush" | "speed" | "topup" | "normal" | "pre_game_half" | "low_readiness" | "none";

export interface InSeasonFacts {
  gameToday: boolean;
  gameTomorrow: boolean;
  /** Yesterday's game credit (null = no game yesterday). */
  yesterdayGame: GameCredit | null;
  /** Yesterday was a hard sprint day (speed exposure or ≥ high-day share). */
  hardYesterday: boolean;
  lowReadiness: boolean;
  /** This week so far (Mon..yesterday): credited game + planned bases, running sessions, speed done. */
  weekBases: number;
  weekRunningSessions: number;
  speedDoneThisWeek: boolean;
  /** Remaining days this week after today (to the rest day) that could still host the speed exposure. */
  laterSpeedChances: number;
  /** Remaining days this week after today that could still host a top-up. */
  laterTopupChances: number;
}

export interface InSeasonDay { kind: InSeasonKind; bases: number; maxIntent: boolean; flush: boolean; because: string }

/** Can this day host the weekly speed exposure? (lowest-load day: off day, no game tomorrow, or after a light game) */
export function speedEligible(f: Pick<InSeasonFacts, "gameToday" | "gameTomorrow" | "yesterdayGame" | "hardYesterday" | "lowReadiness">, capacity: number): "ideal" | "fallback" | false {
  if (f.gameToday || f.hardYesterday || f.lowReadiness || isHeavyGame(f.yesterdayGame, capacity)) return false;
  if (!f.gameTomorrow) return "ideal";
  if (f.yesterdayGame) return "ideal"; // after a light game
  return "fallback"; // off day before a game: only when it's the week's last chance
}

/** Can this day host a submax top-up? Never before a game, never the day after a heavy game. */
export function topupEligible(f: Pick<InSeasonFacts, "gameToday" | "gameTomorrow" | "yesterdayGame">, capacity: number): boolean {
  if (f.gameToday || f.gameTomorrow) return false;
  return !isHeavyGame(f.yesterdayGame, capacity);
}

export function inSeasonSprintDay(capacity: number, f: InSeasonFacts): InSeasonDay {
  const cap = Math.max(0, capacity);
  if (f.gameToday) return { kind: "game", bases: 0, maxIntent: false, flush: true, because: "Game today: your game's base running is today's sprint work. Easy flush jog after the game." };
  if (isHeavyGame(f.yesterdayGame, cap)) return { kind: "flush", bases: 0, maxIntent: false, flush: true, because: f.yesterdayGame?.source === "unknown"
    ? "Day after your game (not logged yet): easy flush only. Log the game so your plan can count it."
    : `You ran about ${f.yesterdayGame!.bases} bases in yesterday's game: easy flush only today.` };

  const floorGap = Math.max(0, WEEKLY_RUNNING_FLOOR - f.weekRunningSessions);
  const sp = speedEligible(f, cap);
  if (!f.speedDoneThisWeek && (sp === "ideal" || (sp === "fallback" && f.laterSpeedChances === 0))) {
    const b = speedBases(cap);
    return { kind: "speed", bases: b, maxIntent: true, flush: false, because: `Your one speed day this week: ${b} all-out base sprints with full rest. Games rarely make you run all-out, so this keeps your speed.` };
  }
  if (f.lowReadiness) {
    if (topupEligible(f, cap) && floorGap > 0) return { kind: "low_readiness", bases: TOPUP_MIN, maxIntent: false, flush: false, because: `Your body needs a lighter day: ${TOPUP_MIN} easy base sprints to keep your weekly running on track.` };
    return { kind: "low_readiness", bases: 0, maxIntent: false, flush: true, because: "Your body needs a lighter day: easy flush only." };
  }
  if (!f.gameTomorrow && !f.yesterdayGame) {
    // True off day with no game tomorrow: normal capacity work (hard yesterday → submax top-up size).
    if (f.hardYesterday) return topup(cap, f, "You ran hard yesterday, so today's sprints are easy (not all-out).");
    return { kind: "normal", bases: cap, maxIntent: false, flush: false, because: `Off day with no game tomorrow: ${cap} base-length sprints to keep you game-ready.` };
  }
  if (!f.gameTomorrow && f.yesterdayGame) {
    // Day after a light game: normal work allowed.
    return { kind: "normal", bases: f.hardYesterday ? Math.min(cap, TOPUP_MAX) : cap, maxIntent: false, flush: false,
      because: `Yesterday's game was light (about ${f.yesterdayGame.bases} bases), so normal running today.` };
  }
  // Game tomorrow, no game today.
  if (!f.yesterdayGame) {
    // Day before a game applies only when the player did NOT play yesterday.
    const half = Math.floor(cap / 2);
    if (floorGap > 0 && f.laterTopupChances === 0) return { kind: "pre_game_half", bases: Math.max(TOPUP_MIN, half), maxIntent: false, flush: false, because: `Game tomorrow: a lighter day, ${Math.max(TOPUP_MIN, half)} easy base sprints.` };
    return { kind: "pre_game_half", bases: half, maxIntent: false, flush: false, because: `Game tomorrow: a lighter day, ${half} easy base sprints.` };
  }
  return { kind: "none", bases: 0, maxIntent: false, flush: false, because: "Games are setting your running this week, so no extra sprints today." };
}

function topup(cap: number, f: InSeasonFacts, lead: string): InSeasonDay {
  const left = Math.max(0, weeklyTarget(cap) - f.weekBases);
  const b = Math.min(TOPUP_MAX, Math.max(TOPUP_MIN, Math.min(cap, left)));
  return { kind: "topup", bases: b, maxIntent: false, flush: false, because: `${lead} ${b} base sprints at about 80% effort.` };
}

/**
 * Post-game top-up for a LIGHT game (didn't play / few at-bats): the card is planned before the game,
 * so it is conditional — done only if the game's running stayed under a heavy game.
 */
export function postGameTopup(capacity: number, weekRunningSessions: number): { bases: number; because: string } | null {
  if (weekRunningSessions >= WEEKLY_RUNNING_FLOOR) return null;
  const b = Math.min(TOPUP_MAX, Math.max(TOPUP_MIN, Math.floor(capacity / 2)));
  return { bases: b, because: `If you didn't play or ran fewer than ${Math.ceil(capacity * HEAVY_GAME_SHARE)} bases in today's game: ${b} easy base sprints after it.` };
}
