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

export const TOPUP_MIN = 4;
export const TOPUP_MAX = 8;
export const SPEED_MIN = 3;
export const SPEED_MAX = 6;
/** A game at or above this share of capacity is a HEAVY game (next day = flush only). */
export const HEAVY_GAME_SHARE = 0.6;
/** Running sessions required per week (existing 2-a-week floor). */
export const WEEKLY_RUNNING_FLOOR = 2;

/** Bases reached on the hit itself (running out the play). */
const RESULT_BASES: Record<string, number> = {
  "1B": 1, "SINGLE": 1, "BB": 1, "WALK": 1, "IBB": 1, "HBP": 1, "E": 1, "ROE": 1, "FC": 1,
  "2B": 2, "DOUBLE": 2, "3B": 3, "TRIPLE": 3, "HR": 4, "HOME_RUN": 4,
};

export interface GameLogFacts {
  date: string;
  /** gp_at_bats.result for this game (empty when nothing logged). */
  atBatResults: readonly (string | null)[];
  /** gp_baserun_events for this game. */
  baserun: readonly { event_type: string | null; base_from: number | null; base_to: number | null }[];
  /** gp_defense_plays rows (each a defensive chance). */
  defenseChances: number;
  /** Morning check-in answer, used only when no at-bats are logged. */
  selfReportedAtBats: number | null;
}

export interface GameCredit { date: string; bases: number; source: "log" | "estimate" | "unknown" }

/**
 * Base-length sprints one game put on the player.
 * Log: bases reached on each at-bat + every base advanced on the bases (steals, taking extra,
 * scoring; a caught-stealing attempt still ran one base) + one per defensive chance.
 * No logged at-bats: the morning at-bats answer, one base each (running it out) — an estimate.
 * Neither: unknown (credited 0 toward the floor, treated as heavy for recovery).
 */
export function gameCredit(g: GameLogFacts): GameCredit {
  const logged = g.atBatResults.filter((r) => r != null).length > 0 || g.baserun.length > 0 || g.defenseChances > 0;
  if (logged) {
    let b = 0;
    for (const r of g.atBatResults) b += RESULT_BASES[String(r ?? "").trim().toUpperCase()] ?? 0;
    for (const e of g.baserun) {
      const from = Number(e.base_from), to = Number(e.base_to);
      if (Number.isFinite(from) && Number.isFinite(to) && to > from) b += to - from;
      else if (String(e.event_type ?? "").toLowerCase().includes("steal")) b += 1;
    }
    b += Math.max(0, g.defenseChances);
    return { date: g.date, bases: b, source: "log" };
  }
  if (g.selfReportedAtBats != null && g.selfReportedAtBats >= 0) return { date: g.date, bases: g.selfReportedAtBats, source: "estimate" };
  return { date: g.date, bases: 0, source: "unknown" };
}

/** A doubleheader counts both games: credits for one date are summed. */
export function dayCredit(credits: readonly GameCredit[], date: string): GameCredit | null {
  const own = credits.filter((c) => c.date === date);
  if (!own.length) return null;
  const source = own.some((c) => c.source === "unknown") ? "unknown" : own.some((c) => c.source === "estimate") ? "estimate" : "log";
  return { date, bases: own.reduce((n, c) => n + c.bases, 0), source };
}

export const isHeavyGame = (c: GameCredit | null, capacity: number) =>
  !!c && (c.source === "unknown" || c.bases >= Math.max(1, Math.ceil(capacity * HEAVY_GAME_SHARE)));

/** A day's running counts toward the 2-a-week floor once it reaches a top-up's worth. */
export const countsAsRunningSession = (bases: number) => bases >= TOPUP_MIN;

/** Weekly in-season target: two capacity sessions (the running floor) — games count first. */
export const weeklyTarget = (capacity: number) => WEEKLY_RUNNING_FLOOR * Math.max(0, capacity);

export const speedBases = (capacity: number) => Math.min(SPEED_MAX, Math.max(SPEED_MIN, Math.floor(capacity / 3)));

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
