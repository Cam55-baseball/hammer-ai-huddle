/**
 * Hammer Wave 4 — C4 Parent Voice (resolver)
 *
 * Pure `resolveParentVoice(input)`. Composes only:
 *   - Wave 1 `getHammerIdentity`
 *   - Wave 1 silence zones (transitively, via Wave 2 slot resolver)
 *   - Wave 2 `resolveGuidanceSlots`
 *   - Wave 2 handoff types (route routing through guidance slots)
 *   - Wave 3 `resolveOnboardingPresence`
 *   - Wave 3 `resolveSetbackGuidance`
 *
 * Authority limits (Wave 4 Execution Package §3, §4):
 *   - Interpretive overlay only. Never authors organism_truth, athlete_intent,
 *     authority_override, hard_stop, or rehabilitation_state.
 *   - Allowed verbs: explain · summarize · guide · route.
 *   - Forbidden: diagnose · prescribe · authorize · cleared · predict ·
 *     guarantee · invent feelings / wants / expects.
 *   - Safeguarding-active short-circuits all slots to lawful silence.
 *   - RR-6: recovery state never routes (no RTP implication, no diagnosis).
 *
 * Determinism: no wall-clock reads, no entropy, no I/O.
 *
 * Constitutional subordination: Eternal Laws · Megaphase 151–160 · RR-5 · RR-6 ·
 * RR-8 · Wave 1/2/3 Ratified · Wave 4 Execution Package §3, §4, §5, §6.
 */
import { getHammerIdentity } from "@/lib/hammer/identity";
import { resolveGuidanceSlots } from "@/lib/runtime/guidance/slots";
import type { GuidanceSlotsInput } from "@/lib/runtime/guidance/types";
import type {
  SilenceZoneInput,
  SilenceZoneKind,
} from "@/lib/runtime/silence/types";
import type {
  HandoffInput,
  HandoffReasonKey,
  LawfulDestination,
} from "@/lib/runtime/handoff/types";
import { resolveOnboardingPresence } from "@/lib/runtime/onboarding/resolver";
import { resolveSetbackGuidance } from "@/lib/runtime/setback/resolver";
import {
  PARENT_ALLOWED_VERBS,
  type ParentDescriptor,
  type ParentInput,
  type ParentResult,
  type ParentStateKind,
} from "./types";

interface ZoneMap {
  readonly entry: SilenceZoneKind;
  readonly context: SilenceZoneKind;
  readonly next: SilenceZoneKind;
  readonly exit: SilenceZoneKind;
  readonly nextRoute: LawfulDestination | null;
  readonly reasonKey: HandoffReasonKey;
}

function zoneMapFor(state: ParentStateKind): ZoneMap {
  switch (state) {
    case "invited-not-accepted":
      return {
        entry: "awaiting-input",
        context: "awaiting-input",
        next: "awaiting-input",
        exit: "awaiting-input",
        nextRoute: null,
        reasonKey: "parent_invite.pending",
      };
    case "accepted-no-athlete-activity":
      return {
        entry: "unpopulated-surface-no-signal",
        context: "unpopulated-surface-no-signal",
        next: "unpopulated-surface-no-signal",
        exit: "unpopulated-surface-no-signal",
        nextRoute: null,
        reasonKey: "relational.signal_present",
      };
    case "accepted-active-athlete":
      return {
        entry: "unpopulated-surface-with-signal",
        context: "unpopulated-surface-with-signal",
        next: "unpopulated-surface-with-signal",
        exit: "unpopulated-surface-with-signal",
        nextRoute: "/relational",
        reasonKey: "relational.signal_present",
      };
    case "accepted-missingness-state":
      return {
        entry: "missing-data-dominant",
        context: "missing-data-dominant",
        next: "missing-data-dominant",
        exit: "missing-data-dominant",
        nextRoute: null,
        reasonKey: "relational.signal_present",
      };
    case "accepted-recovery-state":
      // RR-6: no diagnosis, no RTP implication, no route.
      return {
        entry: "missing-data-dominant",
        context: "missing-data-dominant",
        next: "missing-data-dominant",
        exit: "missing-data-dominant",
        nextRoute: null,
        reasonKey: "recovery.signal_present",
      };
    case "accepted-onboarding-state":
    case "accepted-setback-state":
      // Delegated states — zone map unused; handled below.
      return {
        entry: "unpopulated-surface-no-signal",
        context: "unpopulated-surface-no-signal",
        next: "unpopulated-surface-no-signal",
        exit: "unpopulated-surface-no-signal",
        nextRoute: null,
        reasonKey: "relational.signal_present",
      };
    default: {
      const _exhaustive: never = state;
      void _exhaustive;
      return {
        entry: "route-not-yet-rendered",
        context: "route-not-yet-rendered",
        next: "route-not-yet-rendered",
        exit: "route-not-yet-rendered",
        nextRoute: null,
        reasonKey: "parent_invite.pending",
      };
    }
  }
}

export function resolveParentVoice(input: ParentInput): ParentResult {
  // Identity reuse — sole label authority is Wave 1 C1.
  void getHammerIdentity();

  const known = Object.freeze([...(input.knownSignalRefs ?? [])]);
  const unknown = Object.freeze([...(input.unknownSignalRefs ?? [])]);

  // Delegated states reuse downstream resolvers' slots verbatim. This
  // preserves their constitutional behavior (RR-5/6/8 enforced upstream).
  if (input.state === "accepted-onboarding-state" && input.onboarding) {
    const r = resolveOnboardingPresence({
      ...input.onboarding,
      safeguardingActive:
        input.safeguardingActive === true
          ? true
          : input.onboarding.safeguardingActive,
    });
    const descriptor: ParentDescriptor = Object.freeze({
      state: input.state,
      slots: r.descriptor.slots,
      missingnessVisible: true,
      knownSignalRefs: known,
      unknownSignalRefs: unknown,
      allowedVerbs: PARENT_ALLOWED_VERBS,
    });
    return Object.freeze({ descriptor });
  }
  if (input.state === "accepted-setback-state" && input.setback) {
    const r = resolveSetbackGuidance({
      ...input.setback,
      safeguardingActive:
        input.safeguardingActive === true
          ? true
          : input.setback.safeguardingActive,
    });
    const descriptor: ParentDescriptor = Object.freeze({
      state: input.state,
      slots: r.descriptor.slots,
      missingnessVisible: true,
      knownSignalRefs: r.descriptor.knownSignalRefs,
      unknownSignalRefs: r.descriptor.unknownSignalRefs,
      allowedVerbs: PARENT_ALLOWED_VERBS,
    });
    return Object.freeze({ descriptor });
  }

  const safeguarding = input.safeguardingActive === true;
  const map = zoneMapFor(input.state);

  const zone = (kind: SilenceZoneKind): SilenceZoneInput =>
    Object.freeze({ kind, safeguardingActive: safeguarding });

  const exitHandoff: HandoffInput | null = map.nextRoute
    ? {
        candidate: map.nextRoute,
        reasonKey: map.reasonKey,
        lineageHandle: input.lineageHandle ?? "ledger:evt:unknown",
        zone: zone(map.exit),
      }
    : null;

  const slotInput: GuidanceSlotsInput = {
    entryZone: zone(map.entry),
    contextZone: zone(map.context),
    contextSummaryRefs: known,
    nextZone: zone(map.next),
    nextAction: {
      route: map.nextRoute,
      ctaLabelRef: null,
      moduleHint: null,
    },
    exitZone: zone(map.exit),
    exitHandoff,
  };

  const descriptor: ParentDescriptor = Object.freeze({
    state: input.state,
    slots: resolveGuidanceSlots(slotInput),
    missingnessVisible: true,
    knownSignalRefs: known,
    unknownSignalRefs: unknown,
    allowedVerbs: PARENT_ALLOWED_VERBS,
  });

  return Object.freeze({ descriptor });
}
