/**
 * Step 13 Part A — release gates (these replace the Step 9 "3 nights / 14
 * nights" rule and the Step 12 three-green-night wait) and automatic safety.
 *
 * Pure. The same functions answer for the Control Center, for the tests and
 * for the nightly safety job, so the button and the robot can never disagree.
 *
 * Quality gate only, no waiting period:
 *   self            — the build's proofs passed AND last night's check is green.
 *   pilot | all     — the same, plus the version's 20,000-season pass. The
 *                     owner still confirms the change on screen.
 *
 * Automatic safety is unchanged from Step 12: a failed nightly shadow check, a
 * fallback rate above 0.5%, or card-build errors above the feature's normal
 * level each drop the switch down exactly one step (all → pilot → self → off).
 */

export type SwitchMode = "off" | "self" | "pilot" | "all";

export const FALLBACK_RATE_LIMIT = 0.005;
/** Kept for the health readout only — it is no longer a gate. */
export const GREEN_NIGHTS_FOR_WIDE = 3;

export type GateInputs = {
  /** The build's own test run passed with zero problems (Step 11 proofs). */
  proofsOk: boolean;
  /** The 20,000-season run for this engine version passed. */
  versionOk: boolean;
  /** Consecutive green nightly shadow checks, newest first. */
  greenNights: number;
  /** Last night's shadow check was green (no mismatches, fallback under the limit). */
  lastNightGreen: boolean;
  /** The owner pressed the button for this change (UI confirmation). */
  ownerConfirmed?: boolean;
};

export type GateResult = { ok: boolean; why: string; needsConfirm: boolean };

export function evaluateGate(mode: SwitchMode, g: GateInputs): GateResult {
  if (mode === "off") return { ok: true, why: "", needsConfirm: false };

  if (!g.proofsOk) {
    return { ok: false, why: "The tests for this build have not passed yet", needsConfirm: false };
  }
  if (!g.lastNightGreen) {
    return { ok: false, why: "Last night's check was not green", needsConfirm: false };
  }

  if (mode === "self") return { ok: true, why: "", needsConfirm: false };

  // pilot and all — quality gate only, no waiting period.
  if (!g.versionOk) {
    return { ok: false, why: "Needs the 20,000-season pass for this version", needsConfirm: false };
  }
  if (g.ownerConfirmed === false) {
    return { ok: false, why: "Waiting for you to confirm", needsConfirm: true };
  }
  return { ok: true, why: "", needsConfirm: true };
}

/** One step down the ladder. Off stays off. */
export function demote(mode: SwitchMode): SwitchMode {
  switch (mode) {
    case "all":
      return "pilot";
    case "pilot":
      return "self";
    case "self":
      return "off";
    default:
      return "off";
  }
}

export type AutoOffInputs = {
  mode: SwitchMode;
  /** Last nightly shadow check: null when none ran. */
  shadowCheck: { status: string; mismatches: number; fallbackRate: number } | null;
  /** Card-build errors recorded for this feature since the last check. */
  errorsToday: number;
  /** The feature's normal error level for a day. */
  baselineErrors: number;
  /**
   * Step 15 item 4 — critical watchdog notes recorded for this feature since
   * the last check (a card that failed to build, an empty card, or a movement
   * above the day's ceiling). Any one of them drops the switch a level.
   */
  criticalNotes?: number;
};

export type AutoOffResult = {
  demoted: boolean;
  fromMode: SwitchMode;
  toMode: SwitchMode;
  reason: string;
  trigger: "shadow_check_failed" | "fallback_rate" | "card_errors" | "critical_notes" | null;
};

export function evaluateAutoOff(i: AutoOffInputs): AutoOffResult {
  const none: AutoOffResult = {
    demoted: false,
    fromMode: i.mode,
    toMode: i.mode,
    reason: "",
    trigger: null,
  };
  if (i.mode === "off") return none;

  const c = i.shadowCheck;
  if (c && c.status !== "passed") {
    return hit(i, "shadow_check_failed", "Last night's check did not pass");
  }
  if (c && c.mismatches > 0) {
    return hit(i, "shadow_check_failed", `Last night's check found ${c.mismatches} mismatch(es)`);
  }
  if (c && c.fallbackRate > FALLBACK_RATE_LIMIT) {
    const pct = (c.fallbackRate * 100).toFixed(2);
    return hit(i, "fallback_rate", `Backup plan used on ${pct}% of days (limit 0.50%)`);
  }
  const criticals = i.criticalNotes ?? 0;
  if (criticals > 0) {
    return hit(
      i,
      "critical_notes",
      `${criticals} critical watchdog note(s) since the last check (failed card, empty card or a movement above the day's ceiling)`,
    );
  }
  if (i.errorsToday > i.baselineErrors) {
    return hit(
      i,
      "card_errors",
      `${i.errorsToday} card problem(s) today, above the normal ${i.baselineErrors}`,
    );
  }
  return none;
}

function hit(i: AutoOffInputs, trigger: NonNullable<AutoOffResult["trigger"]>, reason: string): AutoOffResult {
  return { demoted: true, fromMode: i.mode, toMode: demote(i.mode), reason, trigger };
}

/** A nightly check counts as green when it passed, matched, and stayed under the fallback limit. */
export function checkIsGreen(
  c: { status: string; mismatches: number; fallbackRate: number } | null | undefined,
): boolean {
  if (!c) return false;
  return c.status === "passed" && c.mismatches === 0 && c.fallbackRate <= FALLBACK_RATE_LIMIT;
}

/** Consecutive green nights, newest first. */
export function countGreenNights(
  checks: Array<{ status: string; mismatches: number; fallbackRate: number }>,
): number {
  let n = 0;
  for (const c of checks) {
    if (checkIsGreen(c)) n++;
    else break;
  }
  return n;
}
