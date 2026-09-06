/**
 * Game-proximity schedule enforcement (Pass B, item 2). Pure — no I/O.
 *
 * Three rules, and nothing else:
 *
 *   1. 48-hour window. No lift above primer intensity within 48 hours of a
 *      game, measured in real hours from the game's scheduled time. A game
 *      with no time defaults to 18:00 local, which is the conservative read
 *      (an evening game keeps the whole preceding day inside the window).
 *   2. Doubleheader. Two or more games on one date drop the CNS cap by one
 *      for that day AND the next.
 *   3. Starting pitcher. There is no starting-pitcher field on a roster, so a
 *      pitcher adjacent to a team game defaults to primer-level only. The
 *      athlete's own "I'm starting this game" mark removes the lift entirely.
 *
 * An athlete with no scheduled games gets `NO_SCHEDULE` — every field neutral,
 * so the generator behaves exactly as it did before this module existed.
 */

export const GAME_PROXIMITY_VERSION = "game_proximity_v1";

export interface ScheduledGame {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** HH:MM or HH:MM:SS, local. Null means unknown -> assumed 18:00. */
  time?: string | null;
  isStartingPitcher?: boolean | null;
  source: "gp_games" | "calendar_events";
}

export interface GameProximity {
  hasSchedule: boolean;
  /** Hours to the nearest game, absolute. Null when no game is in the window. */
  hoursToNearestGame: number | null;
  within48h: boolean;
  gamesToday: number;
  isDoubleheaderToday: boolean;
  isDayAfterDoubleheader: boolean;
  /** CNS cap adjustment, <= 0. */
  cnsCapDelta: number;
  /** Cap the whole lift to primer intensity. */
  primerOnly: boolean;
  /** Drop the lift entirely. */
  removeLift: boolean;
  /**
   * True when the game that drove this decision had no time on it, so 18:00
   * was assumed. The athlete should be told, because a noon game and a 7pm
   * game protect different days.
   */
  assumedGameTime: boolean;
  reasons: string[];
}

export const NO_SCHEDULE: GameProximity = {
  hasSchedule: false,
  hoursToNearestGame: null,
  within48h: false,
  gamesToday: 0,
  isDoubleheaderToday: false,
  isDayAfterDoubleheader: false,
  cnsCapDelta: 0,
  primerOnly: false,
  removeLift: false,
  assumedGameTime: false,
  reasons: [],
};

const DEFAULT_GAME_HOUR = 18;

export function hasExplicitTime(g: ScheduledGame): boolean {
  return /^(\d{1,2}):(\d{2})/.test(String(g.time ?? "").trim());
}

function gameInstant(g: ScheduledGame): number {
  const t = String(g.time ?? "").trim();
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  const hh = m ? Number(m[1]) : DEFAULT_GAME_HOUR;
  const mm = m ? Number(m[2]) : 0;
  return new Date(`${g.date}T00:00:00Z`).getTime() + (hh * 60 + mm) * 60000;
}

const isoAddDays = (iso: string, n: number) =>
  new Date(new Date(`${iso}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);

export function resolveGameProximity(
  games: readonly ScheduledGame[],
  planDate: string,
  opts: { isPitcher?: boolean } = {},
): GameProximity {
  if (!games || games.length === 0) return NO_SCHEDULE;

  const reasons: string[] = [];
  // The athlete's own day is anchored at noon: we are asking "how far is this
  // session from that game", and the session sits inside the day, not at 00:00.
  const sessionInstant = new Date(`${planDate}T12:00:00Z`).getTime();

  let nearest: number | null = null;
  let nearestAssumed = false;
  for (const g of games) {
    const h = Math.abs(gameInstant(g) - sessionInstant) / 3600000;
    if (nearest === null || h < nearest) {
      nearest = h;
      nearestAssumed = !hasExplicitTime(g);
    }
  }

  const today = games.filter((g) => g.date === planDate);
  const yesterday = games.filter((g) => g.date === isoAddDays(planDate, -1));
  const gamesToday = today.length;
  const isDoubleheaderToday = gamesToday >= 2;
  const isDayAfterDoubleheader = yesterday.length >= 2;

  const within48h = nearest !== null && nearest <= 48;
  const assumedGameTime = within48h && nearestAssumed;
  if (within48h) {
    reasons.push(
      `Game within 48 hours (${Math.round(nearest as number)}h) — nothing above a primer today.`,
    );
  }
  if (assumedGameTime) {
    reasons.push(
      "That game has no start time on it, so we assumed 6pm. Add the real time and this adjusts.",
    );
  }

  let cnsCapDelta = 0;
  if (isDoubleheaderToday) {
    cnsCapDelta -= 1;
    reasons.push("Doubleheader today — CNS cap pulled back one unit.");
  } else if (isDayAfterDoubleheader) {
    cnsCapDelta -= 1;
    reasons.push("Doubleheader yesterday — CNS cap still pulled back one unit.");
  }

  // Starting pitcher, self-declared. Only for today's game.
  const startingToday = today.some((g) => g.isStartingPitcher === true);
  let removeLift = false;
  if (startingToday) {
    removeLift = true;
    reasons.push("You marked yourself the starting pitcher today — the lift comes off.");
  }

  // Pitcher adjacent to a team game, with no declaration either way.
  let primerOnly = within48h;
  if (opts.isPitcher && !startingToday && within48h) {
    primerOnly = true;
    reasons.push(
      "Pitcher next to a team game and no start declared — defaulting to primer level.",
    );
  }

  return {
    hasSchedule: true,
    hoursToNearestGame: nearest,
    within48h,
    gamesToday,
    isDoubleheaderToday,
    isDayAfterDoubleheader,
    cnsCapDelta,
    primerOnly,
    removeLift,
    assumedGameTime,
    reasons,
  };
}

/** Intensity classes that survive a primer-only day. */
export const PRIMER_INTENSITY_CLASSES = new Set([
  "low", "supplemental", "arm_care", "elastic",
]);
// Deliberately NOT survivors: `moderate` and `unilateral`. "Moderate" is by
// name above a primer, and "unilateral" describes a limb pattern, not an
// intensity — a single-leg squat under load is still load.

/** An unclassified movement is unknown, not safe — it does not survive. */
export function survivesPrimerOnly(intensityClass: string | null | undefined): boolean {
  if (intensityClass == null) return false;
  return PRIMER_INTENSITY_CLASSES.has(String(intensityClass).toLowerCase());
}
