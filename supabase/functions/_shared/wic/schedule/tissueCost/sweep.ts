// Tissue Cost Scheduler — reliability sweep core.
// Lives under supabase/functions/ so the same code runs in the vitest suite,
// in the bun sweep script AND in the scheduled edge function that writes to
// tcs_test_runs. PURE: no clock, no I/O, seeded RNG only.

import { decide, classRank } from "./decide.ts";
import { TCS_CONFIG } from "./config.ts";
import { addDays, dayDiff, fullRestDaysBetween, restDaysExcludingLiftDays } from "./tanks.ts";
import type {
  CheckIn,
  DaySchedule,
  Decision,
  Profile,
  SessionClass,
  TrainingAgeBand,
} from "./types.ts";

export { decide, classRank, TCS_CONFIG, addDays, dayDiff, fullRestDaysBetween };

/* ------------------------------------------------------------------- rng */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(rng: () => number, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

const BANDS: TrainingAgeBand[] = [
  "beginner",
  "developing",
  "intermediate",
  "advanced",
  "elite",
  "professional",
];
const PHASES: Profile["phase"][] = ["offseason", "pre_season", "in_season", "post_season"];
const TIMEZONES = [
  "UTC",
  "America/Chicago",
  "America/Los_Angeles",
  "America/New_York",
  "Pacific/Honolulu",
  "Australia/Sydney",
  "Europe/Berlin",
];

export function randomProfile(rng: () => number): Profile {
  const position = pick(rng, ["position", "catcher", "starting_pitcher"] as const);
  return {
    athleteId: `a${Math.floor(rng() * 1e6)}`,
    age: 12 + Math.floor(rng() * 12),
    growthMode: rng() < 0.3,
    trainingAgeBand: rng() < 0.1 ? null : pick(rng, BANDS),
    position,
    phase: pick(rng, PHASES),
    isStartingPitcher: position === "starting_pitcher" && rng() < 0.7,
    phaseTemplateClass: rng() < 0.2 ? pick(rng, ["H", "M", "L", "none"] as const) : "H",
  };
}

export interface Season {
  profile: Profile;
  days: DaySchedule[];
  checkIns: CheckIn[];
  timezone: string;
  startDate: string;
}

const START_DATES = ["2024-02-26", "2024-12-20", "2025-03-05", "2026-10-27", "2027-01-31"];

export function randomSeason(rng: () => number, lengthDays = 365): Season {
  const profile = randomProfile(rng);
  const startDate = pick(rng, START_DATES);
  const timezone = pick(rng, TIMEZONES);
  const days: DaySchedule[] = [];
  const checkIns: CheckIn[] = [];

  let gapUntil = 0;
  let lastLift: string | null = null;

  for (let i = 0; i < lengthDays; i++) {
    const date = addDays(startDate, i);
    if (i < gapUntil) continue; // travel / off-grid gap: no rows at all
    if (rng() < 0.01) {
      gapUntil = i + 1 + Math.floor(rng() * 21);
      continue;
    }

    const day: DaySchedule = { date };
    const r = rng();
    if (r < 0.35) {
      const tournament = rng() < 0.08;
      day.games = {
        role: profile.position ?? "position",
        count: rng() < 0.08 ? 2 : 1,
        tournament,
        doubleheader: rng() < 0.08,
      };
    } else if (r < 0.6) {
      day.practiceMinutes = 30 + Math.floor(rng() * 120);
      day.practiceIntensity = pick(rng, ["light", "moderate", "high"] as const);
    }

    if (rng() < 0.2) {
      const cls: SessionClass = pick(rng, ["H", "M", "L"] as const);
      const spaced = !lastLift || fullRestDaysBetween(lastLift, date) >= 2;
      if (spaced) {
        day.lift = {
          class: cls,
          method: cls === "H" && rng() < 0.2 ? "double_eccentric" : "standard",
          hardSets: 2 + Math.floor(rng() * 10),
          skipped: rng() < 0.15,
          novelty: rng() < 0.1,
        };
        if (!day.lift.skipped) lastLift = date;
      }
    }

    if (rng() < 0.15) {
      day.jumpContacts = {
        tier1: Math.floor(rng() * 40),
        tier2: Math.floor(rng() * 30),
        tier3: Math.floor(rng() * 15),
      };
    }
    if (rng() < 0.12) day.maxSprintYards = Math.floor(rng() * 400);
    if (rng() < 0.12) day.maxIntentThrows = Math.floor(rng() * 80);
    if (profile.isStartingPitcher && rng() < 0.18) day.pitcherStartDay = true;
    if (rng() < 0.05) day.pitchSmartRestDay = true;
    if (rng() < 0.03) day.travel = true;

    days.push(day);

    if (rng() < 0.55) {
      const pain = rng() < 0.06;
      checkIns.push({
        date,
        poorSleep: rng() < 0.25,
        highSoreness: rng() < 0.2,
        pain: pain
          ? [{ region: "knee", tank: pick(rng, ["nerve", "muscle", "connective", "arm"] as const), blocksLoadedWork: rng() < 0.6 }]
          : [],
      });
    }
  }

  return { profile, days, checkIns, timezone, startDate };
}

/* ------------------------------------------------------------- invariants */

export interface Violation {
  invariant: string;
  detail: string;
  date: string;
}

const OFFSETS = new WeakMap<DaySchedule[], number[]>();
const DAYMAPS = new WeakMap<DaySchedule[], Map<string, DaySchedule>>();

function dayMapOf(days: DaySchedule[]): Map<string, DaySchedule> {
  let m = DAYMAPS.get(days);
  if (!m) {
    m = new Map(days.map((x) => [x.date, x]));
    DAYMAPS.set(days, m);
  }
  return m;
}

function offsetsOf(days: DaySchedule[], anchor: string): number[] {
  let cached = OFFSETS.get(days);
  if (!cached) {
    cached = days.map((d) => dayDiff(anchor, d.date));
    OFFSETS.set(days, cached);
  }
  return cached;
}

function windowOf(days: DaySchedule[], today: string, anchor?: string) {
  if (!anchor) {
    const history = days.filter(
      (d) => dayDiff(today, d.date) < 0 && dayDiff(today, d.date) >= -TCS_CONFIG.historyWindowDays,
    );
    const calendar = days.filter((d) => dayDiff(today, d.date) >= 0 && dayDiff(today, d.date) <= 3);
    return { history, calendar };
  }
  const offs = offsetsOf(days, anchor);
  const t = dayDiff(anchor, today);
  const history: DaySchedule[] = [];
  const calendar: DaySchedule[] = [];
  // days are ordered oldest-first; walk only the relevant slice
  let lo = 0;
  let hi = days.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (offs[mid] < t - TCS_CONFIG.historyWindowDays) lo = mid + 1;
    else hi = mid - 1;
  }
  for (let i = lo; i < days.length; i++) {
    const rel = offs[i] - t;
    if (rel > 3) break;
    if (rel < 0) history.push(days[i]);
    else calendar.push(days[i]);
  }
  return { history, calendar };
}

export function decideOn(season: Season, today: string, overrides?: Partial<Season>): Decision {
  const days = overrides?.days ?? season.days;
  const { history, calendar } = windowOf(days, today, season.startDate);
  return decide(
    overrides?.profile ?? season.profile,
    history,
    calendar,
    overrides?.checkIns ?? season.checkIns,
    TCS_CONFIG,
    today,
    overrides?.timezone ?? season.timezone,
  );
}

export function checkInvariants(
  season: Season,
  today: string,
  d: Decision,
  opts: { deep?: boolean } = {},
): Violation[] {
  const v: Violation[] = [];
  const push = (invariant: string, detail: string) => v.push({ invariant, detail, date: today });
  const { history, calendar } = windowOf(season.days, today, season.startDate);
  const dayMap = dayMapOf(season.days);
  const todayDay = dayMap.get(today) ?? null;
  const tomorrow = dayMap.get(addDays(today, 1)) ?? null;
  const phase = season.profile.phase;
  const inSeason = phase === "in_season" || phase === "post_season";

  // I5 — always a valid decision
  if (!["H", "M", "L", "none"].includes(d.allowedClass)) push("I5", `bad class ${d.allowedClass}`);
  for (const [k, val] of Object.entries(d.tankLevels)) {
    if (!Number.isFinite(val) || val < 0) push("I5", `tank ${k}=${val}`);
  }
  if (!Array.isArray(d.reasons) || d.reasons.length < 1 || d.reasons.length > 2) {
    push("I5", `reasons length ${d.reasons?.length}`);
  }
  if (!d.version || !d.configHash || !d.inputsHash) push("I5", "missing stamps");

  // I9 — bounded
  const cap = season.profile.phaseTemplateClass ?? "H";
  if (classRank(d.allowedClass) > classRank(cap)) push("I9", `class ${d.allowedClass} > template ${cap}`);
  if (d.nextHeavyDate) {
    const off = dayDiff(today, d.nextHeavyDate);
    if (off < 0 || off > 10) push("I9", `nextHeavyDate offset ${off}`);
  }

  if (d.allowedClass !== "none") {
    // I1 / I7 — hard rules
    if (todayDay?.games?.tournament) push("I1", "lift on a tournament day");
    if (todayDay?.games?.doubleheader || (todayDay?.games?.count ?? 0) >= 2) push("I1", "lift on a doubleheader");
    if (season.profile.isStartingPitcher && todayDay?.pitcherStartDay) push("I1", "lift on a start day");
    if (season.profile.isStartingPitcher && tomorrow?.pitcherStartDay) push("I1", "lift the day before a start");
    const painBlocks = (season.checkIns.find((c) => c.date === today)?.pain ?? []).some(
      (p) => p?.blocksLoadedWork,
    );
    if (painBlocks && d.allowedClass !== "L") push("I1", "loaded lift under a pain block");
    if (todayDay?.games && d.timing !== "post_game") push("I1", `game day timing ${d.timing}`);

    // I1 — floors
    const lastLift = [...history].reverse().find((x) => x.lift && !x.lift.skipped);
    if (lastLift) {
      const rest = fullRestDaysBetween(lastLift.date, today);
      const lastCls = lastLift.lift!.class;
      const need = inSeason
        ? TCS_CONFIG.floors.inSeasonBetweenLifts
        : lastCls === "H" && d.allowedClass !== "L"
        ? TCS_CONFIG.floors.offseasonAfterH
        : lastCls === "M" && d.allowedClass === "H"
        ? TCS_CONFIG.floors.offseasonAfterMToH
        : TCS_CONFIG.floors.offseasonAfterML;
      if (rest < need) push("I1", `rest ${rest} < floor ${need} (last ${lastCls}, class ${d.allowedClass})`);

      // I12 — offseason / pre-season: every H sits at least 3 full rest days
      // after the most recent H or M (Step 6 decision 2, Step 9 decision C).
      // L sessions neither count toward that gap nor reset it.
      if (!inSeason && d.allowedClass === "H") {
        const liftDates = new Set(
          history.filter((x) => x.lift && !x.lift.skipped).map((x) => x.date),
        );
        const lastLoaded = [...history].reverse().find(
          (x) => x.lift && !x.lift.skipped && x.lift.class !== "L",
        );
        if (lastLoaded) {
          const r = restDaysExcludingLiftDays(lastLoaded.date, today, liftDates);
          if (r < 3) push("I12", `H only ${r} full rest days after a ${lastLoaded.lift!.class} lift`);
        }
      }
    }
  }

  // I11 — no H while easing back in after time off (v1.2 §B1.5).
  if (d.onRampUntil) {
    if (classRank(d.allowedClass) > classRank(TCS_CONFIG.onRamp.cap)) {
      push("I11", `class ${d.allowedClass} during an on-ramp ending ${d.onRampUntil}`);
    }
    if (d.nextHeavyDate && d.nextHeavyDate <= d.onRampUntil) {
      push("I11", `heavy day ${d.nextHeavyDate} inside the on-ramp (ends ${d.onRampUntil})`);
    }
  }
  // I11 — the on-ramp must fire whenever the gap is long enough.
  {
    const lastLift = [...history].reverse().find((x) => x.lift && !x.lift.skipped);
    if (lastLift && dayDiff(lastLift.date, today) >= TCS_CONFIG.onRamp.triggerGapDays && !d.onRampUntil) {
      push("I11", `gap ${dayDiff(lastLift.date, today)} days but no on-ramp`);
    }
  }

  if (!opts.deep) return v;

  // I2 — determinism
  const again = decideOn(season, today);
  if (JSON.stringify(again) !== JSON.stringify(d)) push("I2", "non-deterministic output");

  // I3 — more load never gives an earlier lift or a higher class
  if (!d.diagnostics.includes("no_inputs_safe_default") && history.length > 0) {
    const heavier = season.days.map((x) =>
      dayDiff(today, x.date) < 0 && dayDiff(today, x.date) >= -7
        ? {
            ...x,
            practiceMinutes: (x.practiceMinutes ?? 0) + 90,
            jumpContacts: { ...(x.jumpContacts ?? {}), tier3: (x.jumpContacts?.tier3 ?? 0) + 20 },
          }
        : x,
    );
    const hd = decideOn(season, today, { days: heavier });
    if (classRank(hd.allowedClass) > classRank(d.allowedClass)) push("I3", "more load raised the class");
    if (d.nextHeavyDate && hd.nextHeavyDate && dayDiff(d.nextHeavyDate, hd.nextHeavyDate) < 0) {
      push("I3", "more load moved the heavy day earlier");
    }
  }

  // I4 — a worse check-in never gives an earlier lift
  // Worse check-in = same pain flags, but poor sleep and high soreness added.
  // (Removing a pain flag would be *better* information, not worse.)
  const worseByDate = new Map<string, CheckIn>();
  for (const c of season.checkIns) worseByDate.set(c.date, { ...c });
  const worsenDates = [today, ...season.days
    .filter((x) => dayDiff(today, x.date) < 0 && dayDiff(today, x.date) >= -7)
    .map((x) => x.date)];
  for (const date of worsenDates) {
    const prev = worseByDate.get(date);
    worseByDate.set(date, { ...(prev ?? { date }), date, poorSleep: true, highSoreness: true });
  }
  const worse = [...worseByDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  const wd = decideOn(season, today, { checkIns: worse });
  if (classRank(wd.allowedClass) > classRank(d.allowedClass)) push("I4", "worse check-in raised the class");
  if (d.nextHeavyDate && wd.nextHeavyDate && dayDiff(d.nextHeavyDate, wd.nextHeavyDate) < 0) {
    push("I4", "worse check-in moved the heavy day earlier");
  }

  return v;
}

export interface SweepResult {
  seasons: number;
  daysChecked: number;
  deepChecks: number;
  violations: Violation[];
  seed: number;
}

export function runSweep(opts: {
  seed: number;
  seasons: number;
  lengthDays?: number;
  deepEvery?: number;
  maxViolations?: number;
}): SweepResult {
  const { seed, seasons, lengthDays = 365, deepEvery = 97, maxViolations = 25 } = opts;
  const rng = mulberry32(seed);
  const violations: Violation[] = [];
  let daysChecked = 0;
  let deepChecks = 0;

  for (let s = 0; s < seasons; s++) {
    const season = randomSeason(rng, lengthDays);
    for (let i = 0; i < lengthDays; i++) {
      const today = addDays(season.startDate, i);
      const deep = i % deepEvery === s % deepEvery;
      let d: Decision;
      try {
        d = decideOn(season, today);
      } catch (e) {
        violations.push({ invariant: "I5", detail: `threw: ${String(e)}`, date: today });
        continue;
      }
      daysChecked++;
      if (deep) deepChecks++;
      const v = checkInvariants(season, today, d, { deep });
      if (v.length) {
        violations.push(...v);
        if (violations.length >= maxViolations) {
          return { seasons: s + 1, daysChecked, deepChecks, violations, seed };
        }
      }
    }
  }
  return { seasons, daysChecked, deepChecks, violations, seed };
}
