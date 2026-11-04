/**
 * Owner Nov 4 r3 Part B — catch play in THROWS, never time.
 *
 * One pure judge for: the catch-play ladder by day kind (standard / long toss /
 * light / arm strength / build-up / pitcher interval warm-up), who has EARNED long toss
 * and arm-strength days, how often they may happen, progression, auto-regress, and
 * whether today's Defense may include position throws.
 *
 * Every row carries a throw count ("60ft x 10 throws") so the existing arm budget
 * (eassArmEvent / guardArmDrills) counts every throw. No arm-unit text, ever.
 * Defaults are owner-editable (app_settings `catch_play_standards`).
 *
 * Research basis for gating arm-strength days by EARNING, VOLUME and FREQUENCY (not
 * effort): max-distance throws produced the highest elbow/shoulder torques measured,
 * above mound pitching (Fleisig 2011); 75% perceived effort ≈ 93% of max elbow torque
 * (Melugin 2019).
 */

export type CPSport = "baseball" | "softball";
export type CPPosition = "1B" | "IF" | "C" | "OF" | "P";
export type CPPhase = "off" | "pre" | "in" | "post";
export type CPDayKind = "standard" | "long_toss" | "light" | "arm_strength" | "build_up" | "pitcher_interval" | "none";
export type CPAgeBand = "youth" | "teen" | "adult"; // under 13 / 13–18 / 19+

export interface CatchPlayRow {
  name: string;
  distanceFt: number;
  throws: number;
  /** Dose line the existing arm budget parses: "<ft>ft x <n> throws …". */
  dosage: string;
  intent: "low" | "moderate" | "high";
  part: "feel" | "build" | "position" | "stretch_out" | "pull_down" | "come_in" | "interval";
}

export interface CatchPlayStandards {
  version: 1;
  positionDistanceFt: Record<CPSport, Record<Exclude<CPPosition, "P">, number>>;
  /** "Comfortable max" caps until a longer pain-free distance is logged (owner default, editable). */
  maxDistanceCapFt: Record<CPSport, { IF: number; OF: number }>;
  youthMaxDistanceFt: { under11: number; age11to12: number };
  longTossPerWeek: Record<CPPhase, number>;
  armStrengthPerWeek: Record<CPPhase, number>;
  pullDowns: { adultStart: number; adultMax: number; teenStart: number; teenMax: number; youthMin: number; youthMax: number; stepPerGreenWeek: number };
  /** Consecutive pain-free sessions to count "green" (the green rule); youth/teen are 3× slower. */
  greenSessions: number;
  youthGreenMultiplier: number;
  buildUpLayoffDays: number;
  buildUpHealedWithinDays: number;
  healthyCheckinDays: number;
  analysisFreshDays: number;
  regressDays: number;
  /** Throwing/pitching mechanics finding keys that count as arm-risk (owner-reviewed). */
  armRiskFaults: string[];
}

/** Proposed default arm-risk list — for the owner's review in the Coaching Console.
 *  Arm slot / elbow height are deliberately NOT listed (owner Elite filter: never flag them). */
export const PROPOSED_ARM_RISK_FAULTS = ["arm_lag", "th_across_body", "bb_trunk_rotation_early", "bb_poor_deceleration", "bb_arm_path_late", "sb_whip_arm_early"];

/** Every throwing / pitching mechanics finding the analysis can record (from the existing taxonomy). */
export const THROWING_FAULT_KEYS: ReadonlyArray<{ key: string; label: string }> = [
  { key: "arm_lag", label: "Arm lags behind the body" },
  { key: "th_across_body", label: "Throw pulled across the body" },
  { key: "th_feet_misaligned", label: "Feet not lined up to the target" },
  { key: "th_long_arm_action", label: "Long arm action" },
  { key: "th_slow_transfer", label: "Slow glove-to-hand transfer" },
  { key: "th_no_crow_hop", label: "No crow hop" },
  { key: "short_arm", label: "Short-arming the throw" },
  { key: "th_late_glove_break", label: "Late glove break" },
  { key: "th_low_elbow_slot", label: "Low elbow (not flagged by the Elite filter)" },
  { key: "bb_trunk_rotation_early", label: "Pitching: trunk rotates early" },
  { key: "bb_front_side_flyout", label: "Pitching: front side flies open" },
  { key: "bb_poor_deceleration", label: "Pitching: poor arm slow-down after release" },
  { key: "bb_arm_path_late", label: "Pitching: arm late to release" },
  { key: "bb_front_leg_collapse", label: "Pitching: front leg collapses" },
  { key: "sb_whip_arm_early", label: "Windmill: whip arm early" },
  { key: "sb_shoulders_open_early", label: "Windmill: shoulders open early" },
];

export const CATCH_PLAY_SETTING_KEY = "catch_play_standards";

export const DEFAULT_CATCH_PLAY_STANDARDS: CatchPlayStandards = {
  version: 1,
  positionDistanceFt: { baseball: { "1B": 120, IF: 120, C: 120, OF: 180 }, softball: { "1B": 90, IF: 120, C: 120, OF: 150 } },
  maxDistanceCapFt: { baseball: { IF: 180, OF: 250 }, softball: { IF: 150, OF: 200 } },
  youthMaxDistanceFt: { under11: 120, age11to12: 150 },
  longTossPerWeek: { off: 2, pre: 3, in: 1, post: 0 },
  armStrengthPerWeek: { off: 1, pre: 1, in: 1, post: 0 },
  pullDowns: { adultStart: 5, adultMax: 15, teenStart: 4, teenMax: 10, youthMin: 3, youthMax: 5, stepPerGreenWeek: 2 },
  greenSessions: 2,
  youthGreenMultiplier: 3,
  buildUpLayoffDays: 14,
  buildUpHealedWithinDays: 28,
  healthyCheckinDays: 14,
  analysisFreshDays: 60,
  regressDays: 7,
  armRiskFaults: PROPOSED_ARM_RISK_FAULTS,
};

const num = (v: unknown, d: number, lo = 0, hi = 1000) => (typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi ? v : d);

/** Merge a saved owner setting over the defaults; any bad value keeps the default. */
export function catchPlayStandardsFrom(raw: unknown): CatchPlayStandards {
  const d = DEFAULT_CATCH_PLAY_STANDARDS;
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
  const pos = (s: CPSport) => Object.fromEntries((["1B", "IF", "C", "OF"] as const).map((p) => [p, num(r.positionDistanceFt?.[s]?.[p], d.positionDistanceFt[s][p], 30, 400)])) as CatchPlayStandards["positionDistanceFt"][CPSport];
  const cap = (s: CPSport) => ({ IF: num(r.maxDistanceCapFt?.[s]?.IF, d.maxDistanceCapFt[s].IF, 60, 400), OF: num(r.maxDistanceCapFt?.[s]?.OF, d.maxDistanceCapFt[s].OF, 60, 400) });
  const phase = (k: "longTossPerWeek" | "armStrengthPerWeek", hi: number) => Object.fromEntries((["off", "pre", "in", "post"] as const).map((p) => [p, num(r[k]?.[p], d[k][p], 0, hi)])) as Record<CPPhase, number>;
  const pd = Object.fromEntries(Object.entries(d.pullDowns).map(([k, v]) => [k, num(r.pullDowns?.[k], v, 0, 30)])) as CatchPlayStandards["pullDowns"];
  return {
    version: 1,
    positionDistanceFt: { baseball: pos("baseball"), softball: pos("softball") },
    maxDistanceCapFt: { baseball: cap("baseball"), softball: cap("softball") },
    youthMaxDistanceFt: { under11: num(r.youthMaxDistanceFt?.under11, d.youthMaxDistanceFt.under11, 60, 200), age11to12: num(r.youthMaxDistanceFt?.age11to12, d.youthMaxDistanceFt.age11to12, 60, 200) },
    // Owner rule ceilings: long toss pre ≤3, in ≤2; arm strength off/pre ≤2, in ≤1.
    longTossPerWeek: (() => { const p = phase("longTossPerWeek", 3); return { ...p, in: Math.min(p.in, 2) }; })(),
    armStrengthPerWeek: (() => { const p = phase("armStrengthPerWeek", 2); return { ...p, in: Math.min(p.in, 1) }; })(),
    pullDowns: { ...pd, adultMax: Math.min(pd.adultMax, 15), youthMax: Math.min(pd.youthMax, 5) },
    greenSessions: num(r.greenSessions, d.greenSessions, 1, 10),
    youthGreenMultiplier: num(r.youthGreenMultiplier, d.youthGreenMultiplier, 1, 5),
    buildUpLayoffDays: num(r.buildUpLayoffDays, d.buildUpLayoffDays, 3, 120),
    buildUpHealedWithinDays: num(r.buildUpHealedWithinDays, d.buildUpHealedWithinDays, 0, 180),
    healthyCheckinDays: num(r.healthyCheckinDays, d.healthyCheckinDays, 7, 60),
    analysisFreshDays: num(r.analysisFreshDays, d.analysisFreshDays, 14, 365),
    regressDays: Math.max(7, num(r.regressDays, d.regressDays, 7, 60)),
    armRiskFaults: Array.isArray(r.armRiskFaults) ? r.armRiskFaults.filter((x: unknown): x is string => typeof x === "string") : d.armRiskFaults,
  };
}

export function ageBand(age: number | null | undefined): CPAgeBand {
  if (age == null) return "adult";
  return age < 13 ? "youth" : age <= 18 ? "teen" : "adult";
}

export function cpPosition(raw: string | null | undefined): CPPosition {
  const p = (raw ?? "").toUpperCase();
  if (/^(P|SP|RP|PITCHER)$/.test(p)) return "P";
  if (/^(1B|FIRST)/.test(p)) return "1B";
  if (/^C$|CATCH/.test(p)) return "C";
  if (/^(LF|CF|RF|OF)$|OUTFIELD/.test(p)) return "OF";
  return "IF";
}

/** Position distance for today's player, capped by the youth age distance. */
export function positionDistance(sport: CPSport, pos: CPPosition, age: number | null, s = DEFAULT_CATCH_PLAY_STANDARDS): number {
  const base = s.positionDistanceFt[sport][pos === "P" ? "IF" : pos];
  if (ageBand(age) !== "youth") return base;
  return Math.min(base, (age ?? 12) < 11 ? 90 : 120);
}

const row = (name: string, distanceFt: number, throws: number, part: CatchPlayRow["part"], intent: CatchPlayRow["intent"] = "low", note = ""): CatchPlayRow =>
  ({ name, distanceFt, throws, part, intent, dosage: `${distanceFt}ft x ${throws} throws${note ? ` · ${note}` : ""}` });

const LADDER: Record<CPSport, { feel: number; build: number[]; comeIn: number }> = {
  baseball: { feel: 45, build: [60, 90], comeIn: 60 },
  softball: { feel: 30, build: [45, 60, 75, 90], comeIn: 45 },
};

/** 1. Standard pre-defense catch play (about 35–45 throws adult; 25–30 youth). */
export function standardLadder(sport: CPSport, pos: CPPosition, age: number | null, s = DEFAULT_CATCH_PLAY_STANDARDS): CatchPlayRow[] {
  const youth = ageBand(age) === "youth";
  const pd = positionDistance(sport, pos, age, s);
  const L = LADDER[sport];
  const out: CatchPlayRow[] = [row(`Catch play — feel (${sport === "baseball" ? "30–45" : "30"} ft)`, L.feel, youth ? 5 : 10, "feel")];
  const build = L.build.filter((ft) => ft < pd);
  const perBuild = youth ? 5 : sport === "softball" ? 5 : 10;
  for (const ft of build) out.push(row(`Catch play — build to ${ft} ft`, ft, perBuild, "build"));
  out.push(row(`Catch play — your position distance (${pd} ft)`, pd, youth ? 6 : 9, "position", "moderate"));
  out.push(row(`Catch play — come back in (${L.comeIn} ft)`, L.comeIn, youth ? 4 : 5, "come_in"));
  return out;
}

/** 3. Light catch (day after a game/heavy day, or low readiness): about 35 throws, catch-light intent. */
export function lightCatch(sport: CPSport, age: number | null): CatchPlayRow[] {
  const ft = sport === "baseball" ? [30, 45, 60, 75, 90] : [30, 45, 60, 60, 75];
  const n = [5, 5, 10, 5, 10];
  const youth = ageBand(age) === "youth";
  return ft.map((d, i) => row(`Light catch — ${d} ft`, d, youth ? Math.ceil(n[i] / 2) : n[i], "build", "low", "catch-light"));
}

/** 4. Pitchers' pre-bullpen interval warm-up (published interval-program shape). */
export function pitcherIntervalWarmup(sport: CPSport): CatchPlayRow[] {
  if (sport === "softball") return [30, 45, 60, 75, 90].map((d, i) => row(`Interval warm-up catch — ${d} ft (overhand)`, d, i < 2 ? 5 : 10, "interval"));
  return [
    row("Interval warm-up catch — 30 ft", 30, 5, "interval"), row("Interval warm-up catch — 45 ft", 45, 5, "interval"),
    row("Interval warm-up catch — 60 ft", 60, 10, "interval"), row("Interval warm-up catch — 75 ft", 75, 10, "interval"),
    row("Interval warm-up catch — 90 ft", 90, 10, "interval"), row("Interval warm-up catch — 120 ft", 120, 10, "interval", "moderate"),
    row("Interval warm-up catch — 90-ft pull-downs", 90, 5, "pull_down", "high"), row("Interval warm-up catch — 60-ft flat ground", 60, 10, "interval", "moderate"),
  ];
}

export interface Progress { greenWeeks: number }

/** Max stretch-out distance: grows by the green rule, never past the cap / youth age distance. */
export function maxDistance(sport: CPSport, pos: CPPosition, age: number | null, p: Progress, s = DEFAULT_CATCH_PLAY_STANDARDS): number {
  const band = ageBand(age);
  const cap = band === "youth" ? ((age ?? 12) < 11 ? s.youthMaxDistanceFt.under11 : s.youthMaxDistanceFt.age11to12) : s.maxDistanceCapFt[sport][pos === "OF" ? "OF" : "IF"];
  const pd = positionDistance(sport, pos, age, s);
  // Never raise distance and volume together: distance steps on odd green weeks only.
  const steps = Math.ceil(Math.max(0, p.greenWeeks) / 2);
  return Math.min(cap, pd + 30 + steps * 15);
}

/** Pull-down count by age band and green weeks (volume steps on even green weeks only). */
export function pullDownCount(age: number | null, p: Progress, s = DEFAULT_CATCH_PLAY_STANDARDS): number {
  const band = ageBand(age);
  const steps = Math.floor(Math.max(0, p.greenWeeks) / 2);
  if (band === "youth") return Math.min(s.pullDowns.youthMax, s.pullDowns.youthMin + steps);
  if (band === "teen") return Math.min(s.pullDowns.teenMax, s.pullDowns.teenStart + steps * s.pullDowns.stepPerGreenWeek);
  return Math.min(s.pullDowns.adultMax, s.pullDowns.adultStart + steps * s.pullDowns.stepPerGreenWeek);
}

/** Pull-downs on a line, working back in, 4–5 throws every 15 ft. */
function pullDowns(from: number, to: number, total: number, youth: boolean): CatchPlayRow[] {
  const out: CatchPlayRow[] = [];
  let left = total;
  for (let ft = from; ft >= to && left > 0; ft -= 15) {
    const n = Math.min(left, youth ? 3 : 5);
    out.push(row(`Long toss pull-downs on a line — ${ft} ft`, ft, n, "pull_down", youth ? "moderate" : "high", youth ? "sub-max" : ""));
    left -= n;
  }
  return out;
}

/** 2. Long-toss day: ladder → stretch-out with arc → pull-downs → 60 ft × 5. */
export function longTossDay(sport: CPSport, pos: CPPosition, age: number | null, p: Progress, s = DEFAULT_CATCH_PLAY_STANDARDS): CatchPlayRow[] {
  const youth = ageBand(age) === "youth";
  const max = maxDistance(sport, pos, age, p, s);
  const pd = positionDistance(sport, pos, age, s);
  const base = standardLadder(sport, pos, age, s).filter((r) => r.part !== "come_in");
  const stretch = row(`Long toss — stretch out with arc to ${max} ft`, max, youth ? 6 : 9, "stretch_out", "moderate");
  const pulls = pullDowns(max - 15, pd, youth ? Math.min(5, pullDownCount(age, p, s)) : 12, youth);
  return [...base, stretch, ...pulls, row(`Catch play — come back in (${LADDER[sport].comeIn} ft easy)`, LADDER[sport].comeIn, 5, "come_in")];
}

/** Arm-strength day: ladder → stretch-out to max × 8–12 → pull-downs (progressed) → 60 × 5 easy. */
export function armStrengthDay(sport: CPSport, pos: CPPosition, age: number | null, p: Progress, s = DEFAULT_CATCH_PLAY_STANDARDS): CatchPlayRow[] {
  const band = ageBand(age);
  const max = maxDistance(sport, pos, age, p, s);
  const pd = positionDistance(sport, pos, age, s);
  const base = standardLadder(sport, pos, age, s).filter((r) => r.part !== "come_in");
  const stretch = row(`Long toss (arm strength) — stretch out with arc to ${max} ft`, max, band === "youth" ? 8 : band === "teen" ? 10 : 12, "stretch_out", "moderate");
  const pulls = pullDowns(max - 15, Math.min(pd, 60), pullDownCount(age, p, s), band === "youth");
  return [...base, stretch, ...pulls, row(`Catch play — come back in (${LADDER[sport].comeIn} ft easy)`, LADDER[sport].comeIn, 5, "come_in")];
}

// ------------------------------------------------------------------ BUILD-UP LADDER

export const BUILD_UP_STEPS: Record<CPSport, { IF: number[]; OF: number[] }> = {
  baseball: { IF: [45, 60, 90, 120], OF: [45, 60, 90, 120, 150, 180] },
  softball: { IF: [30, 45, 60, 75, 90, 120], OF: [30, 45, 60, 75, 90, 120, 150] },
};

export interface CatchSession { date: string; maxDistanceFt: number; painFree: boolean; armFeelGood: boolean }

const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 86_400_000);

/** Green sessions needed to advance (youth AND 13–18 use the 3× slower youth greenlight). */
export function greenNeeded(age: number | null, s = DEFAULT_CATCH_PLAY_STANDARDS): number {
  return ageBand(age) === "adult" ? s.greenSessions : s.greenSessions * s.youthGreenMultiplier;
}

/** Consecutive most-recent green sessions at or beyond a distance. */
export function greenStreakAt(sessions: readonly CatchSession[], ft: number): number {
  let n = 0;
  for (const x of [...sessions].sort((a, b) => b.date.localeCompare(a.date))) {
    if (x.painFree && x.armFeelGood && x.maxDistanceFt >= ft) n++; else break;
  }
  return n;
}

export interface BuildUpInput {
  today: string;
  sessions: readonly CatchSession[];
  healedDate?: string | null;
  accountStartDate?: string | null;
}

/** Who walks the build-up ladder: new, returning after a layoff, or recently healed. */
export function needsBuildUp(i: BuildUpInput, s = DEFAULT_CATCH_PLAY_STANDARDS): boolean {
  const last = [...i.sessions].filter((x) => x.date < i.today).sort((a, b) => b.date.localeCompare(a.date))[0];
  if (i.healedDate && dayDiff(i.today, i.healedDate) <= s.buildUpHealedWithinDays) return true;
  if (!last) return !!i.accountStartDate; // brand-new account (an unknown history is NOT "new")
  return dayDiff(i.today, last.date) > s.buildUpLayoffDays;
}

/** Today's build-up distance: advance one step after the green rule at the current step. */
export function buildUpDistance(sport: CPSport, pos: CPPosition, age: number | null, sessions: readonly CatchSession[], since: string, s = DEFAULT_CATCH_PLAY_STANDARDS): number {
  const steps = BUILD_UP_STEPS[sport][pos === "OF" ? "OF" : "IF"].filter((ft) => ft <= Math.max(positionDistance(sport, pos, age, s), 45));
  const recent = sessions.filter((x) => x.date >= since);
  const need = greenNeeded(age, s);
  let i = 0;
  while (i < steps.length - 1 && greenStreakAt(recent, steps[i]) >= need) i++;
  return steps[i];
}

export function buildUpRows(sport: CPSport, distanceFt: number, age: number | null): CatchPlayRow[] {
  const youth = ageBand(age) === "youth";
  const L = LADDER[sport];
  const out = [row(`Build-up catch — feel (${L.feel} ft)`, Math.min(L.feel, distanceFt), youth ? 5 : 10, "feel")];
  for (const ft of [...L.build].filter((f) => f < distanceFt)) out.push(row(`Build-up catch — ${ft} ft`, ft, 5, "build"));
  if (distanceFt > L.feel) out.push(row(`Build-up catch — today's top step (${distanceFt} ft)`, distanceFt, youth ? 5 : 8, "position", "low", "easy, pain-free"));
  return out;
}

// ------------------------------------------------------------------ EARNING / GATES

export interface ArmEarnInput {
  today: string;
  age: number | null;
  /** Dates (YYYY-MM-DD) of arm pain or tightness flags. Undefined = unknown → not earned. */
  armFlagDates?: readonly string[];
  redCheckinDates?: readonly string[];
  armFeelGood?: boolean | null;
  /** Latest throwing analysis date, and the fault keys it recorded. */
  lastThrowingAnalysis?: { date: string; faultKeys: readonly string[] } | null;
  /** Dates any arm-risk finding first appeared. */
  armRiskFindingDates?: readonly string[];
  sessions?: readonly CatchSession[];
  positionDistanceFt: number;
}

export interface EarnResult { longToss: boolean; armStrength: boolean; regressed: boolean; reasons: string[]; unlockMessage: string | null }

/** Long toss needs (a) healthy check-ins + (c) lower-risk mechanics; arm strength adds (b) the green rule. */
export function earnStatus(i: ArmEarnInput, s = DEFAULT_CATCH_PLAY_STANDARDS): EarnResult {
  const reasons: string[] = [];
  const within = (d: string, days: number) => d <= i.today && dayDiff(i.today, d) < days;
  // 5. Auto-regress: any flag / red check-in / new arm-risk finding → standard catch play ≥ 1 week.
  const regressed = [...(i.armFlagDates ?? []), ...(i.redCheckinDates ?? []), ...(i.armRiskFindingDates ?? [])].some((d) => within(d, s.regressDays));
  if (i.armFlagDates == null || i.armFeelGood == null) reasons.push("We don't have your recent arm check-ins yet.");
  else if (i.armFlagDates.some((d) => within(d, s.healthyCheckinDays))) reasons.push(`You flagged arm pain or tightness in the last ${s.healthyCheckinDays} days.`);
  else if (!i.armFeelGood) reasons.push("Your arm feel isn't good today.");
  if ((i.redCheckinDates ?? []).some((d) => within(d, s.regressDays))) reasons.push("You had a red check-in this week.");
  const a = i.lastThrowingAnalysis;
  let unlockMessage: string | null = null;
  if (!a) { unlockMessage = "Record one throwing clip to unlock arm-strength days."; reasons.push("No throwing clip on file."); }
  else if (!within(a.date, s.analysisFreshDays)) { unlockMessage = "Record a new throwing clip to unlock arm-strength days."; reasons.push(`Your last throwing clip is older than ${s.analysisFreshDays} days.`); }
  else if (a.faultKeys.some((k) => s.armRiskFaults.includes(k))) reasons.push("Your last throwing clip showed an arm-risk mechanics finding. Clean it up first.");
  const healthyAndClean = reasons.length === 0 && !regressed;
  const green = (i.sessions ?? []).length > 0 && greenStreakAt(i.sessions ?? [], i.positionDistanceFt) >= greenNeeded(i.age, s);
  if (healthyAndClean && !green) reasons.push("Finish full catch play to your position distance pain-free two sessions in a row.");
  if (regressed) reasons.unshift("Back to standard catch play for at least 1 week, then earn it again.");
  return { longToss: healthyAndClean, armStrength: healthyAndClean && green, regressed, reasons, unlockMessage };
}

// ------------------------------------------------------------------ THE DAY

export interface CatchPlayDayInput {
  date: string;
  sport: CPSport;
  position: CPPosition;
  age: number | null;
  phase: CPPhase;
  isPitcher: boolean;
  pitcherRole?: "starter" | "reliever" | "closer" | null;
  /** Pitcher's day in the role cycle. */
  pitcherDay?: "bullpen" | "long_toss" | "start" | "start_tomorrow" | "start_in_2" | "other" | null;
  restDay: boolean;
  gameToday: boolean;
  gameYesterday: boolean;
  gameTomorrow: boolean;
  heavyYesterday: boolean;
  /** True when yesterday or tomorrow is planned as a high-intent throwing day. */
  highIntentAdjacent?: boolean;
  lowReadiness: boolean;
  /** Training-day index within the week, 0 = first training day after the rest day. */
  trainingDayIndex: number;
  earn: EarnResult;
  progress: Progress;
  buildUp?: { active: boolean; distanceFt: number } | null;
  standards?: CatchPlayStandards;
}

export interface CatchPlayDay {
  kind: CPDayKind;
  rows: CatchPlayRow[];
  totalThrows: number;
  reachesPositionDistance: boolean;
  /** Plain reason shown when Defense throws or a longer day are held back. */
  because: string[];
}

const LT_SLOTS: Record<number, number[]> = { 0: [], 1: [2], 2: [1, 4], 3: [0, 2, 4] };

function done(kind: CPDayKind, rows: CatchPlayRow[], pd: number, because: string[] = []): CatchPlayDay {
  return { kind, rows, totalThrows: rows.reduce((n, r) => n + r.throws, 0), reachesPositionDistance: rows.some((r) => r.distanceFt >= pd && r.part !== "pull_down"), because };
}

export function catchPlayDay(i: CatchPlayDayInput): CatchPlayDay {
  const s = i.standards ?? DEFAULT_CATCH_PLAY_STANDARDS;
  const pd = positionDistance(i.sport, i.position, i.age, s);
  if (i.restDay) return done("none", [], pd, ["Rest day — no throwing."]);
  if (i.gameToday) return done("light", lightCatch(i.sport, i.age).slice(0, 3), pd, ["Game today — save the real throws for the game."]);
  if (i.buildUp?.active) {
    const rows = buildUpRows(i.sport, i.buildUp.distanceFt, i.age);
    const b = rows.some((r) => r.distanceFt >= pd) ? [] : [`You're building your arm back up (today's top step is ${i.buildUp.distanceFt} ft). Defense stays dry until catch play reaches ${pd} ft two sessions in a row.`];
    return done("build_up", rows, pd, b);
  }
  if (i.lowReadiness || i.gameYesterday || i.heavyYesterday) {
    return done("light", lightCatch(i.sport, i.age), pd, [i.lowReadiness ? "Low readiness today — light catch only." : "Day after a game or heavy day — light catch only."]);
  }
  if (i.isPitcher) {
    if (i.pitcherDay === "bullpen") return done("pitcher_interval", pitcherIntervalWarmup(i.sport), pd);
    const starterLT = i.pitcherRole === "starter" && i.pitcherDay === "long_toss";
    const pen = i.pitcherRole !== "starter" && i.phase === "off" && i.trainingDayIndex === 2;
    const blocked = i.pitcherDay === "start_tomorrow" || i.pitcherDay === "start_in_2" || i.highIntentAdjacent;
    if ((starterLT || pen) && !blocked && i.earn.armStrength && s.armStrengthPerWeek[i.phase] > 0) return done("arm_strength", armStrengthDay(i.sport, i.position, i.age, i.progress, s), pd);
    if (starterLT && i.earn.longToss) return done("long_toss", longTossDay(i.sport, i.position, i.age, i.progress, s), pd);
    return done("standard", standardLadder(i.sport, i.position, i.age, s), pd, i.earn.unlockMessage ? [i.earn.unlockMessage] : []);
  }
  // Position players: long-toss slots by phase; the first slot may become an arm-strength day.
  const slots = LT_SLOTS[Math.min(3, s.longTossPerWeek[i.phase])] ?? [];
  const isSlot = slots.includes(i.trainingDayIndex);
  const adjacentGame = i.gameTomorrow || i.gameYesterday;
  if (isSlot && !adjacentGame && !i.highIntentAdjacent) {
    const asSlots = slots.slice(0, Math.min(s.armStrengthPerWeek[i.phase], ageBand(i.age) === "youth" ? 1 : 2));
    if (asSlots.includes(i.trainingDayIndex) && i.earn.armStrength) return done("arm_strength", armStrengthDay(i.sport, i.position, i.age, i.progress, s), pd);
    if (i.earn.longToss) return done("long_toss", longTossDay(i.sport, i.position, i.age, i.progress, s), pd);
    return done("standard", standardLadder(i.sport, i.position, i.age, s), pd, i.earn.reasons.slice(0, 1).concat(i.earn.unlockMessage ? [i.earn.unlockMessage] : []).filter((x, k, a) => a.indexOf(x) === k));
  }
  return done("standard", standardLadder(i.sport, i.position, i.age, s), pd);
}

/** 7. Readiness gate: Defense throws only when today's full catch play reaches the position distance
 *  and fits the arm budget. Otherwise Defense is dry work with the reason shown plainly. */
export function defenseThrowsAllowed(day: CatchPlayDay, budgetThrowsLeft: number | null): { allowed: boolean; because: string | null } {
  if (day.kind === "none") return { allowed: false, because: "Rest day — no throwing." };
  if (!day.reachesPositionDistance) return { allowed: false, because: day.because[0] ?? "Today's catch play doesn't reach your position distance, so Defense is reads, hands and footwork only." };
  if (budgetThrowsLeft != null && budgetThrowsLeft < day.totalThrows) return { allowed: false, because: "Full catch play doesn't fit today's throw limit, so Defense is reads, hands and footwork only." };
  return { allowed: true, because: null };
}
