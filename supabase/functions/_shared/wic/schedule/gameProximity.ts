/**
 * Game-proximity schedule enforcement (Pass B, revised after the phantom-game
 * report). Pure — no I/O.
 *
 * What changed and why:
 *
 *   1. FORWARD-ONLY WINDOW. The old rule measured |game - session|, so a game
 *      that had already been played still suppressed lifting for two days
 *      afterwards. Only a game *ahead* of the session can suppress it now.
 *   2. FINISHED GAMES ARE OUT. Anything final / played / completed, and any
 *      game whose date is behind the plan date, leaves the rule entirely. An
 *      athlete must never be punished for logging his own game.
 *   3. DE-DUPLICATION ACROSS SURFACES. One real game entered in both Game Plan
 *      and the calendar is one game. Same athlete + same date + same time is
 *      one game; same date with a missing time on either side is also one
 *      game. Two games on a date count as two ONLY when the athlete explicitly
 *      declared a doubleheader. A doubleheader is stated, never inferred.
 *   4. NAMED ADJUSTMENTS. Every suppression carries the game and the date that
 *      caused it, so the card can say "Lighter today — you have a game Friday
 *      6pm." Nothing is adjusted silently.
 *   5. DENSITY. At four or more games in a rolling seven days the 48-hour rule
 *      cannot be satisfied, so it is disabled: game days get a primer, genuine
 *      off days get a fuller session.
 *   6. ZERO-EXPOSURE INVARIANT. Restrictions may never reduce lift exposure to
 *      zero over a rolling seven days. When they would, they relax to a short
 *      concentric primer.
 *
 * Nothing here loosens a safety gate. Age, deep_flexion, eccentric_overload,
 * shoulder_end_range and the CNS cap are untouched. Pitchers keep the
 * day-before-a-start protection at every density.
 */

export const GAME_PROXIMITY_VERSION = "game_proximity_v2";

export interface ScheduledGame {
  /** Row id on the source table, used by the "No game then" override. */
  id?: string | null;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** HH:MM or HH:MM:SS, local. Null means unknown -> assumed 18:00. */
  time?: string | null;
  isStartingPitcher?: boolean | null;
  /** Row status: scheduled / final / played / completed / canceled ... */
  status?: string | null;
  /** True only when the athlete explicitly marked this date a doubleheader. */
  declaredDoubleheader?: boolean | null;
  /** Athlete tapped "No game then" on this row. */
  ignored?: boolean | null;
  /** Opponent or title, for the card copy. */
  label?: string | null;
  source: "gp_games" | "calendar_events";
}

export interface DrivingGame {
  id: string | null;
  date: string;
  /** HH:MM actually used (explicit or assumed). */
  time: string;
  assumedTime: boolean;
  label: string | null;
  source: ScheduledGame["source"];
  /** "Friday 6pm" / "Sep 12 6pm". */
  whenLabel: string;
}

export interface GameProximity {
  hasSchedule: boolean;
  /** Hours ahead to the next game. Null when nothing is ahead in range. */
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
  assumedGameTime: boolean;
  /** The game that caused today's adjustment, for card copy. */
  drivingGame: DrivingGame | null;
  /** Deduped games in the rolling seven-day window centred on the plan date. */
  gamesPerRollingWeek: number;
  /** gamesPerRollingWeek >= 4 — the 48-hour rule is unsatisfiable. */
  highDensity: boolean;
  /** The zero-exposure invariant fired and relaxed a removal to a primer. */
  zeroExposureRelief: boolean;
  /** Rows dropped by de-duplication, for the derivation log. */
  duplicatesCollapsed: number;
  /** Rows dropped because they were already played. */
  finishedExcluded: number;
  /** Human copy naming the game and date, e.g. the card headline. */
  headline: string | null;
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
  drivingGame: null,
  gamesPerRollingWeek: 0,
  highDensity: false,
  zeroExposureRelief: false,
  duplicatesCollapsed: 0,
  finishedExcluded: 0,
  headline: null,
  reasons: [],
};

const DEFAULT_GAME_HOUR = 18;

/** Statuses that mean the game is over. It can never suppress a future lift. */
const FINISHED_STATUSES = new Set([
  "final", "finalized", "played", "complete", "completed", "done",
  "post", "postgame", "forfeit", "logged", "result",
]);

/** Statuses that were already excluded before this change, and stay excluded. */
const DROPPED_STATUSES = new Set(["canceled", "cancelled", "rescheduled", "deleted"]);

export function isFinishedStatus(status: string | null | undefined): boolean {
  return FINISHED_STATUSES.has(String(status ?? "").trim().toLowerCase());
}

export function hasExplicitTime(g: { time?: string | null }): boolean {
  return /^(\d{1,2}):(\d{2})/.test(String(g.time ?? "").trim());
}

function hhmm(g: { time?: string | null }): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(g.time ?? "").trim());
  const hh = m ? Number(m[1]) : DEFAULT_GAME_HOUR;
  const mm = m ? Number(m[2]) : 0;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function gameInstant(g: { date: string; time?: string | null }): number {
  const [hh, mm] = hhmm(g).split(":").map(Number);
  return new Date(`${g.date}T00:00:00Z`).getTime() + (hh * 60 + mm) * 60000;
}

const isoAddDays = (iso: string, n: number) =>
  new Date(new Date(`${iso}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function clockLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, "0")}${ampm}`;
}

/** "today 6pm" / "Friday 6pm" / "Sep 12 6pm" — always names the day. */
export function describeWhen(date: string, time: string, planDate: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const days = Math.round(
    (d.getTime() - new Date(`${planDate}T00:00:00Z`).getTime()) / 86400000,
  );
  const clock = clockLabel(time);
  if (days === 0) return `today ${clock}`;
  if (days === 1) return `tomorrow ${clock}`;
  if (days > 1 && days <= 6) return `${DAY_NAMES[d.getUTCDay()]} ${clock}`;
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()} ${clock}`;
}

export interface DedupeResult {
  games: ScheduledGame[];
  duplicatesCollapsed: number;
  finishedExcluded: number;
}

/**
 * One real game is one game.
 *
 * Order of operations per date:
 *   - drop cancelled / rescheduled / athlete-ignored / finished rows
 *   - collapse exact (date, time) matches across surfaces
 *   - if the athlete did NOT declare a doubleheader on that date, collapse the
 *     whole date to a single game (earliest explicit time wins, otherwise the
 *     assumed 6pm row). This is what fixes "one game entered twice looks like
 *     a doubleheader".
 *   - if the athlete DID declare a doubleheader, every distinct time survives.
 */
export function dedupeGames(
  games: readonly ScheduledGame[],
  planDate: string,
): DedupeResult {
  let finishedExcluded = 0;
  const live: ScheduledGame[] = [];
  for (const g of games ?? []) {
    if (!g || !g.date) continue;
    const status = String(g.status ?? "").trim().toLowerCase();
    if (DROPPED_STATUSES.has(status)) continue;
    if (g.ignored === true) continue;
    if (isFinishedStatus(status) || g.date < planDate) {
      finishedExcluded++;
      continue;
    }
    live.push(g);
  }

  const byDate = new Map<string, ScheduledGame[]>();
  for (const g of live) {
    const arr = byDate.get(g.date) ?? [];
    arr.push(g);
    byDate.set(g.date, arr);
  }

  const out: ScheduledGame[] = [];
  let duplicatesCollapsed = 0;
  for (const [, rows] of byDate) {
    const declared = rows.some((r) => r.declaredDoubleheader === true);
    // Collapse identical (date, time) rows first — always safe.
    const byTime = new Map<string, ScheduledGame>();
    for (const r of rows) {
      const key = hasExplicitTime(r) ? hhmm(r) : "__untimed__";
      const prior = byTime.get(key);
      if (!prior) byTime.set(key, r);
      else {
        duplicatesCollapsed++;
        // Prefer the row that carries the most information.
        byTime.set(key, mergeRows(prior, r));
      }
    }
    let kept = Array.from(byTime.values());

    if (!declared) {
      // No athlete-declared doubleheader: the date is one game, whatever the
      // surfaces say. Prefer an explicit time over the assumed one.
      const timed = kept.filter(hasExplicitTime).sort((a, b) => hhmm(a).localeCompare(hhmm(b)));
      const winner = timed[0] ?? kept[0];
      duplicatesCollapsed += kept.length - 1;
      kept = winner ? [kept.reduce((acc, r) => mergeRows(acc, r), winner)] : [];
    }
    out.push(...kept);
  }

  out.sort((a, b) => (a.date === b.date ? hhmm(a).localeCompare(hhmm(b)) : a.date.localeCompare(b.date)));
  return { games: out, duplicatesCollapsed, finishedExcluded };
}

function mergeRows(a: ScheduledGame, b: ScheduledGame): ScheduledGame {
  return {
    ...a,
    id: a.id ?? b.id ?? null,
    time: hasExplicitTime(a) ? a.time : (hasExplicitTime(b) ? b.time : (a.time ?? b.time ?? null)),
    isStartingPitcher: a.isStartingPitcher === true || b.isStartingPitcher === true,
    declaredDoubleheader: a.declaredDoubleheader === true || b.declaredDoubleheader === true,
    label: a.label ?? b.label ?? null,
  };
}

export interface ProximityOptions {
  isPitcher?: boolean;
  /**
   * Dates in the six days before the plan date on which the athlete actually
   * received lift exposure. Used only by the zero-exposure invariant.
   */
  liftExposureDatesLast7?: readonly string[];
}

export function resolveGameProximity(
  games: readonly ScheduledGame[],
  planDate: string,
  opts: ProximityOptions = {},
): GameProximity {
  const { games: clean, duplicatesCollapsed, finishedExcluded } = dedupeGames(games ?? [], planDate);
  if (clean.length === 0) {
    return { ...NO_SCHEDULE, duplicatesCollapsed, finishedExcluded, hasSchedule: (games ?? []).length > 0 };
  }

  const reasons: string[] = [];
  // The athlete's day is anchored at noon: the session sits inside the day.
  const sessionInstant = new Date(`${planDate}T12:00:00Z`).getTime();

  // ---- Forward-only nearest game. A game behind the session never counts. ----
  let nearest: number | null = null;
  let nearestGame: ScheduledGame | null = null;
  for (const g of clean) {
    const delta = (gameInstant(g) - sessionInstant) / 3600000;
    if (delta < 0) continue; // already played or already started today
    if (nearest === null || delta < nearest) {
      nearest = delta;
      nearestGame = g;
    }
  }

  const today = clean.filter((g) => g.date === planDate);
  const yesterday = clean.filter((g) => g.date === isoAddDays(planDate, -1));
  const gamesToday = today.length;
  // Declared, never inferred.
  const isDoubleheaderToday = gamesToday >= 2 && today.some((g) => g.declaredDoubleheader === true);
  const isDayAfterDoubleheader =
    yesterday.length >= 2 && yesterday.some((g) => g.declaredDoubleheader === true);

  // ---- Density: deduped games inside the rolling seven days centred here. ----
  const winStart = isoAddDays(planDate, -3);
  const winEnd = isoAddDays(planDate, 3);
  const gamesPerRollingWeek = clean.filter((g) => g.date >= winStart && g.date <= winEnd).length;
  const highDensity = gamesPerRollingWeek >= 4;

  const within48hRaw = nearest !== null && nearest <= 48;
  const assumedGameTime = within48hRaw && !!nearestGame && !hasExplicitTime(nearestGame);

  const drivingGame: DrivingGame | null = nearestGame
    ? {
        id: nearestGame.id ?? null,
        date: nearestGame.date,
        time: hhmm(nearestGame),
        assumedTime: !hasExplicitTime(nearestGame),
        label: nearestGame.label ?? null,
        source: nearestGame.source,
        whenLabel: describeWhen(nearestGame.date, hhmm(nearestGame), planDate),
      }
    : null;

  const isGameToday = gamesToday > 0;
  let primerOnly = false;
  let headline: string | null = null;

  if (highDensity) {
    reasons.push(
      `${gamesPerRollingWeek} games in seven days — the 48-hour rule can't be satisfied, so it's off. Game days get a primer, off days get a real session.`,
    );
    if (isGameToday) {
      primerOnly = true;
      headline = drivingGame
        ? `Primer only — you play ${drivingGame.whenLabel}.`
        : "Primer only — you play today.";
    }
  } else if (within48hRaw) {
    primerOnly = true;
    headline = drivingGame
      ? `Lighter today — you have a game ${drivingGame.whenLabel}.`
      : "Lighter today — you have a game coming up.";
    reasons.push(
      `${headline} Nothing above a primer until it's played (${Math.round(nearest as number)}h out).`,
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
    reasons.push("You marked today a doubleheader — CNS cap pulled back one unit.");
  } else if (isDayAfterDoubleheader) {
    cnsCapDelta -= 1;
    reasons.push("Doubleheader yesterday — CNS cap still pulled back one unit.");
  }

  // ---- Starting pitcher. Protection survives every density. ----
  const startingToday = today.some((g) => g.isStartingPitcher === true);
  const tomorrow = clean.filter((g) => g.date === isoAddDays(planDate, 1));
  const startingTomorrow = tomorrow.some((g) => g.isStartingPitcher === true);
  let removeLift = false;
  if (startingToday) {
    removeLift = true;
    headline = "You marked yourself the starting pitcher today — the lift comes off.";
    reasons.push(headline);
  }
  if (startingTomorrow) {
    primerOnly = true;
    const when = describeWhen(isoAddDays(planDate, 1), hhmm(tomorrow[0]), planDate);
    headline = headline ?? `Primer only — you start ${when}.`;
    reasons.push(`You start ${when} — day-before protection holds regardless of schedule density.`);
  }
  if (opts.isPitcher && !startingToday && !startingTomorrow && within48hRaw && !highDensity) {
    primerOnly = true;
    reasons.push(
      "Pitcher next to a team game and no start declared — defaulting to primer level.",
    );
  }

  // ---- Zero-exposure invariant. ----
  // Restrictions may never reduce lift exposure to zero across a rolling seven
  // days. If the lift is being removed and the athlete has had none in the six
  // days behind him, it relaxes to a short concentric primer instead.
  let zeroExposureRelief = false;
  const exposure = (opts.liftExposureDatesLast7 ?? []).filter(
    (d) => d >= isoAddDays(planDate, -6) && d < planDate,
  );
  if (removeLift && exposure.length === 0) {
    removeLift = false;
    primerOnly = true;
    zeroExposureRelief = true;
    headline = "Short concentric primer — you've had no lift in seven days, so this one stays on.";
    reasons.push(
      "Zero-exposure rule: seven days without a lift is worse than a primer on a game day. Keeping a short concentric primer.",
    );
  }

  return {
    hasSchedule: true,
    hoursToNearestGame: nearest,
    within48h: within48hRaw && !highDensity,
    gamesToday,
    isDoubleheaderToday,
    isDayAfterDoubleheader,
    cnsCapDelta,
    primerOnly,
    removeLift,
    assumedGameTime,
    drivingGame,
    gamesPerRollingWeek,
    highDensity,
    zeroExposureRelief,
    duplicatesCollapsed,
    finishedExcluded,
    headline,
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
