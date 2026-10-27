import { jumpMeasure } from "@/lib/logging/measureType";
export type LegacyLogField = {
  key: "reps" | "throws" | "distance" | "time" | "attempts" | "successes" | `reps_${number}`;
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
  const feet = firstNumber(targetText, /\b(\d+(?:\.\d+)?)\s*(?:feet|foot|ft)\b/);
  const yards = firstNumber(targetText, /\b(\d+(?:\.\d+)?)\s*(?:yards?|yds?)\b/);
  const distance = feet ?? (yards == null ? null : yards * 3);
  const jump = jumpMeasure(name);
  if (modality === 'bunting' || /\b(?:squeeze|sac|sacrifice|drag|push|hit) bunt\b|\bbunt for a hit\b/i.test(name)) return { rows:Math.max(1,sets),completion:false,fields:[{key:'attempts',label:'Attempts',prefill:firstNumber(text,/\b(\d+)\s*attempts?\b/) ?? reps},{key:'successes',label:'Successful bunts',prefill:null}] };
  if (jump) return { rows: Math.max(1, sets), completion: false, fields: [{ key: "distance", label: jump === "jump_distance" ? "Jump distance" : "Jump height", unit: jump === "jump_distance" ? "ft + in" : "in", prefill: null }] };

  if (["warmup", "mobility", "recovery", "arm_care"].includes(modality)) {
    const counted = reps ?? firstNumber(text, /^(\d+)\s*(?:per|each|slow)/);
    const fields: LegacyLogField[] = [];
    if (counted != null) fields.push({ key: "reps", label: /steps.*each way/.test(text) ? "Steps each way" : /steps/.test(text) ? "Steps" : /contacts/.test(text) ? "Contacts" : /each direction|per direction/.test(text) ? "Reps each direction" : /per arm|each arm/.test(text) ? "Reps per arm" : /per leg|each leg/.test(text) ? "Reps per leg" : /per side|each side/.test(text) ? /shoulder|arm|wrist|elbow/.test(name.toLowerCase()) ? "Reps per arm" : "Reps per side" : /breaths/.test(text) ? "Breaths" : "Reps", prefill: counted });
    if (distance != null) fields.push({ key: "distance", label: "Distance", unit: yards != null ? "yd" : "ft", prefill: distance });
    if (seconds != null || minutes != null) fields.push({ key: "time", label: "Time", unit: "s", prefill: seconds ?? (minutes == null ? null : minutes * 60) });
    if (fields.length) return { rows: Math.max(1, sets), completion: true, fields };
    // Time is entered in real segments (s / mm:ss) and stored in seconds — never decimal minutes.
    return { rows: Math.max(1, sets), completion: true, fields: [{ key: "reps", label: "Reps", prefill: null }] };
  }
  if (/pop[_ -]?time|pop to (2b|second)/.test(name.toLowerCase())) {
    return { rows: sets, completion: false, fields: [{ key: "time", label: "Pop time", unit: "ss.hh", prefill: seconds }] };
  }
  // A throwing card includes non-throwing preparation. Card category cannot turn band reps into throws.
  if ((modality === "throwing" || modality === "pitching") && /band series|band activation|band prep|neural prep|mobility flush|lat \+ hip opener|wrist snap \+ forearm/.test(name.toLowerCase()) && !/\bthrows?\b/.test(targetText)) {
    const parts = targetText.split(",").map(part => part.trim().replace(/^full activation set:\s*/, ""));
    const components = parts.map(part => part.match(/^(.+?)\s+(\d+)\s*x\s*(\d+(?:\.\d+)?)(.*)$/));
    // Only expand fully declared, equal-set circuits; mixed time/rep sequences need explicit row metadata.
    if (components.length > 1 && components.every(part => part && Number(part[2]) === Number(components[0]?.[2]))) {
      return { rows: Number(components[0]?.[2]), completion: false, fields: components.flatMap((part, index) => part ? [{ key: `reps_${index}` as const, label: `${part[1]}${/each direction/.test(part[4]) ? " · each direction" : /per side/.test(part[4]) ? " · per side" : ""} reps`, prefill: Number(part[3]) }] : []) };
    }
    return { rows: sets, completion: false, fields: [{ key: "reps", label: "Reps", prefill: reps }] };
  }
  if (modality === "throwing" || modality === "pitching" || /throw|pitch|bullpen|catch play|plyo ball/.test(activity)) {
    return { rows: sets, completion: false, fields: [{ key: "throws", label: "Throws", prefill: reps }] };
  }
  if (modality === "conditioning" || modality === "baserunning" || modality === "speed" && distance != null) {
    return { rows: Math.max(1, sets > 1 ? sets : reps ?? 1), completion: false, fields: [
      ...(distance == null ? [] : [{ key: "distance" as const, label: "Distance", unit: "ft", prefill: distance }]),
      { key: "time", label: "Time", unit: "s", prefill: seconds ?? (minutes == null ? null : minutes * 60) },
    ] };
  }
  if (seconds != null || minutes != null) {
    return { rows: sets, completion: false, fields: [{ key: "time", label: "Seconds", unit: "s", prefill: seconds ?? (minutes == null ? null : minutes * 60) }] };
  }
  return { rows: sets, completion: false, fields: [{ key: "reps", label: /swing|contact|hit/.test(activity) ? "Swings" : "Reps", prefill: reps }] };
}