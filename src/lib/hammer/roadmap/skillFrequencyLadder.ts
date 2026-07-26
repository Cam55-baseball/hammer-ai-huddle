/**
 * Skill-Frequency Ladder — days/week per skill modality per rung.
 *
 * North star: MLB / AUSL position players practice their *skills* (hitting,
 * defense, throwing, baserunning) 6 days a week. Volume and intensity
 * self-regulate; the days themselves are the constant.
 *
 * Doctrine: STACK DAYS FIRST, THEN STACK INTENSITY.
 *   - The ladder monotonically climbs from Foundation → Sustain toward 6.
 *   - Extra days added on top of the athlete's earned baseline are added at
 *     `activation` intensity, never `primary` — a new day is earned before
 *     volume is earned.
 *   - Injury flags may only *lower* the target, never raise it.
 *   - The Sustain ceiling for hitting/defense/baserunning is exactly 6.
 *     Pitcher throwing is capped at 5 (bullpen recovery reality).
 *
 * Pure, replay-safe. Locked by determinism tests + a preflight CI lint.
 */
import type { RoadmapRung } from "./roadmapLadder";
import type { AthleteContextProjection } from "@/lib/hammer/context/decisionFilters";
import { positionTokenIsPitcher } from "@/lib/hammer/positions/positionNormalizer";

export type SkillModality = "hitting" | "throwing" | "defense" | "baserunning";

export const SKILL_MODALITIES: ReadonlyArray<SkillModality> = [
  "hitting",
  "throwing",
  "defense",
  "baserunning",
];

/** Absolute ceiling for any skill day count — enforced everywhere. */
export const SKILL_DAYS_CEILING = 6;

/** Position-player baseline ladder (hitting/defense/baserunning + non-pitcher throwing). */
const POSITION_LADDER: Record<SkillModality, Record<RoadmapRung, number>> = {
  hitting:     { foundation: 3, build: 4, bridge: 5, peak: 6, sustain: 6 },
  throwing:    { foundation: 3, build: 4, bridge: 5, peak: 6, sustain: 6 },
  defense:     { foundation: 2, build: 3, bridge: 4, peak: 5, sustain: 6 },
  baserunning: { foundation: 1, build: 2, bridge: 3, peak: 4, sustain: 6 },
};

/** Pitcher throwing is bullpen-capped — the arm can't hold 6 max-intent days. */
const PITCHER_THROWING_LADDER: Record<RoadmapRung, number> = {
  foundation: 3, build: 4, bridge: 4, peak: 5, sustain: 5,
};

function isPitcher(position: unknown): boolean {
  return positionTokenIsPitcher(position);
}

const LEG_INJURIES = new Set(["hamstring", "ankle", "knee", "groin", "quad"]);
const ARM_INJURIES = new Set(["shoulder", "ucl", "elbow", "labrum", "rotator"]);

/**
 * Resolve the target number of days/week for a skill modality.
 *
 * Deterministic. No I/O. Never returns > SKILL_DAYS_CEILING.
 */
export function resolveSkillDaysTarget(
  rung: RoadmapRung,
  modality: SkillModality,
  position: unknown,
  injuryRegions: ReadonlyArray<string> = [],
  lifecycleBand: string | null = null,
  liftingAgeYears: number | null = null,
): number {
  let target =
    modality === "throwing" && isPitcher(position)
      ? PITCHER_THROWING_LADDER[rung]
      : POSITION_LADDER[modality][rung];

  // Training-age / youth clamp — never exceed Bridge target while learning.
  const youngBand =
    lifecycleBand === "u10" || lifecycleBand === "u12" || lifecycleBand === "u14";
  const lowLiftingAge = typeof liftingAgeYears === "number" && liftingAgeYears < 1;
  if (youngBand || lowLiftingAge) {
    const bridgeTarget =
      modality === "throwing" && isPitcher(position)
        ? PITCHER_THROWING_LADDER.bridge
        : POSITION_LADDER[modality].bridge;
    target = Math.min(target, bridgeTarget);
  }

  // Injury clamps — flags never *raise* the target, only lower it.
  const hasLeg = injuryRegions.some((r) => LEG_INJURIES.has(r.toLowerCase()));
  const hasArm = injuryRegions.some((r) => ARM_INJURIES.has(r.toLowerCase()));
  if ((modality === "defense" || modality === "baserunning") && hasLeg) {
    target = Math.min(target, 2);
  }
  if (modality === "throwing" && hasArm) {
    target = Math.min(target, 2);
  }

  return Math.max(0, Math.min(SKILL_DAYS_CEILING, target));
}

export interface SkillLadderRow {
  readonly modality: SkillModality;
  readonly target: number;         // days/week the plan is trying to hit
  readonly earned: number;         // days completed in the last 7d
  readonly nextRungTarget: number | null;
  readonly rationale: string;
}

export function projectSkillLadder(
  rung: RoadmapRung,
  nextRung: RoadmapRung | null,
  proj: Pick<AthleteContextProjection, "injuryRegions" | "lifecycleBand" | "liftingAgeYears">,
  position: unknown,
  earnedDaysByModality: Partial<Record<SkillModality, number>>,
): ReadonlyArray<SkillLadderRow> {
  return SKILL_MODALITIES.map((m) => {
    const target = resolveSkillDaysTarget(
      rung, m, position, proj.injuryRegions, proj.lifecycleBand, proj.liftingAgeYears,
    );
    const nextTarget =
      nextRung === null
        ? null
        : resolveSkillDaysTarget(
            nextRung, m, position, proj.injuryRegions, proj.lifecycleBand, proj.liftingAgeYears,
          );
    const earned = Math.max(0, Math.min(SKILL_DAYS_CEILING, earnedDaysByModality[m] ?? 0));
    const rationale = buildRationale(m, target, earned, nextTarget);
    return { modality: m, target, earned, nextRungTarget: nextTarget, rationale };
  });
}

function buildRationale(
  m: SkillModality,
  target: number,
  earned: number,
  nextTarget: number | null,
): string {
  if (target === 0) {
    return `${label(m)} is fully suppressed today — safety-first floors are protecting you.`;
  }
  const base = `${label(m)}: aim for ${target}/wk — you've hit ${earned}/7 in the last week.`;
  if (nextTarget !== null && nextTarget > target) {
    return `${base} Next rung targets ${nextTarget}/wk — stack the days first, intensity follows.`;
  }
  if (target === SKILL_DAYS_CEILING) {
    return `${base} You're at the pro daily cadence — hold this rhythm and self-regulate intensity.`;
  }
  return base;
}

function label(m: SkillModality): string {
  return m === "baserunning" ? "Baserunning" : m.charAt(0).toUpperCase() + m.slice(1);
}
