/**
 * Hammer Wave 1 — C7 Silence Enforcement
 *
 * Pure silence-zone classifier. Distinguishes lawful silence (constitutionally
 * required absence) from accidental silence (a surface Hammer should have
 * filled but did not). Encodes the Phase 6 §F matrix as an exhaustive switch.
 *
 * Determinism guarantees (Execution Constitution §3 replay-determinism row):
 *   - No `Date.now`, no `Math.random`, no network, no live model, no projection mutation.
 *   - Output is a pure function of `SilenceZoneInput`.
 *   - Safeguarding precedence short-circuits before any other classification —
 *     active safeguarding can never be downgraded to "accidental".
 *
 * Constitutional subordination: Eternal Laws · Megaphase 151–160 ·
 * RR-5 (no invented feelings) · RR-6 (no diagnosis) · RR-8 (no coercive
 * disclosure) · Hammer Execution Constitution §3 (Organism State silence row,
 * safeguarding-precedence row, single-Hammer-authority row).
 *
 * This module is a Wave 1 substrate. It emits no events, mutates no state,
 * authors no organism_truth / athlete_intent / authority_override / hard_stop /
 * rehabilitation_state. Consumers arrive in Wave 2.
 */
import type {
  SilenceVerdict,
  SilenceZoneInput,
  SilenceZoneKind,
} from "./types";

/**
 * Returns a deterministic silence verdict for a single zone input.
 *
 * Verdict mapping (Phase 6 §F):
 *   - `safeguarding-active`           → `lawful` (precedence; non-downgradable)
 *   - `athlete-revoked-narrative`     → `lawful` (RR-5 revocability)
 *   - `missing-data-dominant`         → `lawful` (RR-6 / RR-8 missingness)
 *   - `unpopulated-surface-with-signal` → `accidental` (Hammer should have spoken)
 *   - `unpopulated-surface-no-signal` → `lawful`
 *   - `awaiting-input`                → `lawful`
 *   - `post-action-cooldown`          → `lawful`
 *   - `route-not-yet-rendered`        → `lawful`
 *
 * Any unmatched kind returns `undefined` — a build-blocker per Wave 1
 * Execution Package §4.1.4.
 */
export function classifySilenceZone(input: SilenceZoneInput): SilenceVerdict {
  // Safeguarding precedence — non-downgradable, evaluated first.
  if (input.safeguardingActive === true) {
    return "lawful";
  }

  const kind: SilenceZoneKind = input.kind;
  switch (kind) {
    case "safeguarding-active":
      return "lawful";
    case "athlete-revoked-narrative":
      return "lawful";
    case "missing-data-dominant":
      return "lawful";
    case "unpopulated-surface-with-signal":
      return "accidental";
    case "unpopulated-surface-no-signal":
      return "lawful";
    case "awaiting-input":
      return "lawful";
    case "post-action-cooldown":
      return "lawful";
    case "route-not-yet-rendered":
      return "lawful";
    default: {
      // Exhaustiveness sentinel — unmatched kinds halt Wave 1 ratification.
      const _exhaustive: never = kind;
      void _exhaustive;
      return "undefined";
    }
  }
}
