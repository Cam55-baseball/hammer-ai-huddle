/**
 * Combine tier gating — which combine events a subscription tier includes.
 *
 * Rules, exactly as specified:
 *   - Pitching-velocity events (bullpen_velocity): pitcher + golden2way only.
 *   - Every other event: 5tool + golden2way only.
 *   - golden2way therefore gets all events.
 *
 * Pure function. FOUNDATION ONLY — not wired to any live surface.
 */

import { COMBINE_EVENTS, PITCHING_VELOCITY_EVENTS, isCombineEvent, type CombineEvent } from "./events";

export type CombineTier = "pitcher" | "5tool" | "golden2way";

export type CombineGateDenialReason =
  | "tier_excludes_event"
  | "unknown_tier"
  | "unknown_event";

export interface CombineGateIncluded {
  readonly included: true;
  readonly event: CombineEvent;
  readonly tier: CombineTier;
}

export interface CombineGateExcluded {
  readonly included: false;
  readonly reason: CombineGateDenialReason;
  readonly message: string;
}

export type CombineGateResult = CombineGateIncluded | CombineGateExcluded;

const KNOWN_TIERS: readonly string[] = ["pitcher", "5tool", "golden2way"];

function isPitchingVelocityEvent(event: CombineEvent): boolean {
  return PITCHING_VELOCITY_EVENTS.includes(event);
}

/**
 * Is `event` included for `tier`?
 *
 * An unrecognised tier or event is never granted access — an unknown input is
 * missing information, not an implicit yes.
 */
export function isCombineEventIncluded(
  tier: string | null | undefined,
  event: string,
): CombineGateResult {
  if (!isCombineEvent(event)) {
    return {
      included: false,
      reason: "unknown_event",
      message: `"${event}" is not a known combine event.`,
    };
  }
  if (!tier || !KNOWN_TIERS.includes(tier)) {
    return {
      included: false,
      reason: "unknown_tier",
      message: `No combine access resolved for tier "${tier ?? "none"}".`,
    };
  }

  const t = tier as CombineTier;

  if (t === "golden2way") return { included: true, event, tier: t };

  const pitchingEvent = isPitchingVelocityEvent(event);
  const allowed = pitchingEvent ? t === "pitcher" : t === "5tool";

  if (allowed) return { included: true, event, tier: t };

  return {
    included: false,
    reason: "tier_excludes_event",
    message: pitchingEvent
      ? `${event} is a pitching-velocity event — included with Complete Pitcher or The Golden 2Way.`
      : `${event} is included with 5Tool Player or The Golden 2Way.`,
  };
}

/** Every event a tier includes, in catalog order. */
export function combineEventsForTier(tier: string | null | undefined): readonly CombineEvent[] {
  return COMBINE_EVENTS.filter((e) => isCombineEventIncluded(tier, e).included);
}
