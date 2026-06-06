/**
 * PIE V2 — deterministic drill recommender.
 *
 * Inputs: session aggregate + optional RR-6 caution state.
 * Outputs: ranked drill list. Caution dampens L4 velocity-tier drills
 * monotonically. Tracked-only signals (extension, arm slot) emit a
 * survival-first L1/L2 recommendation when variance is elevated.
 */
import { PIE_V2_DRILL_CATALOG, type PieV2Drill } from "@/data/baseball/pieV2DrillCatalog";
import type { PieV2SessionAggregate, PieV2SeverityTier } from "./types";
import type { AthleteContextProjection } from "@/lib/hammer/context/decisionFilters";

const TIER_RANK: Record<PieV2SeverityTier, number> = {
  critical: 4,
  major: 3,
  minor: 2,
  clean: 1,
};

export interface PieV2DrillRecommendation {
  drill: PieV2Drill;
  rank_score: number;
  rationale: string;
}

/**
 * P0-3 (RFL-029): pure context-aware modifier — soft rerank by spine envelope.
 * Returns score delta + rationale appendix. Never hard-filters PIE drills
 * (signal-driven supremacy preserved); only nudges ordering.
 */
function applyContextBoost(
  drill: PieV2Drill,
  ctx: AthleteContextProjection | undefined,
): { delta: number; suffix: string } {
  if (!ctx) return { delta: 0, suffix: "" };
  const hay = `${drill.name ?? ""} ${drill.tier ?? ""} ${drill.signal_id}`.toLowerCase();
  let delta = 0;
  const parts: string[] = [];
  for (const p of ctx.developmentPriorities) {
    if (hay.includes(p.toLowerCase())) {
      delta += 8;
      parts.push(`+priority:${p}`);
    }
  }
  if (ctx.seasonPhase === "in" && drill.tier === "L4_velocity") {
    delta -= 6;
    parts.push("inseason-L4-deemphasize");
  }
  if (ctx.injuryRegions.includes("ucl") && drill.tier === "L4_velocity") {
    delta -= 50;
    parts.push("ucl-suppress-L4");
  }
  return { delta, suffix: parts.length ? ` [${parts.join(",")}]` : "" };
}

export function recommendDrills(
  agg: PieV2SessionAggregate,
  opts: {
    armHealthCaution?: "none" | "watch" | "elevated";
    maxRecommendations?: number;
    athleteContext?: AthleteContextProjection;
  } = {},
): PieV2DrillRecommendation[] {
  const caution = opts.armHealthCaution ?? "none";
  const max = opts.maxRecommendations ?? 6;
  const recs: PieV2DrillRecommendation[] = [];

  for (const s of agg.signals) {
    if (s.tracked_only) {
      if ((s.variance ?? 0) > 10) {
        const drills = PIE_V2_DRILL_CATALOG.filter(
          (d) => d.signal_id === s.signal_id && (d.tier === "L1_awareness" || d.tier === "L2_patterning"),
        );
        for (const d of drills) {
          const { delta, suffix } = applyContextBoost(d, opts.athleteContext);
          recs.push({
            drill: d,
            rank_score: 60 + delta,
            rationale: `tracked-signal variance elevated for ${s.signal_id}${suffix}`,
          });
        }
      }
      continue;
    }
    if (!s.tier || s.tier === "clean") continue;
    const eligible = PIE_V2_DRILL_CATALOG.filter(
      (d) => d.signal_id === s.signal_id && TIER_RANK[s.tier!] >= TIER_RANK[d.severity_floor],
    );
    for (const d of eligible) {
      // Dampen L4 velocity-tier under any caution. RR-6 supremacy.
      if (d.tier === "L4_velocity" && caution !== "none") continue;
      const base = TIER_RANK[s.tier] * 25;
      const tierBoost = d.tier === "L1_awareness" ? 10 : d.tier === "L2_patterning" ? 6 : d.tier === "L3_integration" ? 3 : 0;
      const confidenceWeight = (s.confidence.score / 100) * 5;
      const { delta, suffix } = applyContextBoost(d, opts.athleteContext);
      recs.push({
        drill: d,
        rank_score: base + tierBoost + confidenceWeight + delta,
        rationale: `${s.signal_id} at tier ${s.tier}${suffix}`,
      });
    }
  }

  return recs.sort((a, b) => b.rank_score - a.rank_score).slice(0, max);
}
