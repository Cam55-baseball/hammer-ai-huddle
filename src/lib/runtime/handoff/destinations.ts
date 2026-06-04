/**
 * Hammer Wave 2 — C6 Navigation Handoff
 *
 * Pure `resolveHandoff` over the closed lawful destination set. Composes
 * Wave 1 `classifySilenceZone`. Returns either a `HandoffDescriptor`
 * (route + reasonKey + lineageHandle) or `{ silence: "lawful" }`.
 *
 * Authority limits (Wave 2 Execution Package §5):
 *   - May guide and route. May NOT diagnose, predict, authorize, narrate.
 *   - Safeguarding-active → lawful silence on every destination
 *     (especially /runtime/rtp, /bounce-back-bay, /safety).
 *   - Handoff to any non-lawful route is impossible by type.
 *
 * Determinism (Execution Constitution §3 replay-determinism row):
 *   No `Date.now`, no `Math.random`, no network, no storage, no emitters.
 *   Output is a pure function of `HandoffInput`.
 *
 * Constitutional subordination: Eternal Laws · Megaphase 151–160 ·
 * RR-5 · RR-6 · RR-8 · Wave 1 Ratified · Wave 2 Execution Package §5–§6.
 *
 * Forbidden phrasing tokens — by policy this module's source contains none of:
 *   diagnose, prescribe, authorize, cleared, predict.
 * (Enforced by destinations.test.ts source-grep assertion.)
 */
import { classifySilenceZone } from "@/lib/runtime/silence/classifier";
import {
  LAWFUL_DESTINATIONS,
  type HandoffInput,
  type HandoffResult,
  type LawfulDestination,
} from "./types";

/** Type-level + runtime guard that `candidate` is in the closed lawful set. */
export function isLawfulDestination(route: string): route is LawfulDestination {
  return (LAWFUL_DESTINATIONS as ReadonlyArray<string>).includes(route);
}

const LAWFUL_SILENCE: HandoffResult = Object.freeze({ silence: "lawful" });

/**
 * Resolve a handoff. Pure. Deterministic. Replay-stable.
 *
 * Returns lawful silence when:
 *   - safeguarding is active (precedence — non-downgradable),
 *   - the silence-zone classifier returns "lawful",
 *   - the classifier returns "undefined" (fail-safe: silence over fabrication),
 *   - the candidate is outside the lawful set (defensive; should be unreachable
 *     at the type level).
 */
export function resolveHandoff(input: HandoffInput): HandoffResult {
  // Safeguarding precedence — short-circuit before any routing decision.
  if (input.zone.safeguardingActive === true) {
    return LAWFUL_SILENCE;
  }

  if (!isLawfulDestination(input.candidate)) {
    return LAWFUL_SILENCE;
  }

  const verdict = classifySilenceZone(input.zone);
  if (verdict === "lawful" || verdict === "undefined") {
    return LAWFUL_SILENCE;
  }

  // verdict === "accidental" — Hammer should be present; emit a descriptor.
  return Object.freeze({
    route: input.candidate,
    reasonKey: input.reasonKey,
    lineageHandle: input.lineageHandle,
  });
}
