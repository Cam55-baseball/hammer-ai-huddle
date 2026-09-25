// Step 26 / Step 27 — youth throwing limits, growth-adjusted pitching age,
// the Hammers offseason-to-off-days ratio, readiness-based pitch progression
// and readiness-gated velocity work. Pure: budgets, flags and labels only,
// never a dose. Baseball only — windmill limits live in armLedger.ts and no
// number here transfers to softball.
//
// Removed by owner order (Step 27 A): the fixed annual rest rule, the
// pitch-type age-unlock table and the under-14 velocity block. Do not re-add.

export const YOUTH_THROWING_VERSION = "youth_throwing_v1";

// ── Pitch Smart bands (daily max + required rest), youngest first ───────────
export interface AgeBand { label: string; minAge: number; maxAge: number; dailyMax: number; rest: Array<[number, number]> }
/** rest: [minPitches, restDays] — pitches at or above the threshold need that many days. */
export const PITCH_SMART_BANDS: AgeBand[] = [
  { label: "7–8", minAge: 0, maxAge: 8, dailyMax: 50, rest: [[1, 0], [21, 1], [36, 2], [51, 3], [66, 4]] },
  { label: "9–10", minAge: 9, maxAge: 10, dailyMax: 75, rest: [[1, 0], [21, 1], [36, 2], [51, 3], [66, 4]] },
  { label: "11–12", minAge: 11, maxAge: 12, dailyMax: 85, rest: [[1, 0], [21, 1], [36, 2], [51, 3], [66, 4]] },
  { label: "13–14", minAge: 13, maxAge: 14, dailyMax: 95, rest: [[1, 0], [21, 1], [36, 2], [51, 3], [66, 4]] },
  { label: "15–16", minAge: 15, maxAge: 16, dailyMax: 95, rest: [[1, 0], [31, 1], [46, 2], [61, 3], [76, 4]] },
  { label: "17–18", minAge: 17, maxAge: 18, dailyMax: 105, rest: [[1, 0], [31, 1], [46, 2], [61, 3], [81, 4]] },
  { label: "19–22", minAge: 19, maxAge: 200, dailyMax: 120, rest: [[1, 0], [31, 1], [46, 2], [61, 3], [81, 4]] },
];
export function bandIndex(age: number): number {
  const i = PITCH_SMART_BANDS.findIndex((b) => age >= b.minAge && age <= b.maxAge);
  return i < 0 ? PITCH_SMART_BANDS.length - 1 : i;
}
export function restDaysFor(band: AgeBand, pitches: number): number {
  let d = 0;
  for (const [min, days] of band.rest) if (pitches >= min) d = days;
  return d;
}

// ── B. Growth-adjusted pitching age (Hammers rule, E3) ──────────────────────
export const GROWTH_RULE = {
  inchTrigger: 1,
  windowDays: 30,
  weeksPerInch: 8,
  evidence: "E3",
  staffLabel: "growth-adjusted pitching age",
  athleteLine: "You've grown fast, so we're keeping your arm's workload where a slightly younger arm would sit for a few weeks.",
  grounding:
    "Hammers rule. Published youth work names velocity, height and weight as possible injury predictors among young pitchers, and growth plates as the vulnerable tissue; the advice is to watch the pitcher who grows before his ligament catches up. The eight-week window is our own rule, not a published figure.",
} as const;

export interface HeightCheck { date: string; inches: number }
export interface GrowthAdjustment {
  active: boolean;
  bandsDropped: number;
  until: string | null;
  band: AgeBand;
  realBand: AgeBand;
  capHighIntent: boolean;
  holdVolumeProgression: boolean;
  staffLabel: string | null;
  athleteLine: string | null;
  grounding: string | null;
}
const dayMs = 86_400_000;
const toMs = (d: string) => new Date(d + "T00:00:00Z").getTime();
const isoAdd = (d: string, n: number) => new Date(toMs(d) + n * dayMs).toISOString().slice(0, 10);

/**
 * Each growth spurt of ≥1 in inside ~30 days opens (or extends) the window by
 * 8 weeks per whole inch; each inch can drop one more band. Floor = youngest band.
 */
export function growthAdjustment(age: number, heights: HeightCheck[], today: string): GrowthAdjustment {
  const real = bandIndex(age);
  const sorted = [...heights].sort((a, b) => a.date.localeCompare(b.date));
  let until: string | null = null;
  let inches = 0;
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    // Earliest reading within the window before this one.
    const base = sorted.slice(0, i).find((p) => toMs(cur.date) - toMs(p.date) <= (GROWTH_RULE.windowDays + 3) * dayMs);
    if (!base) continue;
    const grown = cur.inches - base.inches;
    if (grown < GROWTH_RULE.inchTrigger) continue;
    const whole = Math.floor(grown + 1e-9);
    const end = isoAdd(cur.date, whole * GROWTH_RULE.weeksPerInch * 7);
    if (end <= today) continue;
    if (!until || end > until) until = end;
    inches = Math.max(inches, whole);
  }
  const active = until !== null && until > today;
  const dropped = active ? Math.min(inches, real) : 0;
  const band = PITCH_SMART_BANDS[real - dropped];
  return {
    active,
    bandsDropped: dropped,
    until: active ? until : null,
    band,
    realBand: PITCH_SMART_BANDS[real],
    capHighIntent: active,
    holdVolumeProgression: active,
    staffLabel: active ? `${GROWTH_RULE.staffLabel}: ${band.label} (real ${PITCH_SMART_BANDS[real].label}) until ${until}` : null,
    athleteLine: active ? GROWTH_RULE.athleteLine : null,
    grounding: active ? GROWTH_RULE.grounding : null,
  };
}

// ── C1/C2. Weekly, season, annual pitch caps and the innings cap ────────────
export interface PitchCaps { weekly: number; season: number; annual: number; annualInnings: number | null }
/** Owner-tunable. Ages outside the published rows get no weekly/season/annual cap here (Pitch Smart daily still applies). */
export const YOUTH_CAPS: Array<{ minAge: number; maxAge: number; caps: PitchCaps }> = [
  { minAge: 11, maxAge: 12, caps: { weekly: 100, season: 1000, annual: 3000, annualInnings: 100 } },
  { minAge: 13, maxAge: 14, caps: { weekly: 125, season: 1000, annual: 3000, annualInnings: 100 } },
];
export const ANNUAL_LOW_11_12 = 2000; // the published range is 2,000–3,000; warn from 2,000
export const CAP_WARN_AT = 0.8;
/** 100 competitive innings a calendar year for high school and younger. */
export function inningsCap(age: number, level: string | null): number | null {
  const hsOrYounger = age <= 18 && !/college|pro|professional|free_agent/i.test(level ?? "");
  return hsOrYounger ? 100 : null;
}
export function capsFor(age: number): PitchCaps | null {
  return YOUTH_CAPS.find((r) => age >= r.minAge && age <= r.maxAge)?.caps ?? null;
}

export interface Usage { week: number; season: number; year: number; inningsYear: number }
export interface CapVerdict { blocked: boolean; remainingToday: number | null; warnings: string[]; blocks: string[] }

/** Returns how many more pitches the caps allow; a full cap blocks further pitching. */
export function checkCaps(age: number, level: string | null, used: Usage, plannedPitches: number, plannedInnings = 0): CapVerdict {
  const warnings: string[] = [];
  const blocks: string[] = [];
  const caps = capsFor(age);
  let remaining: number | null = null;
  const take = (label: string, u: number, cap: number, warnFrom = cap * CAP_WARN_AT) => {
    const left = cap - u;
    remaining = remaining === null ? left : Math.min(remaining, left);
    if (u >= cap) blocks.push(`${label} pitch cap reached (${u}/${cap})`);
    else if (u + plannedPitches > cap) blocks.push(`${label} pitch cap would be passed (${u + plannedPitches}/${cap})`);
    else if (u + plannedPitches >= warnFrom) warnings.push(`${label} pitch cap filling (${u + plannedPitches}/${cap})`);
  };
  if (caps) {
    take("Weekly", used.week, caps.weekly);
    take("Season", used.season, caps.season);
    take("Yearly", used.year, caps.annual, age <= 12 ? ANNUAL_LOW_11_12 : caps.annual * CAP_WARN_AT);
  }
  const ic = inningsCap(age, level);
  if (ic !== null) {
    if (used.inningsYear >= ic) blocks.push(`Yearly innings cap reached (${used.inningsYear}/${ic})`);
    else if (used.inningsYear + plannedInnings > ic) blocks.push(`Yearly innings cap would be passed (${used.inningsYear + plannedInnings}/${ic})`);
    else if (used.inningsYear + plannedInnings >= ic * CAP_WARN_AT) warnings.push(`Yearly innings filling (${used.inningsYear + plannedInnings}/${ic})`);
  }
  return { blocked: blocks.length > 0, remainingToday: remaining === null ? null : Math.max(0, remaining), warnings, blocks };
}

// ── C5. Pitched while fatigued ─────────────────────────────────────────────
export interface FatigueSignals { checkInFatigued?: boolean; veloDropPct?: number | null; strikePctDrop?: number | null }
export const FATIGUE_VELO_DROP = 0.05;   // owner-tunable: ≥5% below the outing's early velocity
export const FATIGUE_COMMAND_DROP = 0.15; // owner-tunable: strike rate down ≥15 points
export function fatigueFlag(s: FatigueSignals): { flagged: boolean; stopOuting: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (s.checkInFatigued) reasons.push("You said your arm feels tired today");
  if ((s.veloDropPct ?? 0) >= FATIGUE_VELO_DROP) reasons.push("Velocity dropped off during the outing");
  if ((s.strikePctDrop ?? 0) >= FATIGUE_COMMAND_DROP) reasons.push("Command dropped off during the outing");
  const flagged = reasons.length > 0;
  // Pitching while fatigued is the strongest reported risk factor for arm surgery in young pitchers.
  return { flagged, stopOuting: flagged, reasons };
}

// ── C6. Pitcher who also catches ───────────────────────────────────────────
export const PITCHER_CATCHER_SHARE = 0.7; // tightened from 0.85 (owner-tunable)
/** Athlete copy — never states an injury statistic. */
export const PITCHER_CATCHER_LINE =
  "Pitching and catching together is one of the heaviest arm workloads in the game, so we budget it tightly.";
/** Staff view only — research note with its source (correlation, not a prediction). */
export const PITCHER_CATCHER_STAFF_NOTE =
  "Research note: in 384 high school pitchers from 51 teams, those who also played catcher had an upper-extremity injury proportion of 15% vs 5% (rate ratio 2.9, 95% CI 1.03–8.12). Hibberd EE et al., \"Rate of Upper Extremity Injury in High School Baseball Pitchers Who Played Catcher as a Secondary Position,\" Journal of Athletic Training, 2018. Correlation in a high school cohort, not a prediction.";
/** Staff view only — source for the 100-innings-per-year cap. */
export const INNINGS_CAP_STAFF_NOTE =
  "Research note: youth pitchers who threw more than 100 innings in a year were about 3.5 times more likely to be injured (95% CI 1.16–10.44). Fleisig GS et al., Am J Sports Med 2011;39(2):253-257. Correlation, not a prediction.";

// ── C7. Overlapping teams ──────────────────────────────────────────────────
export interface TeamSeason { team: string; start: string; end: string }
export function overlappingTeams(seasons: TeamSeason[], today: string): { overlap: boolean; teams: string[]; warning: string | null } {
  const live = seasons.filter((s) => s.start <= today && s.end >= today);
  const teams = [...new Set(live.map((s) => s.team))];
  const overlap = teams.length >= 2;
  return {
    overlap,
    teams,
    warning: overlap ? `You're on ${teams.length} teams at once. All your pitches count against one set of limits.` : null,
  };
}
/** Combined usage across every team — the single stricter limit, never per-team budgets. */
export function combineUsage(perTeam: Usage[]): Usage {
  return perTeam.reduce((a, u) => ({ week: a.week + u.week, season: a.season + u.season, year: a.year + u.year, inningsYear: a.inningsYear + u.inningsYear }), { week: 0, season: 0, year: 0, inningsYear: 0 });
}

// ── Step 27 B. Hammers offseason-to-off-days ratio (E3) ────────────────────
export interface BreakSignals {
  age: number | null;
  growthFlag?: boolean;
  painLast90d?: boolean;
  heavyLastSeason?: boolean | null;     // innings / pitch counts above the athlete's band norm
  armTankLow?: boolean | null;
  poorPriorBreakTolerance?: boolean | null;
  immature?: boolean | null;
}
export const BREAK_RATIO = { base: 4, u18Min: 5, u18Max: 8, evidence: "E3" } as const;
/**
 * 4 no-throw days per month of downtime. Under 18 the ratio may rise to 5–8 a
 * month, chosen from the athlete's own signals — never a flat number.
 * Unknown signals never lower the ratio.
 */
export function offseasonBreakDays(downtimeDays: number, s: BreakSignals): { days: number; perMonth: number; months: number; reasons: string[]; rule: string } {
  const months = Math.ceil(Math.max(0, downtimeDays) / 30 - 1e-9);
  const reasons: string[] = [];
  let perMonth: number = BREAK_RATIO.base;
  if (s.age !== null && s.age < 18) {
    const signals: Array<[boolean | null | undefined, string]> = [
      [s.age <= 14 || s.immature, "younger or still maturing"],
      [s.growthFlag, "growing fast"],
      [s.painLast90d, "arm pain in the last 90 days"],
      [s.heavyLastSeason, "heavy innings or pitch counts last season"],
      [s.armTankLow, "arm tank low"],
      [s.poorPriorBreakTolerance, "last break or ramp didn't go smoothly"],
    ];
    const hits = signals.filter(([v]) => v === true);
    hits.forEach(([, r]) => reasons.push(r));
    if (hits.length > 0) perMonth = Math.min(BREAK_RATIO.u18Max, BREAK_RATIO.u18Min + hits.length - 1);
  }
  return {
    days: months * perMonth,
    perMonth,
    months,
    reasons,
    rule: `Hammers rule: ${perMonth} no-throw days per month of downtime${reasons.length ? ` (${reasons.join(", ")})` : ""}.`,
  };
}

// ── Step 27 C. Readiness-based pitch progression (no birthdays) ────────────
export interface PitchReadiness {
  commandAtIntent: boolean;
  cleanMechanics: boolean;
  capacityMarkersMet: boolean;
  painLast30d: boolean;
  insideBudget: boolean;
  growthWindow: boolean;
}
export function pitchUnlock(r: PitchReadiness): { unlocked: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!r.commandAtIntent) missing.push("command of your current pitches");
  if (!r.cleanMechanics) missing.push("clean mechanics markers");
  if (!r.capacityMarkersMet) missing.push("arm capacity markers");
  if (r.painLast30d) missing.push("30 days with no arm pain");
  if (!r.insideBudget) missing.push("arm tank and weekly volume inside budget");
  if (r.growthWindow) missing.push("finish the growth window");
  return { unlocked: missing.length === 0, missing };
}
/** New pitch share of an outing by build step; any pain or fatigue flag steps back one. */
export const NEW_PITCH_SHARE = [0.1, 0.15, 0.2, 0.25] as const;
export function newPitchStep(currentStep: number, cleanOuting: boolean, painOrFatigue: boolean): { step: number; share: number } {
  const max = NEW_PITCH_SHARE.length - 1;
  const step = painOrFatigue ? Math.max(0, currentStep - 1) : cleanOuting ? Math.min(max, currentStep + 1) : currentStep;
  return { step, share: NEW_PITCH_SHARE[step] };
}

// ── Step 27 D. Readiness-gated velocity work, all ages ─────────────────────
export interface VeloReadiness { rampComplete: boolean; capacityMarkersMet: boolean; painFlag: boolean; insideBudgets: boolean; growthWindow: boolean }
export function velocityGate(r: VeloReadiness): { unlocked: boolean; missing: string[]; withMechanics: true } {
  const missing: string[] = [];
  if (!r.rampComplete) missing.push("finish your throwing ramp");
  if (!r.capacityMarkersMet) missing.push("arm capacity markers");
  if (r.painFlag) missing.push("no arm pain");
  if (!r.insideBudgets) missing.push("stay inside your daily and weekly budget");
  if (r.growthWindow) missing.push("finish the growth window");
  // Mechanics work is always prescribed alongside velocity work, never after it.
  return { unlocked: missing.length === 0, missing, withMechanics: true };
}
