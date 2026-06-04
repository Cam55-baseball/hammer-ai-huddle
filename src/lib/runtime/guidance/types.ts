/**
 * Hammer Wave 2 — C2 Today Presence
 *
 * Pure slot types for the four Today guidance slots:
 *   entry · context · next · exit
 *
 * Constitutional subordination: Eternal Laws · Megaphase 151–160 ·
 * RR-5 · RR-6 · RR-8 · Wave 1 Ratified · Wave 2 Execution Package §4.
 *
 * Slots may reference (a) the identity label, (b) existing projection ids,
 * and (c) the Wave 2 handoff descriptor. They may NOT author prose, narrative,
 * diagnosis, prediction, or authorization. Presentation copy is deferred.
 */
import type { SilenceVerdict, SilenceZoneInput } from "@/lib/runtime/silence/types";
import type { HandoffInput, HandoffResult } from "@/lib/runtime/handoff/types";

export type GuidanceSlotKind = "entry" | "context" | "next" | "exit";

export interface EntrySlot {
  readonly kind: "entry";
  readonly verdict: SilenceVerdict;
  /** Reference into `HammerIdentity` — never inline copy. */
  readonly labelRef: "organismStateLabel";
}

export interface ContextSlot {
  readonly kind: "context";
  readonly verdict: SilenceVerdict;
  /** Opaque projection ids already disclosed to athlete; never free-form prose. */
  readonly summaryRefs: ReadonlyArray<string>;
}

export interface NextSlot {
  readonly kind: "next";
  readonly verdict: SilenceVerdict;
  /** Mirror of `useNextAction()` output — read-only. */
  readonly route: string | null;
  readonly ctaLabelRef: string | null;
  readonly moduleHint: string | null;
}

export interface ExitSlot {
  readonly kind: "exit";
  readonly verdict: SilenceVerdict;
  readonly handoff: HandoffResult;
}

export type GuidanceSlot = EntrySlot | ContextSlot | NextSlot | ExitSlot;

export interface GuidanceSlotsOutput {
  readonly entry: EntrySlot;
  readonly context: ContextSlot;
  readonly next: NextSlot;
  readonly exit: ExitSlot;
}

export interface NextActionMirror {
  readonly route: string | null;
  readonly ctaLabelRef: string | null;
  readonly moduleHint: string | null;
}

export interface GuidanceSlotsInput {
  readonly entryZone: SilenceZoneInput;
  readonly contextZone: SilenceZoneInput;
  readonly contextSummaryRefs: ReadonlyArray<string>;
  readonly nextZone: SilenceZoneInput;
  readonly nextAction: NextActionMirror;
  readonly exitZone: SilenceZoneInput;
  readonly exitHandoff: HandoffInput | null;
}
