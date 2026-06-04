/**
 * PIE V2 — video catalog (baseball only).
 *
 * 13 signals × 5 video types = 65 entries. Each is consumable by the
 * deterministic video recommender. Production video URLs/refs are filled
 * in iteratively through additive content edits.
 */
import type { PieV2SeverityTier, PieV2SignalId } from "@/lib/pieV2/types";
import { PIE_V2_SIGNALS } from "@/data/baseball/pieV2Signals";

export type PieV2VideoType =
  | "education"
  | "demonstration"
  | "corrective"
  | "advanced"
  | "elite_example";

export interface PieV2VideoEntry {
  id: string;
  signal_id: PieV2SignalId;
  video_type: PieV2VideoType;
  title: string;
  severity_targets: PieV2SeverityTier[]; // tiers this content targets
  deficiency_pattern_targets: string[];
  length_tier: "short" | "medium" | "long";
  prerequisite_id: string | null;
}

const TYPE_LABEL: Record<PieV2VideoType, string> = {
  education: "Education",
  demonstration: "Demonstration",
  corrective: "Corrective",
  advanced: "Advanced",
  elite_example: "Elite Example",
};

const TYPE_TARGETS: Record<PieV2VideoType, PieV2SeverityTier[]> = {
  education: ["minor", "major", "critical"],
  demonstration: ["major", "minor"],
  corrective: ["critical", "major"],
  advanced: ["clean", "minor"],
  elite_example: ["clean"],
};

function makeVideosForSignal(signal_id: PieV2SignalId): PieV2VideoEntry[] {
  const def = PIE_V2_SIGNALS[signal_id];
  const types: PieV2VideoType[] = ["education", "demonstration", "corrective", "advanced", "elite_example"];
  return types.map((video_type) => ({
    id: `pie_v2.video.${signal_id}.${video_type}`,
    signal_id,
    video_type,
    title: `${def.label} — ${TYPE_LABEL[video_type]}`,
    severity_targets: TYPE_TARGETS[video_type],
    deficiency_pattern_targets: def.common_deficiencies,
    length_tier: video_type === "education" ? "medium" : video_type === "elite_example" ? "short" : "short",
    prerequisite_id: video_type === "advanced" || video_type === "elite_example"
      ? `pie_v2.video.${signal_id}.demonstration` : null,
  }));
}

export const PIE_V2_VIDEO_CATALOG: PieV2VideoEntry[] = (
  Object.keys(PIE_V2_SIGNALS) as PieV2SignalId[]
).flatMap(makeVideosForSignal);

export function videosForSignal(signal_id: PieV2SignalId): PieV2VideoEntry[] {
  return PIE_V2_VIDEO_CATALOG.filter((v) => v.signal_id === signal_id);
}
