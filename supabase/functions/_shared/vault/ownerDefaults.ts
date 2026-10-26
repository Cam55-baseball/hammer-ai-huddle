import { COMMON_SWAP_GEAR } from "../planSwap/commonGear.ts";

const aliases: Record<string, string> = {
  dumbbells: "dumbbell", db: "dumbbell", band: "bands", "resistance bands": "bands",
  machine: "pitching_machine", "pitching machine": "pitching_machine",
  "field space": "open_field", "open field": "open_field", "foam roller": "foam_roller",
  baseball: "baseballs", softball: "softballs", "none": "none", bodyweight: "none",
  bat: "gamer_bat", "game bat": "gamer_bat",
};
export function ownerGear(items: readonly string[]) {
  const unknown: string[] = [];
  const equipment = [...new Set(items.map(item => {
    const original = item.trim();
    const token = aliases[original.toLowerCase()] ?? original.toLowerCase().replace(/[\s-]+/g, "_");
    if (token === "none" || (COMMON_SWAP_GEAR as readonly string[]).includes(token)) return token;
    unknown.push(original);
    return original;
  }).filter(Boolean))];
  return { equipment, unknown: [...new Set(unknown)] };
}

/** Defaults are editable, not a certification of an unknown movement's safety. */
export function ownerIdentity(id: string) {
  return { id, slug: `owner_${id.replace(/-/g, "_")}` };
}
export const OWNER_DEFAULTS = {
  default_sets: 2, default_reps: 8, measure_type: "reps",
  card_type: "warmup", catalog_category: "movement_patterning", warmup_stage: 3,
  intensity_class: "low", min_age: 13, rest_rule: "none", arm_weight: 0, primer_role: "none" as const,
  cue: "Follow the written movement and stay in a comfortable range.",
  stop_if: "Pain, numbness, dizziness or loss of control — stop.",
};