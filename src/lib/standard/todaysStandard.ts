/**
 * Today's Standard — pure derivation.
 *
 * Single source of truth for the calm, plain-English sentence the athlete
 * should hold themselves to today. Read-only over canonical ASB rows; never
 * authors ledger truth. Used by:
 *   - IdentityCommandCard  (renders the sentence + motivational line)
 *   - CommunicationAI      (consumes for tone only, does NOT render the sentence)
 */
import { latestByTopicPrefix, projectLatest, isStale } from "@/lib/command/projections";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

export type StandardTone = "recover" | "protect" | "steady" | "push" | "rest";

export interface TodaysStandard {
  standard: string;          // short imperative, e.g. "Move with control."
  tone: StandardTone;
  rationale: string;         // one calm sentence
  motivational: string;      // one motivational closer tied to the standard
}

function scoreOf(ev: AsbEventRow | null): number | null {
  if (!ev) return null;
  const p = projectLatest<Record<string, unknown>>(ev);
  const v = p.value as any;
  const s = v?.score ?? v?.value ?? null;
  return typeof s === "number" ? s : null;
}

export type DayTypeHint = "rest" | "skip" | "push" | "standard" | null | undefined;

export function deriveTodaysStandard(
  rows: AsbEventRow[] | undefined,
  dayType: DayTypeHint,
  now: Date = new Date(),
): TodaysStandard {
  // Honor explicit day intent first
  if (dayType === "rest") {
    return {
      standard: "Protect your recovery today.",
      tone: "rest",
      rationale: "You declared rest — let the system reset before the next push.",
      motivational: "Recovery creates tomorrow's power.",
    };
  }
  if (dayType === "push") {
    return {
      standard: "Quality output, full intent.",
      tone: "push",
      rationale: "You declared push — raise the bar with clean, deliberate work.",
      motivational: "Hard work, done well, compounds.",
    };
  }

  const readinessEv = latestByTopicPrefix(rows, "behavioral.readiness");
  const fatigueEv = latestByTopicPrefix(rows, "behavioral.fatigue");
  const recoveryEv =
    latestByTopicPrefix(rows, "behavioral.recovery") ??
    latestByTopicPrefix(rows, "foundation.recovery");

  const readiness = scoreOf(readinessEv);
  const fatigue = scoreOf(fatigueEv);
  const recovery = scoreOf(recoveryEv);

  const readinessStale = isStale(readinessEv?.occurred_at ?? null, 36, now);
  const fatigueStale = isStale(fatigueEv?.occurred_at ?? null, 36, now);
  const recoveryStale = isStale(recoveryEv?.occurred_at ?? null, 48, now);

  const recoveryLow = recovery !== null && !recoveryStale && recovery < 0.45;
  const fatigueHigh = fatigue !== null && !fatigueStale && fatigue > 0.7;
  if (recoveryLow || fatigueHigh) {
    return {
      standard: "Protect recovery between sessions.",
      tone: "recover",
      rationale: "Your body is asking for a lighter touch today.",
      motivational: "Small wins today build durable speed later.",
    };
  }

  if (readiness !== null && !readinessStale && readiness < 0.4) {
    return {
      standard: "Smooth rhythm under fatigue.",
      tone: "protect",
      rationale: "Readiness is below your normal range — trade intensity for control.",
      motivational: "Calm movement beats forced effort.",
    };
  }

  const readyHigh = readiness !== null && !readinessStale && readiness >= 0.65;
  const fatigueOk = fatigue === null || fatigueStale || fatigue <= 0.55;
  if (readyHigh && fatigueOk) {
    return {
      standard: "Move with control, push with intent.",
      tone: "push",
      rationale: "Readiness is strong and fatigue is in check — make this session count.",
      motivational: "Consistency protects performance.",
    };
  }

  return {
    standard: "Stay consistent. Quality over intensity.",
    tone: "steady",
    rationale: "Hold today's standard and keep your rhythm intact.",
    motivational: "Consistency protects performance.",
  };
}
