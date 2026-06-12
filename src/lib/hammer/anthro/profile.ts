/**
 * Anthropometric profile — pure, interpretive, replay-safe.
 *
 * Reads the `anthropometrics` spine value (JSONB, athlete-reported, optional
 * measurements) and derives lever-archetype flags used by the strength &
 * throwing prescribers to bias exercise selection.
 *
 * Eternal-law compliance:
 *   - No DB writes. No organism-truth authoring.
 *   - Missingness preserved — a missing measurement does NOT trigger
 *     a default selection branch; we simply skip the corresponding flag.
 *   - Pure function — deterministic for replay equivalence.
 */

export interface AnthropometricsRaw {
  readonly height_in?: number | string | null;
  readonly weight_lbs?: number | string | null;
  readonly wingspan_in?: number | string | null;
  readonly leg_length_in?: number | string | null;
  readonly forearm_in?: number | string | null;
  readonly femur_in?: number | string | null;
  readonly tibia_in?: number | string | null;
  readonly torso_in?: number | string | null;
  readonly arm_total_in?: number | string | null;
}

export type LegLeverFlag = "long_tibia" | "long_femur" | "balanced";
export type ForearmFlag = "long_forearm" | "short_forearm" | "balanced";
export type TorsoFlag = "long_torso" | "short_torso" | "balanced";
export type Archetype = "long_levers" | "compact" | "balanced" | "mixed" | "unknown";

export interface AnthroProfile {
  readonly apeIndex: number | null;
  readonly lowerLegFlag: LegLeverFlag | null;
  readonly forearmFlag: ForearmFlag | null;
  readonly torsoFlag: TorsoFlag | null;
  readonly archetype: Archetype;
  readonly flags: ReadonlyArray<string>;
  readonly missing: ReadonlyArray<string>;
}

const EMPTY: AnthroProfile = {
  apeIndex: null,
  lowerLegFlag: null,
  forearmFlag: null,
  torsoFlag: null,
  archetype: "unknown",
  flags: [],
  missing: [
    "height_in",
    "wingspan_in",
    "femur_in",
    "tibia_in",
    "forearm_in",
    "arm_total_in",
    "torso_in",
  ],
};

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Interpret the athlete's anthropometrics into lever-archetype flags. */
export function buildAnthroProfile(raw: unknown): AnthroProfile {
  if (!raw || typeof raw !== "object") return EMPTY;
  const a = raw as AnthropometricsRaw;
  const height = num(a.height_in);
  const wingspan = num(a.wingspan_in);
  const femur = num(a.femur_in);
  const tibia = num(a.tibia_in);
  const forearm = num(a.forearm_in);
  const armTotal = num(a.arm_total_in);
  const torso = num(a.torso_in);

  const missing: string[] = [];
  if (height == null) missing.push("height_in");
  if (wingspan == null) missing.push("wingspan_in");
  if (femur == null) missing.push("femur_in");
  if (tibia == null) missing.push("tibia_in");
  if (forearm == null) missing.push("forearm_in");
  if (armTotal == null) missing.push("arm_total_in");
  if (torso == null) missing.push("torso_in");

  const flags: string[] = [];

  const apeIndex = height && wingspan ? wingspan / height : null;
  if (apeIndex != null) {
    if (apeIndex >= 1.05) flags.push("long_arms");
    else if (apeIndex <= 0.97) flags.push("short_arms");
  }

  let lowerLegFlag: LegLeverFlag | null = null;
  if (femur != null && tibia != null) {
    const ratio = tibia / femur;
    if (ratio >= 1.04) lowerLegFlag = "long_tibia";
    else if (ratio <= 0.92) lowerLegFlag = "long_femur";
    else lowerLegFlag = "balanced";
    if (lowerLegFlag !== "balanced") flags.push(lowerLegFlag);
  }

  let forearmFlag: ForearmFlag | null = null;
  if (forearm != null && armTotal != null && armTotal > forearm) {
    const ratio = forearm / armTotal;
    if (ratio >= 0.48) forearmFlag = "long_forearm";
    else if (ratio <= 0.42) forearmFlag = "short_forearm";
    else forearmFlag = "balanced";
    if (forearmFlag !== "balanced") flags.push(forearmFlag);
  }

  let torsoFlag: TorsoFlag | null = null;
  if (torso != null && height != null) {
    const ratio = torso / height;
    if (ratio >= 0.34) torsoFlag = "long_torso";
    else if (ratio <= 0.29) torsoFlag = "short_torso";
    else torsoFlag = "balanced";
    if (torsoFlag !== "balanced") flags.push(torsoFlag);
  }

  // Coarse archetype synthesis.
  let archetype: Archetype = "unknown";
  const longBias =
    (apeIndex != null && apeIndex >= 1.04) ||
    lowerLegFlag === "long_tibia" ||
    lowerLegFlag === "long_femur" ||
    forearmFlag === "long_forearm";
  const compactBias =
    (apeIndex != null && apeIndex <= 0.98) ||
    forearmFlag === "short_forearm" ||
    torsoFlag === "short_torso";
  if (longBias && compactBias) archetype = "mixed";
  else if (longBias) archetype = "long_levers";
  else if (compactBias) archetype = "compact";
  else if (apeIndex != null || lowerLegFlag || forearmFlag || torsoFlag) archetype = "balanced";

  return {
    apeIndex,
    lowerLegFlag,
    forearmFlag,
    torsoFlag,
    archetype,
    flags,
    missing,
  };
}

/** True when at least one lever flag was resolvable. */
export function hasAnyAnthroSignal(p: AnthroProfile): boolean {
  return (
    p.apeIndex != null ||
    p.lowerLegFlag != null ||
    p.forearmFlag != null ||
    p.torsoFlag != null
  );
}
