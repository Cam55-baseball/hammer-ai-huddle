import { measureTypeFor } from "@/lib/logging/measureType";

/** Existing catalog units initialize the editor; saved Vault payloads still take precedence. */
export function catalogMeasure(input: { slug: string; name: string; category: string | null; dosage_unit: string | null }): string {
  if (input.dosage_unit === "attempts" && /^bunt_/.test(input.slug)) return "bunt_attempts";
  const measure = measureTypeFor({ ...input, slot: input.category });
  if (measure === "throws") return "throw_count";
  if (measure === "checkoff") return "check_off";
  if (["reps_per_leg", "press_reps", "steps_each_way", "steps", "carry_distance"].includes(measure)) return "reps";
  return measure;
}