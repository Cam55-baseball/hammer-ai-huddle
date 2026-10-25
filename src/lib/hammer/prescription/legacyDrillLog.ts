import { jumpMeasure } from "@/lib/logging/measureType";
export type LegacyLogField = {
  key: "reps" | "throws" | "distance" | "time";
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
  // Names can contain distances or timing examples; only the authored dose sets targets.
  const text = dosage.toLowerCase().replace(/×/g, "x");
  const activity = `${name} ${dosage}`.toLowerCase();
  const sets = firstNumber(text, /\b(\d+)\s*(?:sets?\s*)?x\s*\d+/) ?? firstNumber(text, /\b(\d+)\s*(?:rounds?|sets?)\s+(?:of|at)\b/) ?? 1;
  const multiplied = firstNumber(text, /\b\d+\s*(?:sets?\s*)?x\s*(\d+(?:\.\d+)?)/);
  const reps = firstNumber(text, /\b(\d+)\s*(?:reps?|contacts?|catches?|swings?|steps?|runs?|trips?|bursts?|ladders?|breaths?|rocks?)\b/) ?? multiplied ?? firstNumber(text, /\b(\d+)\s*(?:slow\s*)?(?:per|each)\b/) ?? firstNumber(text, /\b(\d+)\s+slow\s+(?:reps?|breaths?|rocks?)/);
  const targetText = text.replace(/rest\s*:?\s*\d+(?:\.\d+)?\s*(?:seconds?|secs?|s|minutes?|mins?)\b/g, "");
  const seconds = firstNumber(targetText, /\b(\d+(?:\.\d+)?)\s*(?:seconds?|secs?|s)\b/);
  const minutes = firstNumber(targetText, /\b(\d+(?:\.\d+)?)\s*(?:minutes?|mins?)\b/);
  const feet = firstNumber(text, /\b(\d+(?:\.\d+)?)\s*(?:feet|foot|ft)\b/);
  const yards = firstNumber(text, /\b(\d+(?:\.\d+)?)\s*(?:yards?|yds?)\b/);
  const distance = feet ?? (yards == null ? null : yards * 3);
  const jump = jumpMeasure(name);
  if (jump) return { rows: Math.max(1, sets), completion: false, fields: [{ key: "distance", label: jump === "jump_distance" ? "Jump distance" : "Jump height", unit: jump === "jump_distance" ? "ft + in" : "in", prefill: null }] };

  if (["warmup", "mobility", "recovery", "arm_care"].includes(modality)) {
    const counted = reps ?? firstNumber(text, /^(\d+)\s*(?:per|each|slow)/);
    const fields: LegacyLogField[] = [];
    if (counted != null) fields.push({ key: "reps", label: /steps.*each way/.test(text) ? "Steps each way" : /steps/.test(text) ? "Steps" : /contacts/.test(text) ? "Contacts" : /per (?:leg|side)|each (?:leg|side)/.test(text) ? "Reps per leg" : /breaths/.test(text) ? "Breaths" : "Reps", prefill: counted });
    if (distance != null) fields.push({ key: "distance", label: "Distance", unit: yards != null ? "yd" : "ft", prefill: distance });
    if (seconds != null || minutes != null) fields.push({ key: "time", label: "Time", unit: "s", prefill: seconds ?? (minutes == null ? null : minutes * 60) });
    if (fields.length) return { rows: Math.max(1, sets), completion: true, fields };
    // Time is entered in real segments (s / mm:ss) and stored in seconds — never decimal minutes.
    return { rows: Math.max(1, sets), completion: true, fields: [{ key: "reps", label: "Reps", prefill: null }] };
  }
  if (/pop[_ -]?time|pop to (2b|second)/.test(name.toLowerCase())) {
    return { rows: sets, completion: false, fields: [{ key: "time", label: "Pop time", unit: "ss.hh", prefill: seconds }] };
  }
  if (modality === "throwing" || modality === "pitching" || /throw|pitch|bullpen|catch play|plyo ball/.test(activity)) {
    return { rows: sets, completion: false, fields: [{ key: "throws", label: "Throws", prefill: reps }] };
  }
  if (modality === "conditioning" || modality === "baserunning") {
    return { rows: Math.max(1, sets > 1 ? sets : reps ?? 1), completion: false, fields: [
      ...(distance == null ? [] : [{ key: "distance" as const, label: "Distance", unit: "ft", prefill: distance }]),
      { key: "time", label: "Time", unit: "s", prefill: seconds },
    ] };
  }
  if (seconds != null) {
    return { rows: sets, completion: false, fields: [{ key: "time", label: "Seconds", unit: "s", prefill: seconds }] };
  }
  return { rows: sets, completion: false, fields: [{ key: "reps", label: /swing|contact|hit/.test(activity) ? "Swings" : "Reps", prefill: reps }] };
}