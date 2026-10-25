import type { RxReplaceFacts } from "./prescriptionSafety.ts";

export interface CoachGuidelineWarning {
  code: string;
  date: string;
  rule: string;
  player_id?: string;
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