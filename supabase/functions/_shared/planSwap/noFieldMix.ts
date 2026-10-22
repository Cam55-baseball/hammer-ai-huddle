import { sprintRestSeconds } from "../wic/runRest.ts";

export interface NoFieldInputs {
  spaceYards: number | null;
  hill: boolean;
  sled: boolean;
  band: boolean;
  treadmill: boolean;
  readiness: "ready" | "limited" | "stop" | null;
  cnsLoad: number | null;
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
    input.cnsLoad >= 7 || !input.phase || input.injuries.some(flag => flag.trim())) return refused;
  // Short acceleration and tempo must not masquerade as top-speed work.
  if (input.goal === "max_velocity") return refused;
  if (input.spaceYards == null || !Number.isFinite(input.spaceYards) || input.spaceYards < 10) return refused;
  const yards = Math.min(15, Math.floor(input.spaceYards));
  const pool = [{ slug: "swap_short_acceleration", name: "Short-space accelerations" }];
  if (input.hill) pool.push({ slug: "swap_hill_acceleration", name: "Hill accelerations" });
  else if (input.sled) pool.push({ slug: "swap_sled_acceleration", name: "Resisted sled accelerations" });
  else if (input.band) pool.push({ slug: "swap_band_acceleration", name: "Resisted band accelerations" });
  // Treadmill availability alone cannot establish a safe acceleration protocol.
  const selected = pool.slice(0, Math.min(2, input.totalReps));
  const items = selected.map((item, index): SpeedMixItem => ({ ...item, category: "speed", intent: input.goal,
    reps: selected.length === 1 ? input.totalReps : index === 0 ? Math.ceil(input.totalReps / 2) : Math.floor(input.totalReps / 2),
    distanceYards: yards, restSeconds: sprintRestSeconds(yards * 3) ?? 60 }));
  return { items, because: `Because you have ${yards} yards${input.hill ? " and a hill" : input.sled ? " and a sled" : input.band ? " and bands" : " of clear space"}, this keeps your ${input.totalReps} acceleration reps with full rest.` };
}