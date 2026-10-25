import type { RxReplaceFacts } from "./prescriptionSafety.ts";

export interface CoachGuidelineWarning {
  code: string;
  date: string;
  rule: string;
  player_id?: string;
  /** Arm-health or active pain/injury finding from the existing judges. */
  medical?: boolean;
  /** Under-18 athletes: Okay requires a typed reason and a parent notice. */
  requires_reason?: boolean;
}

export function isCoachPrescriptionDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Presentation of findings from existing judges, never a new training judge. */
export function factGuidelineWarnings(facts: RxReplaceFacts): CoachGuidelineWarning[] {
  const warnings: CoachGuidelineWarning[] = [];
  if (facts.isRestDay) warnings.push({ code: "rest_day", date: facts.date, rule: "This is a scheduled rest day. Training is normally held that day." });
  if (facts.gameOnDate && facts.intensity !== "light") warnings.push({ code: "game_day", date: facts.date, rule: "A game is scheduled on this date. Only light work is normally planned." });
  if (facts.inSeason && facts.gameNextDay && facts.intensity === "high") {
    const next = new Date(`${facts.date}T12:00:00Z`); next.setUTCDate(next.getUTCDate() + 1);
    warnings.push({ code: "before_game", date: facts.date, rule: `This is the day before the game on ${next.toISOString().slice(0, 10)}. Max-effort work is normally held that day.` });
  }
  return warnings;
}

export const ADVISORY_PLAN_RULES: ReadonlySet<string> = new Set([
  "rest_day", "lift_spacing", "weekly_lift_max", "trained_elsewhere_today",
  "run_before_game", "run_spacing", "jump_spacing", "bat_consecutive",
]);

/** Arm-health and active pain/injury findings. Presentation of the existing
 *  judges (arm ledger / pitch-count rest and the daily injury flag), never a
 *  new training judge. Overridable with a recorded acknowledgement; for
 *  under-18 athletes the acknowledgement requires a typed reason and the
 *  linked parent is notified. */
export function medicalFactWarnings(facts: RxReplaceFacts): CoachGuidelineWarning[] {
  const warnings: CoachGuidelineWarning[] = [];
  if (facts.injuryMode) warnings.push({ code: "injury_flag", date: facts.date, medical: true, rule: "An active pain or injury flag is recorded for this player. Training is normally held until it clears." });
  if (facts.nextThrowDate && facts.nextThrowDate > facts.date) warnings.push({ code: "arm_rest", date: facts.date, medical: true, rule: `Arm-health rest: throwing is normally held until ${facts.nextThrowDate} based on recent pitch counts.` });
  return warnings;
}

export const MIN_OVERRIDE_REASON = 10;
/** Missing facts stay missing: no readiness score or workload limit is invented. */
export function missingCoachFactWarning(date: string, fact: "check_in" | "workload_limit"): CoachGuidelineWarning {
  return { code: "missing_facts", date, rule: fact === "check_in"
    ? "Today's check-in is missing, so readiness wasn't checked. Proceed?"
    : "Today's workload limit is missing or invalid, so the workload cap wasn't checked. Proceed?" };
}
/** Format an existing judge's numeric result; never infer a weekly cap from a daily cap. */
export function workloadWarning(date: string, planned: number, cap: number): CoachGuidelineWarning {
  const percentage = cap > 0 ? `${Math.round(planned / cap * 100)}% of` : "above";
  return { code: "workload_cap", date, rule: `This puts today's workload at ${planned} units — ${percentage} the ${cap}-unit daily workload cap.` };
}
export function overrideReasonOk(reason: unknown): reason is string {
  return typeof reason === "string" && reason.trim().length >= MIN_OVERRIDE_REASON;
}

/** Clears advisory and medical findings so the remaining checks are the
 *  hard gates: connection/consent/legal, same-category, workload, age and
 *  growth rules. */
export function factsWithoutWarnings(facts: RxReplaceFacts): RxReplaceFacts {
  return { ...factsWithoutAdvisories(facts), injuryMode: false, nextThrowDate: null };
}

export function warningKeys(warnings: readonly CoachGuidelineWarning[]): string[] {
  return [...new Set(warnings.map(w => JSON.stringify([w.player_id ?? null, w.date, w.code, w.rule])))].sort();
}

/** An acknowledgement is bound to every current finding, recipient and date. */
export function warningsAcknowledged(warnings: readonly CoachGuidelineWarning[], acknowledged: unknown): boolean {
  if (!Array.isArray(acknowledged) || !acknowledged.every(k => typeof k === "string")) return false;
  return JSON.stringify([...new Set(acknowledged)].sort()) === JSON.stringify(warningKeys(warnings));
}

export function factsWithoutAdvisories(facts: RxReplaceFacts): RxReplaceFacts {
  return { ...facts, isRestDay: false, gameOnDate: false, gameNextDay: false };
}