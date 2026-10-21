import { recordedSwapDose, sameDoseSwap, type SwapDose } from "./sameDoseSwap";

export interface SwapOrigin {
  from_slug: string;
  from_name: string;
  from_sets: number | null;
  from_dose: SwapDose;
  from_cue: string | null;
  from_cue_present: boolean;
}

/** Keep the first prescription intact through any number of replacements. */
export function swapOrigin(rx: SwapDose & {
  movement_slug: string;
  movement_name: string;
  substituted_from_slug: string | null;
  why_payload: Record<string, unknown> | null;
}): SwapOrigin {
  const prior = rx.why_payload?.athlete_substitution;
  if (rx.substituted_from_slug) {
    if (!prior || typeof prior !== "object") throw new Error("The original exercise was not saved. Your session is unchanged.");
    const receipt = prior as Record<string, unknown>;
    if (receipt.from_slug !== rx.substituted_from_slug || typeof receipt.from_name !== "string" || !receipt.from_name.trim()) {
      throw new Error("The original exercise is incomplete. Your session is unchanged.");
    }
    if (typeof receipt.from_cue_present !== "boolean" ||
      (receipt.from_cue !== null && typeof receipt.from_cue !== "string")) {
      throw new Error("The original instructions were not saved. Your session is unchanged.");
    }
    const dose = recordedSwapDose(receipt.from_dose);
    return { from_slug: receipt.from_slug, from_name: receipt.from_name, from_sets: dose.sets,
      from_dose: dose, from_cue: receipt.from_cue as string | null, from_cue_present: receipt.from_cue_present };
  }
  const cue = rx.why_payload?.cue;
  if (cue !== undefined && cue !== null && typeof cue !== "string") {
    throw new Error("The exercise instructions could not be saved. Your session is unchanged.");
  }
  return { from_slug: rx.movement_slug, from_name: rx.movement_name, from_sets: rx.sets,
    from_dose: sameDoseSwap(rx, { dosage_unit: rx.dosage_unit }), from_cue: cue ?? null,
    from_cue_present: !!rx.why_payload && Object.hasOwn(rx.why_payload, "cue") };
}

export function restoreSwapInstructions(why: Record<string, unknown>, origin: SwapOrigin): Record<string, unknown> {
  const restored = { ...why };
  delete restored.athlete_substitution;
  if (origin.from_cue_present) restored.cue = origin.from_cue;
  else delete restored.cue;
  return restored;
}

export function requireUnmarkedSwap(status: string): void {
  if (status !== "planned" && status !== "pending") {
    throw new Error("This exercise has already been marked. Your session is unchanged.");
  }
}