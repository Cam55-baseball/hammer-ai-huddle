export type LegacyLogField = {
  key: "reps" | "throws" | "distance" | "time" | "minutes";
  label: string;
  unit?: string;
  prefill: number | null;
};

export type LegacyDrillLogSpec = {
  rows: number;
  fields: LegacyLogField[];
  completion: boolean;
};

function firstNumber(text: string, pattern: RegExp): number | null {
  const value = text.match(pattern)?.[1];
  return value ? Number(value) : null;
}

/** Presentation-only parser for the dose already authored by the plan. */
export function legacyDrillLogSpec(modality: string, name: string, dosage: string): LegacyDrillLogSpec {
  const text = `${name} ${dosage}`.toLowerCase().replace(/×/g, "x");
  const sets = firstNumber(text, /\b(\d+)\s*(?:sets?\s*)?x\s*\d+/) ?? 1;
  const multiplied = firstNumber(text, /\b\d+\s*(?:sets?\s*)?x\s*(\d+)/);
  const reps = firstNumber(text, /\b(\d+)\s*(?:reps?|contacts?|catches?|swings?|steps?|runs?|trips?|bursts?|rounds?|ladders?)\b/) ?? multiplied;
  const seconds = firstNumber(text, /\b(\d+(?:\.\d+)?)\s*(?:seconds?|secs?|s)\b/);
  const minutes = firstNumber(text, /\b(\d+(?:\.\d+)?)\s*(?:minutes?|mins?)\b/);
  const feet = firstNumber(text, /\b(\d+(?:\.\d+)?)\s*(?:feet|foot|ft)\b/);
  const yards = firstNumber(text, /\b(\d+(?:\.\d+)?)\s*(?:yards?|yds?)\b/);
  const distance = feet ?? (yards == null ? null : yards * 3);

  if (["warmup", "mobility", "recovery", "arm_care"].includes(modality)) {
    return { rows: 1, completion: true, fields: [{ key: "minutes", label: "Minutes", unit: "min", prefill: minutes }] };
  }
  if (modality === "throwing" || /throw|pitch|bullpen|catch play|plyo ball/.test(text)) {
    return { rows: sets, completion: false, fields: [{ key: "throws", label: "Throws", prefill: reps }] };
  }
  if (modality === "conditioning" || modality === "baserunning") {
    return { rows: Math.max(1, sets, reps ?? 1), completion: false, fields: [
      ...(distance == null ? [] : [{ key: "distance" as const, label: "Distance", unit: "ft", prefill: distance }]),
      { key: "time", label: "Time", unit: "s", prefill: seconds },
    ] };
  }
  if (seconds != null) {
    return { rows: sets, completion: false, fields: [{ key: "time", label: "Seconds", unit: "s", prefill: seconds }] };
  }
  return { rows: sets, completion: false, fields: [{ key: "reps", label: /swing|contact|hit/.test(text) ? "Swings" : "Reps", prefill: reps }] };
}