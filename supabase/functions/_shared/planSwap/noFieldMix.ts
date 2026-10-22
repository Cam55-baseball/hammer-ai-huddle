import { sprintRestSeconds } from "../wic/runRest.ts";
import { SPEED_SWAP_CATALOG } from "./speedSwapCatalog.ts";

export interface NoFieldInputs {
  spaceYards: number | null;
  hill: boolean;
  sled: boolean;
  band: boolean;
  treadmill: boolean;
  readiness: "ready" | "limited" | "stop" | null;
  cnsLoad: number | null;
  cnsCap?: number | null;
  phase: string;
  goal: "acceleration" | "max_velocity";
  injuries: readonly string[];
  ageYears: number | null;
  totalReps: number;
}
export interface SpeedMixItem {
  slug: string;
  name: string;
  category: "speed";
  intent: NoFieldInputs["goal"];
  reps: number;
  distanceYards: number;
  restSeconds: number;
}

/** Deterministic selection only; the caller must check catalog legality before saving. */
export function chooseNoFieldMix(input: NoFieldInputs): { items: SpeedMixItem[]; because: string } {
  const refused = { items: [], because: "No safe swap found for this one; skip it today." };
  if (!Number.isInteger(input.totalReps) || input.totalReps < 1 || input.ageYears == null || input.ageYears < 13 ||
    input.readiness !== "ready" || input.cnsLoad == null || !Number.isFinite(input.cnsLoad) || input.cnsLoad < 0 ||
    (input.cnsCap == null ? input.cnsLoad >= 7 : !Number.isFinite(input.cnsCap) || input.cnsCap < 0 || input.cnsLoad > input.cnsCap) ||
    !["os_q1", "os_q2", "os_q3", "os_q4", "in_season", "post_season"].includes(input.phase) || input.injuries.some(flag => flag.trim())) return refused;
  // Short acceleration and tempo must not masquerade as top-speed work.
  if (input.goal === "max_velocity") return refused;
  if (input.spaceYards == null || !Number.isFinite(input.spaceYards) || input.spaceYards < 10) return refused;
  const yards = Math.min(15, Math.floor(input.spaceYards));
  const pool = [SPEED_SWAP_CATALOG[0]];
  // Competitive/recovery phases keep the already-legal plain acceleration; never add resisted novelty.
  const addResistance = input.phase !== "in_season" && input.phase !== "post_season";
  const alternate = addResistance ? input.hill ? SPEED_SWAP_CATALOG[1] : input.sled ? SPEED_SWAP_CATALOG[2] : input.band ? SPEED_SWAP_CATALOG[3] : null : null;
  if (alternate) pool.push(alternate);
  // Treadmill availability alone cannot establish a safe acceleration protocol.
  const selected = pool.slice(0, Math.min(2, input.totalReps));
  const items = selected.map((item, index): SpeedMixItem => ({ ...item, category: "speed", intent: input.goal,
    reps: selected.length === 1 ? input.totalReps : index === 0 ? Math.ceil(input.totalReps / 2) : Math.floor(input.totalReps / 2),
    distanceYards: yards, restSeconds: sprintRestSeconds(yards * 3) ?? 60 }));
  return { items, because: `Because you have ${yards} yards${alternate ? input.hill ? " and a hill" : input.sled ? " and a sled" : " and bands" : " of clear space"}, this keeps your ${input.totalReps} acceleration reps with full rest.` };
}