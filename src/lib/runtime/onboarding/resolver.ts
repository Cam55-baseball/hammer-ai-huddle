/**
 * Hammer Wave 3 — C3 Onboarding Presence (resolver)
 *
 * Pure `resolveOnboardingPresence(input)`. Composes Wave 1
 * `classifySilenceZone` (via `resolveGuidanceSlots`) + Wave 2
 * `resolveGuidanceSlots` / `resolveHandoff` + Wave 1 `getHammerIdentity`.
 *
 * Authority limits (Wave 3 Execution Package §4):
 *   - Interpretive overlay only. Never authors organism_truth, athlete_intent,
 *     authority_override, hard_stop, or rehabilitation_state.
 *   - No copy. No prompts. Slots emit references only.
 *   - Safeguarding-active short-circuits all slots to lawful silence.
 *
 * Determinism: no Date.now, no Math.random, no I/O. Pure function of input.
 *
 * Constitutional subordination: Eternal Laws · Megaphase 151–160 · RR-5 · RR-6 ·
 * RR-8 · Wave 1 Ratified · Wave 2 Ratified · Wave 3 Execution Package §4, §6.
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
  LawfulDestination,
} from "@/lib/runtime/handoff/types";
import type {
  OnboardingDescriptor,
  OnboardingInput,
  OnboardingResult,
  OnboardingStateKind,
} from "./types";

interface ZoneMap {
  readonly entry: SilenceZoneKind;
  readonly context: SilenceZoneKind;
  readonly next: SilenceZoneKind;
  readonly exit: SilenceZoneKind;
  readonly nextRoute: LawfulDestination | null;
}

/**
 * State → zone mapping per Wave 3 Execution Package §3 state mapping.
 * No state may invent a destination outside the closed lawful set; nulls
 * collapse the next/exit slots into lawful silence at the resolver layer.
 */
function zoneMapFor(state: OnboardingStateKind): ZoneMap {
  switch (state) {
    case "first-login":
      return {
        entry: "awaiting-input",
        context: "unpopulated-surface-no-signal",
        next: "awaiting-input",
        exit: "awaiting-input",
        nextRoute: null,
      };
    case "first-completed-action":
      return {
        entry: "unpopulated-surface-with-signal",
        context: "unpopulated-surface-with-signal",
        next: "unpopulated-surface-with-signal",
        exit: "unpopulated-surface-with-signal",
        nextRoute: "/practice",
      };
    case "first-prescription":
      return {
        entry: "unpopulated-surface-with-signal",
        context: "unpopulated-surface-with-signal",
        next: "unpopulated-surface-with-signal",
        exit: "unpopulated-surface-with-signal",
        nextRoute: "/practice",
      };
    case "first-week":
      return {
        entry: "unpopulated-surface-with-signal",
        context: "unpopulated-surface-with-signal",
        next: "unpopulated-surface-with-signal",
        exit: "unpopulated-surface-with-signal",
        nextRoute: "/training-block",
      };
    case "incomplete-onboarding":
      return {
        entry: "awaiting-input",
        context: "awaiting-input",
        next: "awaiting-input",
        exit: "awaiting-input",
        nextRoute: null,
      };
    case "partial-profile":
      return {
        entry: "awaiting-input",
        context: "awaiting-input",
        next: "awaiting-input",
        exit: "awaiting-input",
        nextRoute: null,
      };
    case "no-activity":
      return {
        entry: "unpopulated-surface-no-signal",
        context: "unpopulated-surface-no-signal",
        next: "unpopulated-surface-no-signal",
        exit: "unpopulated-surface-no-signal",
        nextRoute: null,
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
      };
    }
  }
}

export function resolveOnboardingPresence(
  input: OnboardingInput,
): OnboardingResult {
  // Identity reuse — sole label authority is Wave 1 C1.
  void getHammerIdentity();

  const safeguarding = input.safeguardingActive === true;
  const map = zoneMapFor(input.state);

  const zone = (kind: SilenceZoneKind): SilenceZoneInput =>
    Object.freeze({ kind, safeguardingActive: safeguarding });

  const exitHandoff: HandoffInput | null = map.nextRoute
    ? {
        candidate: map.nextRoute,
        reasonKey: "practice.window_active",
        lineageHandle: input.lineageHandle ?? "ledger:evt:unknown",
        zone: zone(map.exit),
      }
    : null;

  const slotInput: GuidanceSlotsInput = {
    entryZone: zone(map.entry),
    contextZone: zone(map.context),
    contextSummaryRefs: input.contextSummaryRefs ?? [],
    nextZone: zone(map.next),
    nextAction: {
      route: map.nextRoute,
      ctaLabelRef: null,
      moduleHint: null,
    },
    exitZone: zone(map.exit),
    exitHandoff,
  };

  const descriptor: OnboardingDescriptor = Object.freeze({
    state: input.state,
    slots: resolveGuidanceSlots(slotInput),
  });

  return Object.freeze({ descriptor });
}
