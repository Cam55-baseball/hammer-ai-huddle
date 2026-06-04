/**
 * Hammer Wave 3 — C5 First Setback Guidance (resolver)
 *
 * Pure `resolveSetbackGuidance(input)`. Composes Wave 1 `classifySilenceZone`
 * (via Wave 2 `resolveGuidanceSlots`) and Wave 2 `resolveHandoff` only.
 *
 * Authority limits (Wave 3 Execution Package §5):
 *   - May expose known signals, unknown signals (missingness visibility),
 *     and a lawful next handoff candidate.
 *   - Must NOT invent reasons, assume emotions, forecast outcomes, author
 *     narrative, or diagnose. RTP authorization is out of scope (Wave 3 §0).
 *   - `safeguardingActive` short-circuits to lawful silence.
 *   - Recovery interruption routes through `missing-data-dominant` per RR-6.
 *
 * Determinism: no Date.now, no Math.random, no I/O. Pure function of input.
 *
 * Constitutional subordination: Eternal Laws · Megaphase 151–160 · RR-5 · RR-6 ·
 * RR-8 · Wave 1 Ratified · Wave 2 Ratified · Wave 3 Execution Package §5, §6.
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
  SetbackDescriptor,
  SetbackInput,
  SetbackResult,
  SetbackStateKind,
} from "./types";

interface ZoneMap {
  readonly entry: SilenceZoneKind;
  readonly context: SilenceZoneKind;
  readonly next: SilenceZoneKind;
  readonly exit: SilenceZoneKind;
  readonly nextRoute: LawfulDestination | null;
}

function zoneMapFor(state: SetbackStateKind): ZoneMap {
  switch (state) {
    case "missed-day":
      return {
        entry: "unpopulated-surface-with-signal",
        context: "unpopulated-surface-with-signal",
        next: "unpopulated-surface-with-signal",
        exit: "unpopulated-surface-with-signal",
        nextRoute: "/practice",
      };
    case "missed-week":
      return {
        entry: "unpopulated-surface-with-signal",
        context: "unpopulated-surface-with-signal",
        next: "unpopulated-surface-with-signal",
        exit: "unpopulated-surface-with-signal",
        nextRoute: "/training-block",
      };
    case "interrupted-prescription":
      return {
        entry: "unpopulated-surface-with-signal",
        context: "unpopulated-surface-with-signal",
        next: "unpopulated-surface-with-signal",
        exit: "unpopulated-surface-with-signal",
        nextRoute: "/practice",
      };
    case "incomplete-logging":
      return {
        entry: "unpopulated-surface-with-signal",
        context: "unpopulated-surface-with-signal",
        next: "awaiting-input",
        exit: "awaiting-input",
        nextRoute: null,
      };
    case "recovery-interruption":
      // RR-6: athlete-reported recovery missingness outranks inference.
      return {
        entry: "missing-data-dominant",
        context: "missing-data-dominant",
        next: "missing-data-dominant",
        exit: "missing-data-dominant",
        nextRoute: null,
      };
    case "unavailable-signal":
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

export function resolveSetbackGuidance(input: SetbackInput): SetbackResult {
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
    contextSummaryRefs: input.knownSignalRefs ?? [],
    nextZone: zone(map.next),
    nextAction: {
      route: map.nextRoute,
      ctaLabelRef: null,
      moduleHint: null,
    },
    exitZone: zone(map.exit),
    exitHandoff,
  };

  const descriptor: SetbackDescriptor = Object.freeze({
    state: input.state,
    slots: resolveGuidanceSlots(slotInput),
    missingnessVisible: true,
    knownSignalRefs: Object.freeze([...(input.knownSignalRefs ?? [])]),
    unknownSignalRefs: Object.freeze([...(input.unknownSignalRefs ?? [])]),
  });

  return Object.freeze({ descriptor });
}
