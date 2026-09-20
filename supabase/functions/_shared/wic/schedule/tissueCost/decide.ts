// Tissue Cost Scheduler v1 — the decision function (§5).
// PURE: no Date.now(), no database, no network. `today` and `timezone` are inputs.
// Floors and hard rules (§4) are evaluated BEFORE any tank math and are never overridable.

import { canonicalJson, fnv1a64Hex } from "../../determinism/globalDeterminismLock.ts";
import {
  TCS_CONFIG,
  TCS_CONFIG_HASH,
  TCS_VERSION,
  tanksLoadedBy,
  TCS_THRESHOLDS,
  TCS_THRESHOLDS_V12,
  thresholdFor,
} from "./config.ts";
import {
  addDays,
  addLevels,
  applyCostMul,
  dayDiff,
  dayModifiers,
  decay,
  fullRestDaysBetween,
  isValidDate,
  liftCost,
  runTanks,
  sportCost,
  zeroTanks,
} from "./tanks.ts";
import { buildReasons } from "./reasons.ts";
import { computeBaseline, judgedLevels } from "./baseline.ts";

const zeroLevels = (): TankLevels => ({ nerve: 0, muscle: 0, connective: 0, arm: 0 });
import {
  type AllowedClass,
  type CheckIn,
  type DaySchedule,
  type Decision,
  type GameRole,
  type Profile,
  type SessionClass,
  TANKS,
  type TankLevels,
  type TcsConfig,
  type Timing,
} from "./types.ts";

const EPS = 1e-9;
const CLASS_ORDER: SessionClass[] = ["H", "M", "L"];
const CLASS_RANK: Record<AllowedClass, number> = { none: 0, L: 1, M: 2, H: 3 };

export function classRank(c: AllowedClass): number {
  return CLASS_RANK[c] ?? 0;
}

/* ------------------------------------------------------------- input hygiene */

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function sanitizeDay(raw: unknown, diagnostics: string[]): DaySchedule | null {
  if (!raw || typeof raw !== "object") {
    diagnostics.push("day_not_an_object");
    return null;
  }
  const d = raw as DaySchedule;
  if (!isValidDate(String(d.date ?? ""))) {
    diagnostics.push("day_invalid_date");
    return null;
  }
  const lift = d.lift && typeof d.lift === "object" && CLASS_ORDER.includes(d.lift.class as SessionClass)
    ? {
        class: d.lift.class as SessionClass,
        method: d.lift.method === "double_eccentric" ? ("double_eccentric" as const) : ("standard" as const),
        hardSets: Math.max(0, num(d.lift.hardSets, TCS_CONFIG.referenceHardSets)),
        skipped: !!d.lift.skipped,
        novelty: !!d.lift.novelty,
      }
    : null;
  if (d.lift && !lift) diagnostics.push("lift_row_discarded");
  return {
    date: String(d.date).slice(0, 10),
    lift,
    games: d.games && typeof d.games === "object"
      ? {
          role:
            d.games.role === "catcher" || d.games.role === "starting_pitcher" ? d.games.role : "position",
          count: Math.max(0, Math.min(6, Math.round(num(d.games.count, 1) || 1))),
          tournament: !!d.games.tournament,
          doubleheader: !!d.games.doubleheader,
        }
      : null,
    practiceMinutes: Math.max(0, Math.min(600, num(d.practiceMinutes, 0))),
    practiceIntensity:
      d.practiceIntensity === "light" || d.practiceIntensity === "high" ? d.practiceIntensity : "moderate",
    jumpContacts: d.jumpContacts
      ? {
          tier1: Math.max(0, Math.min(1000, num(d.jumpContacts.tier1, 0))),
          tier2: Math.max(0, Math.min(1000, num(d.jumpContacts.tier2, 0))),
          tier3: Math.max(0, Math.min(1000, num(d.jumpContacts.tier3, 0))),
        }
      : null,
    maxSprintYards: Math.max(0, Math.min(5000, num(d.maxSprintYards, 0))),
    maxIntentThrows: Math.max(0, Math.min(500, num(d.maxIntentThrows, 0))),
    pitcherStartDay: !!d.pitcherStartDay,
    pitchSmartRestDay: !!d.pitchSmartRestDay,
    travel: !!d.travel,
  };
}

/** Duplicate rows for one date are merged conservatively: the heavier value wins. */
function mergeDays(a: DaySchedule, b: DaySchedule): DaySchedule {
  const pickLift = () => {
    if (!a.lift) return b.lift ?? null;
    if (!b.lift) return a.lift;
    return CLASS_RANK[a.lift.class] >= CLASS_RANK[b.lift.class] ? a.lift : b.lift;
  };
  const pickGames = () => {
    if (!a.games) return b.games ?? null;
    if (!b.games) return a.games;
    return {
      role: (a.games.role === "catcher" || b.games.role === "catcher"
        ? "catcher"
        : a.games.role ?? b.games.role ?? "position") as GameRole,
      count: Math.max(a.games.count ?? 1, b.games.count ?? 1),
      tournament: !!(a.games.tournament || b.games.tournament),
      doubleheader: !!(a.games.doubleheader || b.games.doubleheader),
    };
  };
  return {
    date: a.date,
    lift: pickLift(),
    games: pickGames(),
    practiceMinutes: Math.max(a.practiceMinutes ?? 0, b.practiceMinutes ?? 0),
    practiceIntensity: a.practiceIntensity === "high" || b.practiceIntensity === "high" ? "high" : a.practiceIntensity ?? "moderate",
    jumpContacts: {
      tier1: Math.max(a.jumpContacts?.tier1 ?? 0, b.jumpContacts?.tier1 ?? 0),
      tier2: Math.max(a.jumpContacts?.tier2 ?? 0, b.jumpContacts?.tier2 ?? 0),
      tier3: Math.max(a.jumpContacts?.tier3 ?? 0, b.jumpContacts?.tier3 ?? 0),
    },
    maxSprintYards: Math.max(a.maxSprintYards ?? 0, b.maxSprintYards ?? 0),
    maxIntentThrows: Math.max(a.maxIntentThrows ?? 0, b.maxIntentThrows ?? 0),
    pitcherStartDay: !!(a.pitcherStartDay || b.pitcherStartDay),
    pitchSmartRestDay: !!(a.pitchSmartRestDay || b.pitchSmartRestDay),
    travel: !!(a.travel || b.travel),
  };
}

/* ----------------------------------------------------------------- hard rules */

function hardRuleFor(
  profile: Profile,
  day: DaySchedule | null,
  nextDay: DaySchedule | null,
  painBlocks: boolean,
  cls: SessionClass,
): string | null {
  if (day?.games?.tournament) return "tournament";
  if (day?.games?.doubleheader || (day?.games?.count ?? 0) >= 2) return "doubleheader";
  if (profile.isStartingPitcher && day?.pitcherStartDay) return "pitcher_start_day";
  if (profile.isStartingPitcher && nextDay?.pitcherStartDay) return "pitcher_day_before_start";
  if (painBlocks && cls !== "L") return "pain_blocks_loaded_work";
  return null;
}

function requiredRestDays(
  phase: Profile["phase"],
  lastClass: SessionClass,
  cls: SessionClass,
  config: TcsConfig,
): number {
  if (phase === "in_season" || phase === "post_season") return config.floors.inSeasonBetweenLifts;
  if (lastClass === "H") return cls === "L" ? config.floors.offseasonAfterML : config.floors.offseasonAfterH;
  return config.floors.offseasonAfterML;
}

/* --------------------------------------------------------------------- decide */

export function decide(
  profile: Profile,
  history: DaySchedule[],
  calendar: DaySchedule[],
  checkIns: CheckIn[],
  config: TcsConfig = TCS_CONFIG,
  today: string = "",
  timezone: string = "UTC",
): Decision {
  const diagnostics: string[] = [];
  const inputsHash = fnv1a64Hex(
    canonicalJson({ profile, history, calendar, checkIns, today, timezone }),
  );
  const base = {
    version: TCS_VERSION,
    configHash: TCS_CONFIG_HASH,
    inputsHash,
  };

  if (!isValidDate(today)) {
    diagnostics.push("invalid_today");
    return {
      allowedClass: "none",
      timing: "none",
      nextHeavyDate: null,
      tankLevels: zeroTanks(),
      reasons: ["We don't have today's date yet — recovery and skills only."],
      floorsApplied: [],
      loadPatternSignal: false,
      diagnostics,
      ...base,
    };
  }

  const phase: Profile["phase"] =
    profile?.phase === "in_season" || profile?.phase === "pre_season" || profile?.phase === "post_season"
      ? profile.phase
      : "offseason";
  const safeProfile: Profile = { ...profile, phase };

  // ---- normalise the day map
  const byDate = new Map<string, DaySchedule>();
  const ingest = (rows: unknown, bucket: "history" | "calendar") => {
    if (!Array.isArray(rows)) {
      diagnostics.push(`${bucket}_not_an_array`);
      return;
    }
    for (const raw of rows) {
      const d = sanitizeDay(raw, diagnostics);
      if (!d) continue;
      const offset = dayDiff(today, d.date);
      if (offset < -config.historyWindowDays || offset > config.nextHeavyHorizonDays) {
        diagnostics.push("day_out_of_window");
        continue;
      }
      if (bucket === "history" && offset > 0) diagnostics.push("future_dated_history_row");
      const existing = byDate.get(d.date);
      if (existing) {
        diagnostics.push("duplicate_day_merged");
        byDate.set(d.date, mergeDays(existing, d));
      } else {
        byDate.set(d.date, d);
      }
    }
  };
  ingest(history, "history");
  ingest(calendar, "calendar");

  const checkInByDate = new Map<string, CheckIn>();
  if (Array.isArray(checkIns)) {
    for (const c of checkIns) {
      if (!c || typeof c !== "object" || !isValidDate(String(c.date ?? ""))) {
        diagnostics.push("checkin_discarded");
        continue;
      }
      checkInByDate.set(String(c.date).slice(0, 10), c);
    }
  } else if (checkIns != null) {
    diagnostics.push("checkins_not_an_array");
  }

  const allDates = [...byDate.keys()].sort();
  const pastDays = allDates.filter((d) => d < today).map((d) => byDate.get(d)!);
  const todayDay = byDate.get(today) ?? null;
  const futureDates = allDates.filter((d) => d > today);
  if (allDates.length === 0) diagnostics.push("no_inputs_safe_default");

  // ---- floors (evaluated before any tank math)
  const lastLiftEntry = [...pastDays].reverse().find((d) => d.lift && !d.lift.skipped) ?? null;
  const restSinceLastLift = lastLiftEntry ? fullRestDaysBetween(lastLiftEntry.date, today) : Infinity;
  const floorsApplied: string[] = [];

  const painToday = (checkInByDate.get(today)?.pain ?? []).some((p) => p?.blocksLoadedWork);

  // ---- tank math up to today's session time (lift comes after skill work / after the game)
  const { levels, contributions } = runTanks({
    days: pastDays,
    today,
    todayDay: todayDay ? { ...todayDay, lift: null } : null,
    profile: safeProfile,
    checkInByDate,
    config,
  });

  // ---- v1.2 §A: judge every tank on load ABOVE the athlete's own normal.
  const baselineResult = computeBaseline(
    pastDays,
    futureDates.map((d) => byDate.get(d)!),
    today,
    config,
  );
  const useBaseline = config.baselineSubtraction === true;
  const baseline = useBaseline ? baselineResult.baseline : zeroLevels();
  if (useBaseline) {
    diagnostics.push(`baseline_${baselineResult.source}`);
    if (baselineResult.capped) diagnostics.push("baseline_capped");
  }
  const thresholds = useBaseline ? TCS_THRESHOLDS_V12 : TCS_THRESHOLDS;

  const templateCap: AllowedClass =
    profile?.phaseTemplateClass === "none" ||
    profile?.phaseTemplateClass === "L" ||
    profile?.phaseTemplateClass === "M" ||
    profile?.phaseTemplateClass === "H"
      ? profile.phaseTemplateClass
      : "H";

  // When the athlete has nothing logged and no plan at all: safe default is
  // 3 full rest days and class M max (§2).
  const noInputs = allDates.length === 0;
  const effectiveCap: AllowedClass = noInputs
    ? (CLASS_RANK[templateCap] > CLASS_RANK["M"] ? "M" : templateCap)
    : templateCap;
  if (noInputs) diagnostics.push("class_capped_to_M_no_inputs");

  const candidates = CLASS_ORDER.filter((c) => CLASS_RANK[c] <= CLASS_RANK[effectiveCap]);

  const nextDay = byDate.get(addDays(today, 1)) ?? null;
  let hardRuleHit: string | null = null;

  const tanksOk = (cls: SessionClass, lv: TankLevels, ph: Profile["phase"]): boolean => {
    const th = thresholdFor(cls, ph, thresholds);
    const judged = judgedLevels(lv, baseline);
    for (const t of tanksLoadedBy(cls)) {
      if (judged[t] > th[t] + EPS) return false;
    }
    return true;
  };

  const nextGameDate = futureDates.find((d) => byDate.get(d)?.games) ?? null;
  const gameReadyOk = (cls: SessionClass, lv: TankLevels): boolean => {
    if (phase !== "in_season" && phase !== "post_season") return true;
    if (!nextGameDate) return true;
    const mods = dayModifiers(safeProfile, checkInByDate.get(today), config);
    let projected = addLevels(lv, applyCostMul(liftCost({ date: today, lift: { class: cls } }, config), mods.costMul));
    const gap = Math.max(1, dayDiff(today, nextGameDate));
    for (let i = 0; i < gap; i++) projected = decay(projected, config, mods.halfLifeMul);
    const judged = judgedLevels(projected, baseline);
    for (const t of TANKS) {
      if (judged[t] > thresholds.gameReadyLine[t] + EPS) return false;
    }
    return true;
  };

  const rulesOk = (cls: SessionClass): { ok: boolean; rule: string | null; floor: string | null } => {
    const rule = hardRuleFor(safeProfile, todayDay, nextDay, painToday, cls);
    if (rule) return { ok: false, rule, floor: null };
    const need = lastLiftEntry ? requiredRestDays(phase, lastLiftEntry.lift!.class, cls, config) : 0;
    if (lastLiftEntry && restSinceLastLift < need) {
      return { ok: false, rule: null, floor: `${phase}_after_${lastLiftEntry.lift!.class}_needs_${need}` };
    }
    if (noInputs && cls !== "L" && restSinceLastLift === Infinity) {
      // no history at all — nothing to space from; cap already applied
    }
    return { ok: true, rule: null, floor: null };
  };

  let allowedClass: AllowedClass = "none";
  let loadPatternSignal = false;
  const ruleLegal: SessionClass[] = [];

  for (const cls of candidates) {
    const r = rulesOk(cls);
    if (!r.ok) {
      if (r.rule && !hardRuleHit) hardRuleHit = r.rule;
      if (r.floor && !floorsApplied.includes(r.floor)) floorsApplied.push(r.floor);
      continue;
    }
    ruleLegal.push(cls);
    if (allowedClass === "none" && tanksOk(cls, levels, phase) && gameReadyOk(cls, levels)) {
      allowedClass = cls;
    }
  }

  // Ceiling — reduce, never remove (v1.2 §A, invariant I10).
  // The class drops to the HIGHEST allowed lower class, not all the way down.
  if (allowedClass === "none" && ruleLegal.length > 0) {
    const ceiling = phase === "in_season" || phase === "post_season"
      ? config.ceilingRestDays.inSeason
      : config.ceilingRestDays.offseason;
    if (restSinceLastLift >= ceiling) {
      // ruleLegal is ordered H, M, L (highest first).
      allowedClass = useBaseline && ruleLegal.length > 1 ? ruleLegal[1] : ruleLegal[ruleLegal.length - 1];
      loadPatternSignal = true;
    }
  }

  // ---- timing
  const gameToday = !!todayDay?.games;
  const timing: Timing = allowedClass === "none" ? "none" : gameToday ? "post_game" : "after_skill_work";

  // ---- next heavy date (forward simulation, no extra lifts, horizon 10 days)
  let nextHeavyDate: string | null = null;
  if (allowedClass === "H") {
    nextHeavyDate = today;
  } else if (CLASS_RANK[effectiveCap] >= CLASS_RANK["H"]) {
    let lv = levels;
    for (let i = 1; i <= config.nextHeavyHorizonDays; i++) {
      const date = addDays(today, i);
      const day = byDate.get(date) ?? null;
      const mods = dayModifiers(safeProfile, checkInByDate.get(date), config);
      lv = addLevels(decay(lv, config, mods.halfLifeMul), applyCostMul(sportCost(day, config), mods.costMul));
      const rule = hardRuleFor(safeProfile, day, byDate.get(addDays(date, 1)) ?? null, false, "H");
      if (rule) continue;
      const need = lastLiftEntry ? requiredRestDays(phase, lastLiftEntry.lift!.class, "H", config) : 0;
      if (lastLiftEntry && fullRestDaysBetween(lastLiftEntry.date, date) < need) continue;
      if (!tanksOk("H", lv, phase)) continue;
      nextHeavyDate = date;
      break;
    }
  }

  const reasons = buildReasons({
    today,
    bindingTank: null,
    contributions,
    floorsApplied,
    nextHeavyDate,
    hardRule: allowedClass === "none" ? hardRuleHit : null,
    loadPatternSignal,
  });

  const safeLevels: TankLevels = zeroTanks();
  for (const t of TANKS) safeLevels[t] = Number.isFinite(levels[t]) ? levels[t] : 0;

  return {
    allowedClass,
    timing,
    nextHeavyDate,
    tankLevels: safeLevels,
    reasons,
    floorsApplied,
    loadPatternSignal,
    diagnostics,
    ...base,
  };
}
