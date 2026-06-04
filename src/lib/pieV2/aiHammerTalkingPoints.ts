/**
 * PIE V2 — AI Hammer talking-point envelope.
 *
 * Deterministic, constitution-bounded coaching language. The LLM (if used)
 * may only rephrase within this envelope. No destiny framing, no invented
 * feelings, no comparative ranking against named peers, no certainty
 * beyond the confidence band. RR-5 + RR-6 supremacy.
 */
import type { PieV2SeverityTier, PieV2SignalId } from "./types";
import { PIE_V2_SIGNALS } from "@/data/baseball/pieV2Signals";

export interface PieV2TalkingPoint {
  signal_id: PieV2SignalId;
  tier: PieV2SeverityTier;
  observation: string;
  root_cause_hint: string;
  next_step: string;
}

const TIER_TONE: Record<PieV2SeverityTier, { observe: string; act: string }> = {
  clean: { observe: "looks repeatable", act: "hold the pattern" },
  minor: { observe: "shows a small inefficiency", act: "tighten it in this week's patterning work" },
  major: { observe: "is leaking", act: "prioritize awareness + patterning before adding intent" },
  critical: { observe: "needs containment", act: "drop intent, isolate the pattern, rebuild" },
};

export function talkingPointFor(
  signal_id: PieV2SignalId,
  tier: PieV2SeverityTier,
): PieV2TalkingPoint {
  const def = PIE_V2_SIGNALS[signal_id];
  const tone = TIER_TONE[tier];
  return {
    signal_id,
    tier,
    observation: `${def.label} ${tone.observe}.`,
    root_cause_hint: def.root_causes.length > 0
      ? `Common cause to check: ${def.root_causes[0]}.`
      : "No common root cause cataloged.",
    next_step: `${tone.act} — start with ${def.teaching_progression[0] ?? "awareness work"}.`,
  };
}

export function talkingPointsForSession(
  signalTiers: Array<{ signal_id: PieV2SignalId; tier: PieV2SeverityTier | null; tracked_only: boolean }>,
): PieV2TalkingPoint[] {
  return signalTiers
    .filter((s) => !s.tracked_only && s.tier && s.tier !== "clean")
    .map((s) => talkingPointFor(s.signal_id, s.tier!));
}
