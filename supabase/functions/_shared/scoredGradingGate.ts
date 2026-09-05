/**
 * Scored-grading release gate (server side).
 *
 * Evidence: `videos.efficiency_score` clusters hard on multiples of five
 * (149 rows on exactly 55), and the report-card audit found one genuinely
 * measured tile in the entire product while the pose/metric engine is a stub.
 * Until real measurement exists, no athlete sees a number presented as a
 * measurement — and a hidden number that still returns from an endpoint is
 * not gated, so the stripping happens here, not only in the UI.
 *
 * Qualitative coaching (summary, feedback, positives, drills, fault flags)
 * is deliberately NOT gated. Words stay, scores go.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hasAnyActiveRole } from "./authGuards.ts";

export const SCORED_GRADING_MESSAGE =
  "Scored grading is turned off for now. The measurement engine that would " +
  "produce an honest number is not live yet, so we are showing you the " +
  "coaching instead of a score we cannot stand behind.";

/** Fields that present themselves to an athlete as a measurement. */
const SCORED_FIELDS = [
  "efficiency_score",
  "original_ai_score",
  "score_adjusted",
  "scorecard",
  "metrics",
  "report_card_contract_id",
] as const;

/** Owner or admin only. Any lookup failure denies. */
export async function canSeeScoredGrading(
  supabase: SupabaseClient,
  userId: string | null | undefined,
): Promise<boolean> {
  if (!userId) return false;
  try {
    return await hasAnyActiveRole(supabase, userId, ["owner", "admin"]);
  } catch (e) {
    console.error("[scoredGradingGate] role lookup failed", e);
    return false;
  }
}

/**
 * Remove every scored field from a response payload (one level deep, plus
 * a nested `ai_analysis` object for the replay-cache shape).
 */
export function stripScoredGrading<T extends Record<string, unknown>>(
  payload: T,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...payload };
  for (const f of SCORED_FIELDS) delete out[f];

  const nested = out.ai_analysis;
  if (nested && typeof nested === "object") {
    const copy: Record<string, unknown> = { ...(nested as Record<string, unknown>) };
    for (const f of SCORED_FIELDS) delete copy[f];
    out.ai_analysis = copy;
  }

  out.scored_grading_gated = true;
  out.scored_grading_message = SCORED_GRADING_MESSAGE;
  return out;
}
