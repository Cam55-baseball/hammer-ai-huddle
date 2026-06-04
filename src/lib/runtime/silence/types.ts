/**
 * Hammer Wave 1 — C7 Silence Enforcement
 *
 * Runtime primitive types distinguishing lawful silence (constitutionally
 * required absence) from accidental silence (missing presence Hammer should
 * have filled). Encodes the Phase 6 §F silence-zone matrix as a typed input
 * contract.
 *
 * Constitutional subordination: Eternal Laws · Megaphase 151–160 ·
 * RR-5 · RR-6 · RR-8 · Hammer Execution Constitution §3
 * (Organism State silence row, replay determinism row, safeguarding precedence row).
 *
 * Pure types only. No runtime, no I/O.
 */

export type SilenceVerdict = "lawful" | "accidental" | "undefined";

/**
 * Phase 6 §F zone matrix. Every kind must be handled by `classifySilenceZone`
 * — unmatched kinds collapse to the `undefined` verdict which is a build-blocker
 * per Wave 1 Execution Package §4.1.4.
 */
export type SilenceZoneKind =
  | "safeguarding-active"
  | "athlete-revoked-narrative"
  | "missing-data-dominant"
  | "unpopulated-surface-with-signal"
  | "unpopulated-surface-no-signal"
  | "awaiting-input"
  | "post-action-cooldown"
  | "route-not-yet-rendered";

export interface SilenceZoneInput {
  /** Canonical zone identity per Phase 6 §F. */
  readonly kind: SilenceZoneKind;
  /**
   * Safeguarding-precedence override. When true, classifier must return
   * "lawful" regardless of any other input field — safeguarding can never
   * be downgraded to accidental silence. Megaphase 151–160 safeguarding
   * orchestration sub-route + Execution Constitution §3 safeguarding-precedence row.
   */
  readonly safeguardingActive?: boolean;
}
