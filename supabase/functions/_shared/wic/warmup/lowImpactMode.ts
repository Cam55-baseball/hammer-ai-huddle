/**
 * Owner Nov 4: NEED-BASED low-impact warm-up mode (never age-based).
 *
 * Detected from real facts each plan build. It changes ONLY the warm-up:
 * gentler versions in each role, no snap/plyo-style items, full-body rule kept.
 * It switches off by itself when the trigger clears. One plain "Because" line.
 *
 * Triggers:
 *  (a) "Where are you starting from?" last trained = Never / 6+ months ago,
 *      until their first green week (7 days with 3+ check-ins, none low,
 *      no pain) or until they have real logged training history.
 *  (b) In-season AND (3+ low-readiness check-ins in the last 7 days OR a
 *      workload spike by the existing running-readiness spike rule).
 *  (c) Within 4 weeks (28 days) after an injury is marked healed → that area;
 *      plus any day with an active pain flag (today/yesterday) in a
 *      previously injured area.
 *  (d) A red check-in today.
 *
 * Hook-free and pure so the server and the tests share it.
 */
export const LOW_READINESS = 0.4; // same line as the existing "low" readiness band
export const RETURN_WINDOW_DAYS = 28;
export const LATE_SEASON_LOW_DAYS = 3;
export const JUST_STARTING_ANSWERS: ReadonlySet<string> = new Set(["Never", "6+ months ago"]);

export type LowImpactTrigger = "returning_injury" | "red_checkin" | "late_season" | "just_starting";

export interface LowImpactFacts {
  today: string;
  lastTrained?: string | null;
  /** True when the player already has real logged training history. */
  hasTrainingHistory?: boolean;
  checkins: ReadonlyArray<{ date: string; readiness: number | null; painAreas?: ReadonlyArray<string> }> | null;
  seasonPhase: "off" | "pre" | "in" | "post" | null;
  loadSpike?: boolean;
  injuries?: ReadonlyArray<{ region: string; healedAt?: string | null; active?: boolean }>;
}

export interface LowImpactMode {
  active: boolean;
  triggers: LowImpactTrigger[];
  /** Body areas that get extra care and safe versions (trigger c). */
  areas: string[];
  /** One plain athlete line, or null when off. */
  because: string | null;
}

const OFF: LowImpactMode = { active: false, triggers: [], areas: [], because: null };
const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 86_400_000);
const norm = (s: string) => s.trim().toLowerCase().replace(/[_-]+/g, " ");
const sameArea = (a: string, b: string) => { const x = norm(a), y = norm(b); return !!x && !!y && (x.includes(y) || y.includes(x)); };
const low = (r: number | null) => r != null && r < LOW_READINESS;

/** A green week: some 7-day window before today with 3+ check-ins, none low, no pain. */
export function hasGreenWeek(checkins: LowImpactFacts["checkins"], today: string): boolean {
  if (!checkins) return false;
  const past = checkins.filter((c) => c.date < today);
  for (const start of past) {
    const win = past.filter((c) => c.date >= start.date && dayDiff(c.date, start.date) < 7);
    if (win.length >= 3 && win.every((c) => c.readiness != null && !low(c.readiness) && !(c.painAreas?.length))) return true;
  }
  return false;
}

export function lowImpactMode(f: LowImpactFacts): LowImpactMode {
  const triggers: LowImpactTrigger[] = [];
  const areas: string[] = [];
  const checkins = f.checkins ?? [];
  const todayCheck = checkins.filter((c) => c.date === f.today);

  // (c) returning from injury
  let backDays: number | null = null;
  let painInOldArea = false;
  for (const inj of f.injuries ?? []) {
    if (!inj.region || inj.active) continue;
    const healed = inj.healedAt ? String(inj.healedAt).slice(0, 10) : null;
    const d = healed ? dayDiff(f.today, healed) : null;
    const within = d != null && d >= 0 && d < RETURN_WINDOW_DAYS;
    const pain = checkins.some((c) => dayDiff(f.today, c.date) >= 0 && dayDiff(f.today, c.date) <= 1 && (c.painAreas ?? []).some((a) => sameArea(a, inj.region)));
    if (within || (healed && pain)) {
      if (!areas.includes(norm(inj.region))) areas.push(norm(inj.region));
      if (within && (backDays == null || d! < backDays)) backDays = d;
      if (pain) painInOldArea = true;
    }
  }
  if (areas.length) triggers.push("returning_injury");

  // (d) red check-in today
  if (todayCheck.some((c) => low(c.readiness))) triggers.push("red_checkin");

  // (b) late-season load
  if (f.seasonPhase === "in") {
    const lowDays = new Set(checkins.filter((c) => { const d = dayDiff(f.today, c.date); return d >= 0 && d < 7 && low(c.readiness); }).map((c) => c.date)).size;
    if (lowDays >= LATE_SEASON_LOW_DAYS || f.loadSpike === true) triggers.push("late_season");
  }

  // (a) just starting / long break
  if (f.lastTrained && JUST_STARTING_ANSWERS.has(f.lastTrained) && !f.hasTrainingHistory && !hasGreenWeek(f.checkins, f.today)) {
    triggers.push("just_starting");
  }

  if (!triggers.length) return OFF;
  return { active: true, triggers, areas, because: becauseLine(triggers[0], backDays, painInOldArea) };
}

function becauseLine(t: LowImpactTrigger, backDays: number | null, _pain: boolean): string {
  switch (t) {
    case "returning_injury":
      if (backDays == null) return "Easier warm-up today — you flagged pain where you were hurt before.";
      if (backDays < 7) return "Easier warm-up today — you're less than a week back from injury.";
      { const w = Math.floor(backDays / 7); return `Easier warm-up today — you're ${w} week${w === 1 ? "" : "s"} back from injury.`; }
    case "red_checkin": return "Easier warm-up today — today's check-in.";
    case "late_season": return "Easier warm-up today — a tough stretch of your season.";
    default: return "Easier warm-up today — you're just getting started.";
  }
}
