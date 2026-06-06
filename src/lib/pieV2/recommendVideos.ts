/**
 * PIE V2 — deterministic video recommender.
 *
 * Mirrors drill recommender shape. Tier-aware: critical → corrective + education,
 * minor → demonstration + advanced, clean → elite_example.
 */
import { PIE_V2_VIDEO_CATALOG, type PieV2VideoEntry } from "@/data/baseball/pieV2VideoCatalog";
import type { PieV2SessionAggregate, PieV2SeverityTier } from "./types";
import type { AthleteContextProjection } from "@/lib/hammer/context/decisionFilters";

export interface PieV2VideoRecommendation {
  video: PieV2VideoEntry;
  rank_score: number;
  rationale: string;
}

const TIER_RANK: Record<PieV2SeverityTier, number> = {
  critical: 4,
  major: 3,
  minor: 2,
  clean: 1,
};

function videoContextBoost(
  v: PieV2VideoEntry,
  ctx: AthleteContextProjection | undefined,
): { delta: number; suffix: string } {
  if (!ctx) return { delta: 0, suffix: "" };
  const hay = `${v.signal_id} ${v.video_type}`.toLowerCase();
  let delta = 0;
  const parts: string[] = [];
  for (const p of ctx.developmentPriorities) {
    if (hay.includes(p.toLowerCase())) {
      delta += 6;
      parts.push(`+priority:${p}`);
    }
  }
  if (ctx.injuryRegions.length > 0 && v.video_type === "advanced") {
    delta -= 8;
    parts.push("injury-deprioritize-advanced");
  }
  if (ctx.lifecycleBand && ["u10", "u12", "u14"].includes(ctx.lifecycleBand) && v.video_type === "advanced") {
    delta -= 10;
    parts.push("youth-deprioritize-advanced");
  }
  return { delta, suffix: parts.length ? ` [${parts.join(",")}]` : "" };
}

export function recommendVideos(
  agg: PieV2SessionAggregate,
  opts: { maxRecommendations?: number; athleteContext?: AthleteContextProjection } = {},
): PieV2VideoRecommendation[] {
  const max = opts.maxRecommendations ?? 8;
  const recs: PieV2VideoRecommendation[] = [];

  for (const s of agg.signals) {
    if (s.tracked_only) {
      if ((s.variance ?? 0) > 10) {
        const educ = PIE_V2_VIDEO_CATALOG.find(
          (v) => v.signal_id === s.signal_id && v.video_type === "education",
        );
        if (educ) {
          const { delta, suffix } = videoContextBoost(educ, opts.athleteContext);
          recs.push({ video: educ, rank_score: 55 + delta, rationale: `tracked-signal variance for ${s.signal_id}${suffix}` });
        }
      }
      continue;
    }
    if (!s.tier) continue;
    const eligible = PIE_V2_VIDEO_CATALOG.filter(
      (v) => v.signal_id === s.signal_id && v.severity_targets.includes(s.tier!),
    );
    for (const v of eligible) {
      const base = TIER_RANK[s.tier] * 20;
      const typeBoost =
        v.video_type === "corrective" ? 12 :
        v.video_type === "education" ? 8 :
        v.video_type === "demonstration" ? 6 :
        v.video_type === "advanced" ? 3 : 1;
      const { delta, suffix } = videoContextBoost(v, opts.athleteContext);
      recs.push({
        video: v,
        rank_score: base + typeBoost + delta,
        rationale: `${s.signal_id} at tier ${s.tier}${suffix}`,
      });
    }
  }
  return recs.sort((a, b) => b.rank_score - a.rank_score).slice(0, max);
}
