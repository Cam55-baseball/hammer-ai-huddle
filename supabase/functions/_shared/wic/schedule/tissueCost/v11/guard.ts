// TCS v1.1 §1 — circuit breaker. Nothing ever comes up empty.
// Pure code, tests only. Not wired into any generator, edge function or client.

import { TCS_CONFIG, TCS_CONFIG_HASH, TCS_VERSION } from "../config.ts";
import { decide } from "../decide.ts";
import { addDays, fullRestDaysBetween, isValidDate, zeroTanks } from "../tanks.ts";
import {
  type AllowedClass,
  type CheckIn,
  type DaySchedule,
  type Decision,
  type Profile,
  type TcsConfig,
} from "../types.ts";

export const TCS_GUARD_VERSION = "tcs_guard_v1_1";
/** §1: a run over this budget falls back. */
export const GUARD_BUDGET_MS = 200;
/** §1: fallback spacing — 3 full rest days, class M at most. */
export const FALLBACK_REST_DAYS = 3;
export const FALLBACK_REASON = "Standard spacing today.";
/** §1: alert threshold on the fallback rate. */
export const FALLBACK_ALERT_RATE = 0.005;

export interface GuardedDecision extends Decision {
  /** True when the fallback decision was returned instead of the engine's. */
  fallbackUsed: boolean;
  fallbackCause: "none" | "exception" | "timeout" | "invalid_output";
}

function lastLiftDate(history: DaySchedule[]): string | null {
  let best: string | null = null;
  for (const d of history ?? []) {
    if (!d || typeof d !== "object") continue;
    if (!d.lift || d.lift.skipped) continue;
    if (!isValidDate(d.date)) continue;
    if (best === null || d.date > best) best = d.date;
  }
  return best;
}

/** §1 fallback: 3 full rest days after the last lift, class M at most. */
export function fallbackDecision(
  history: DaySchedule[],
  today: string,
  cause: GuardedDecision["fallbackCause"],
  inputsHash: string,
): GuardedDecision {
  const last = lastLiftDate(Array.isArray(history) ? history : []);
  const validToday = isValidDate(today);
  const rested = !last || !validToday
    ? true
    : fullRestDaysBetween(last, today) >= FALLBACK_REST_DAYS;
  const nextHeavy = validToday
    ? (rested ? today : addDays(last as string, FALLBACK_REST_DAYS + 1))
    : null;

  return {
    allowedClass: rested ? "M" : "none",
    timing: rested ? "after_skill_work" : "none",
    nextHeavyDate: nextHeavy,
    tankLevels: zeroTanks(),
    reasons: [FALLBACK_REASON],
    floorsApplied: rested ? [] : ["fallback_3_full_rest_days"],
    loadPatternSignal: false,
    diagnostics: [`fallback:${cause}`, "tcs_circuit_breaker"],
    version: TCS_VERSION,
    configHash: TCS_CONFIG_HASH,
    inputsHash,
    fallbackUsed: true,
    fallbackCause: cause,
  };
}

const VALID_CLASSES: AllowedClass[] = ["H", "M", "L", "none"];

/** An output is invalid if any field is missing, NaN or outside its domain. */
export function isValidDecision(d: unknown): d is Decision {
  if (!d || typeof d !== "object") return false;
  const x = d as Decision;
  if (!VALID_CLASSES.includes(x.allowedClass)) return false;
  if (!["after_skill_work", "post_game", "none"].includes(x.timing)) return false;
  if (x.nextHeavyDate !== null && !isValidDate(x.nextHeavyDate)) return false;
  if (!x.tankLevels || typeof x.tankLevels !== "object") return false;
  for (const t of ["nerve", "muscle", "connective", "arm"] as const) {
    const v = (x.tankLevels as Record<string, unknown>)[t];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return false;
  }
  if (!Array.isArray(x.reasons) || x.reasons.length < 1) return false;
  if (x.reasons.some((r) => typeof r !== "string" || r.trim() === "")) return false;
  if (!Array.isArray(x.floorsApplied) || !Array.isArray(x.diagnostics)) return false;
  if (typeof x.version !== "string" || typeof x.configHash !== "string") return false;
  return true;
}

export interface GuardOptions {
  /** Injected clock — the guard is the only place a clock is read. */
  now?: () => number;
  budgetMs?: number;
}

/**
 * §1 — run decide() inside the circuit breaker.
 * Exception, over-budget run or invalid output → the fallback decision.
 */
export function decideGuarded(
  profile: Profile,
  history: DaySchedule[],
  calendar: DaySchedule[],
  checkIns: CheckIn[],
  config: TcsConfig = TCS_CONFIG,
  today = "",
  timezone = "UTC",
  options: GuardOptions = {},
): GuardedDecision {
  const now = options.now ?? (() => Date.now());
  const budget = options.budgetMs ?? GUARD_BUDGET_MS;
  const started = now();
  let out: Decision | null = null;
  try {
    out = decide(profile, history, calendar, checkIns, config, today, timezone);
  } catch {
    return fallbackDecision(history, today, "exception", "unavailable");
  }
  const elapsed = now() - started;
  if (!isValidDecision(out)) {
    return fallbackDecision(history, today, "invalid_output", out?.inputsHash ?? "unavailable");
  }
  if (elapsed > budget) {
    return fallbackDecision(history, today, "timeout", out.inputsHash);
  }
  return { ...out, fallbackUsed: false, fallbackCause: "none" };
}

/** Monitoring helper — §1 alert if the fallback rate exceeds 0.5%. */
export function fallbackRateAlert(fallbacks: number, total: number): {
  rate: number;
  alert: boolean;
} {
  const rate = total > 0 ? fallbacks / total : 0;
  return { rate, alert: rate > FALLBACK_ALERT_RATE };
}
