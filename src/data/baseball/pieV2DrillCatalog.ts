/**
 * PIE V2 — drill catalog (baseball only).
 *
 * 13 signals × 4 tiers (L1 Awareness, L2 Patterning, L3 Integration,
 * L4 Velocity/Game-Speed) = 52 drill entries. Each entry is taggable
 * and consumable by the deterministic drill recommender.
 *
 * Catalog is intentionally compact; production content (cues, video refs)
 * is filled in iteratively through additive content edits.
 */
import type { PieV2SeverityTier, PieV2SignalId } from "@/lib/pieV2/types";
import { PIE_V2_SIGNALS } from "@/data/baseball/pieV2Signals";

export type PieV2DrillTier = "L1_awareness" | "L2_patterning" | "L3_integration" | "L4_velocity";

export interface PieV2Drill {
  id: string;
  signal_id: PieV2SignalId;
  tier: PieV2DrillTier;
  name: string;
  severity_floor: PieV2SeverityTier; // recommend at this severity or worse
  cues: string[];
  common_mistakes: string[];
  progression_next: string | null;
  video_refs: string[]; // ids from pieV2VideoCatalog
}

const TIER_LABEL: Record<PieV2DrillTier, string> = {
  L1_awareness: "L1 · Awareness",
  L2_patterning: "L2 · Patterning",
  L3_integration: "L3 · Integration",
  L4_velocity: "L4 · Velocity / Game Speed",
};

const TIER_FLOOR: Record<PieV2DrillTier, PieV2SeverityTier> = {
  L1_awareness: "critical",
  L2_patterning: "major",
  L3_integration: "minor",
  L4_velocity: "clean",
};

function makeDrillsForSignal(signal_id: PieV2SignalId): PieV2Drill[] {
  const def = PIE_V2_SIGNALS[signal_id];
  const tiers: PieV2DrillTier[] = ["L1_awareness", "L2_patterning", "L3_integration", "L4_velocity"];
  return tiers.map((tier, i) => ({
    id: `pie_v2.drill.${signal_id}.${tier}`,
    signal_id,
    tier,
    name: `${def.label} — ${TIER_LABEL[tier]}`,
    severity_floor: TIER_FLOOR[tier],
    cues: [def.teaching_progression[i] ?? def.teaching_progression[def.teaching_progression.length - 1] ?? "Awareness"],
    common_mistakes: def.common_deficiencies.slice(0, 2),
    progression_next: i < tiers.length - 1 ? `pie_v2.drill.${signal_id}.${tiers[i + 1]}` : null,
    video_refs: [`pie_v2.video.${signal_id}.demonstration`],
  }));
}

export const PIE_V2_DRILL_CATALOG: PieV2Drill[] = (
  Object.keys(PIE_V2_SIGNALS) as PieV2SignalId[]
).flatMap(makeDrillsForSignal);

export function drillsForSignal(signal_id: PieV2SignalId): PieV2Drill[] {
  return PIE_V2_DRILL_CATALOG.filter((d) => d.signal_id === signal_id);
}
