/**
 * Hammer Wave 2 — C6 Navigation Handoff
 *
 * Pure types. Closed lawful-destination union bound to the seven canonical
 * routes registered in `src/App.tsx`:
 *   /relational · /practice · /training-block · /safety · /runtime/rtp ·
 *   /bounce-back-bay · /accept-parent-invite
 *
 * Constitutional subordination: Eternal Laws · Megaphase 151–160 ·
 * RR-5 · RR-6 · RR-8 · Hammer Activation 1–8 · Wave 1 Ratified ·
 * Wave 2 Execution Package (`docs/asb/hammer-wave-2-execution-package.md`) §5.
 *
 * Pure types only. No runtime, no I/O.
 */
import type { SilenceZoneInput } from "@/lib/runtime/silence/types";

/** Closed union of the seven Wave 2 lawful destinations. */
export type LawfulDestination =
  | "/relational"
  | "/practice"
  | "/training-block"
  | "/safety"
  | "/runtime/rtp"
  | "/bounce-back-bay"
  | "/accept-parent-invite";

export const LAWFUL_DESTINATIONS: ReadonlyArray<LawfulDestination> = [
  "/relational",
  "/practice",
  "/training-block",
  "/safety",
  "/runtime/rtp",
  "/bounce-back-bay",
  "/accept-parent-invite",
] as const;

/**
 * Stable reason keys. Identifiers only — no narrative copy, no diagnosis,
 * no prediction, no authorization framing. Resolver returns a key; the
 * presentation layer translates the key into copy at a later wave.
 */
export type HandoffReasonKey =
  | "relational.signal_present"
  | "practice.window_active"
  | "training.block_scheduled"
  | "safety.athlete_initiated"
  | "rtp.lawful_trigger"
  | "recovery.signal_present"
  | "parent_invite.pending";

/** Lineage handle — opaque pointer back to the ledger antecedent. */
export type LineageHandle = string;

export interface HandoffDescriptor {
  readonly route: LawfulDestination;
  readonly reasonKey: HandoffReasonKey;
  readonly lineageHandle: LineageHandle;
}

export interface HandoffSilence {
  readonly silence: "lawful";
}

export type HandoffResult = HandoffDescriptor | HandoffSilence;

export interface HandoffInput {
  /** Candidate route requested by the caller. */
  readonly candidate: LawfulDestination;
  /** Stable reason key matching the destination. */
  readonly reasonKey: HandoffReasonKey;
  /** Replay-traceable lineage pointer to the originating ledger event. */
  readonly lineageHandle: LineageHandle;
  /** Silence zone state per Phase 6 §F. */
  readonly zone: SilenceZoneInput;
}
