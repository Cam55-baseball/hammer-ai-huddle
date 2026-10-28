/**
 * Analysis practice checks → canonical Hammers library drills.
 * Only explicit finding tags select a drill; check text is never matched.
 * A check with no tagged library drill is omitted, never invented.
 */
import { matchPrescriptionDrills, type MatchInput, type PrescriptionMatch } from "./matchDrills";

export interface AnalysisPracticeCheck {
  text?: string;
  finding_tags?: unknown;
}

export function taggedPracticeChecks(report: unknown): AnalysisPracticeCheck[] {
  const list = (report as { practice_checks?: unknown } | null)?.practice_checks;
  if (!Array.isArray(list)) return [];
  return list.filter((item): item is AnalysisPracticeCheck =>
    !!item && typeof item === "object" && Array.isArray((item as AnalysisPracticeCheck).finding_tags));
}

export function practiceCheckDrills(
  checks: ReadonlyArray<AnalysisPracticeCheck>,
  input: Pick<MatchInput, "catalog" | "circulation" | "module" | "sport" | "includePendingReview">,
): PrescriptionMatch[] {
  const out: PrescriptionMatch[] = [];
  for (const check of checks) {
    const tags = (Array.isArray(check.finding_tags) ? check.finding_tags : [])
      .filter((t): t is string => typeof t === "string" && t.trim().length > 0).map((t) => t.trim());
    if (!tags.length) continue;
    const [match] = matchPrescriptionDrills({ ...input, faultKeys: tags, weaknessAreas: [], max: 1 });
    // Require an exact tag on the drill itself; a score from anything else is not proof.
    if (match && match.drill.violationKeys.some((k) => tags.includes(k)) && !out.some((m) => m.drill.id === match.drill.id)) {
      out.push(match);
    }
  }
  return out;
}
