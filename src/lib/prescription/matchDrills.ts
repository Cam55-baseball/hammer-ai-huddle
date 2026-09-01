/**
 * Deterministic prescription matcher.
 *
 * Maps what the analysis actually flagged (violations_detected, PIE V2 signal
 * ids, HIE weakness areas) onto the elite drill catalog. Pure function — no
 * network, no scoring, no organism truth authored here.
 */
import {
  ELITE_DRILL_CATALOG,
  type EliteDrill,
} from "@/data/drills/eliteDrillCatalog";
import type { VideoSport } from "@/lib/videoCategoricalTaxonomy";
import { mapHIEAreaToMovement } from "@/lib/analysisToTaxonomy";

const LEVEL_BONUS: Record<EliteDrill["level"], number> = {
  feel: 3,
  iso: 4,
  constraint: 2,
  transfer: 1,
};

export interface PrescriptionMatch {
  drill: EliteDrill;
  score: number;
  reasons: string[];
}

export interface MatchInput {
  /** `violations_detected` from analyze-video (booleans keyed by violation). */
  violations?: Record<string, boolean> | null;
  /** PIE V2 signal ids flagged at minor+ severity. */
  pieV2Signals?: string[];
  /** HIE weakness areas (free text / snake_case). */
  weaknessAreas?: string[];
  module?: string | null;
  sport?: string | null;
  max?: number;
}

function moduleToCategory(module?: string | null): EliteDrill["category"] | null {
  const m = (module ?? "").toLowerCase();
  if (m.includes("hit") || m.includes("bat") || m.includes("swing")) return "hitting";
  if (m.includes("pitch")) return "pitching";
  if (m.includes("throw") || m.includes("field") || m.includes("catch")) return "throwing";
  return null;
}

export function matchPrescriptionDrills(input: MatchInput): PrescriptionMatch[] {
  const sport: VideoSport = input.sport === "softball" ? "softball" : "baseball";
  const category = moduleToCategory(input.module);
  const max = input.max ?? 4;

  const activeViolations = Object.entries(input.violations ?? {})
    .filter(([, v]) => v === true)
    .map(([k]) => k);
  const signals = new Set(input.pieV2Signals ?? []);
  const movements = new Set(
    (input.weaknessAreas ?? [])
      .map((a) => mapHIEAreaToMovement(a))
      .filter((x): x is string => Boolean(x)),
  );

  const matches: PrescriptionMatch[] = [];

  for (const drill of ELITE_DRILL_CATALOG) {
    if (!drill.sports.includes(sport)) continue;
    if (category && drill.category !== category) continue;

    let score = 0;
    const reasons: string[] = [];

    for (const v of activeViolations) {
      if (drill.violationKeys.includes(v)) {
        score += 30;
        reasons.push(v.replace(/_/g, " "));
      }
    }
    for (const s of drill.pieV2Signals) {
      if (signals.has(s)) {
        score += 18;
        reasons.push(s.replace(/_/g, " "));
      }
    }
    for (const m of drill.movementPatterns) {
      if (movements.has(m)) {
        score += 12;
        reasons.push(m.replace(/_/g, " "));
      }
    }

    if (score === 0) continue;
    score += LEVEL_BONUS[drill.level];
    matches.push({ drill, score, reasons: [...new Set(reasons)] });
  }

  return matches.sort((a, b) => b.score - a.score || a.drill.id.localeCompare(b.drill.id)).slice(0, max);
}

/**
 * Fallback when nothing was flagged: a small, category-correct maintenance set
 * so the prescription section is never an empty promise. Clearly labelled by
 * the caller as maintenance, never as a detected fault.
 */
export function maintenanceDrills(
  module?: string | null,
  sport?: string | null,
  max = 2,
): EliteDrill[] {
  const s: VideoSport = sport === "softball" ? "softball" : "baseball";
  const category = moduleToCategory(module);
  return ELITE_DRILL_CATALOG.filter(
    (d) => d.sports.includes(s) && (!category || d.category === category) && d.level !== "iso",
  ).slice(0, max);
}
