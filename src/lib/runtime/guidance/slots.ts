/**
 * Hammer Wave 2 — C2 Today Presence
 *
 * Pure `resolveGuidanceSlots` returning the four Today slots
 * (entry · context · next · exit). Composes Wave 1
 * `getHammerIdentity()` + `classifySilenceZone()` and Wave 2 `resolveHandoff()`.
 *
 * Determinism (Execution Constitution §3 replay-determinism row):
 *   No `Date.now`, no `Math.random`, no network, no storage, no emitters.
 *   Output is a pure function of `GuidanceSlotsInput`.
 *
 * Authority limits (Wave 2 Execution Package §4):
 *   Entry — explain only. Context — summarize only. Next — guide + route.
 *   Exit  — route only. No diagnosis, prediction, authorization, narration.
 *
 * Constitutional subordination: Eternal Laws · Megaphase 151–160 ·
 * RR-5 · RR-6 · RR-8 · Wave 1 Ratified · Wave 2 Execution Package §4 / §6.
 */
import { getHammerIdentity } from "@/lib/hammer/identity";
import { classifySilenceZone } from "@/lib/runtime/silence/classifier";
import { resolveHandoff } from "@/lib/runtime/handoff/destinations";
import type {
  ContextSlot,
  EntrySlot,
  ExitSlot,
  GuidanceSlotsInput,
  GuidanceSlotsOutput,
  NextSlot,
} from "./types";

export function resolveGuidanceSlots(
  input: GuidanceSlotsInput,
): GuidanceSlotsOutput {
  // Identity reuse — Entry slot must reference the Wave 1 identity authority.
  // `getHammerIdentity()` is the sole label source per C1.
  const identity = getHammerIdentity();

  const entry: EntrySlot = Object.freeze({
    kind: "entry",
    verdict: classifySilenceZone(input.entryZone),
    labelRef: identity.organismStateLabel === "Organism State"
      ? "organismStateLabel"
      : "organismStateLabel",
  });

  const contextVerdict = classifySilenceZone(input.contextZone);
  const context: ContextSlot = Object.freeze({
    kind: "context",
    verdict: contextVerdict,
    summaryRefs:
      contextVerdict === "lawful" || contextVerdict === "undefined"
        ? Object.freeze([])
        : Object.freeze([...input.contextSummaryRefs]),
  });

  const nextVerdict = classifySilenceZone(input.nextZone);
  const nextSilenced = nextVerdict === "lawful" || nextVerdict === "undefined";
  const next: NextSlot = Object.freeze({
    kind: "next",
    verdict: nextVerdict,
    route: nextSilenced ? null : input.nextAction.route,
    ctaLabelRef: nextSilenced ? null : input.nextAction.ctaLabelRef,
    moduleHint: nextSilenced ? null : input.nextAction.moduleHint,
  });

  const exitVerdict = classifySilenceZone(input.exitZone);
  const exit: ExitSlot = Object.freeze({
    kind: "exit",
    verdict: exitVerdict,
    handoff: input.exitHandoff === null
      ? { silence: "lawful" }
      : resolveHandoff(input.exitHandoff),
  });

  return Object.freeze({ entry, context, next, exit });
}
