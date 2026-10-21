/** The immutable part of an actual wk_prescriptions row. Null is explicit absence.
 * These are saved columns, not catalog defaults. Rest stays inside why_payload.
 */
export interface SwapSavedContext {
  slot: string;
  phase: string;
  sequence_order: number;
  sequence_role: string | null;
  cns_cost: number;
  cns_clamped: boolean;
  density_target_seconds: number | null;
  intensity_mode: string | null;
  rir_low: number | null;
  rir_high: number | null;
  intent_tag: string | null;
  execution_note: string | null;
  per_side: boolean | null;
  open_ended: boolean | null;
  set_range_max: number | null;
  adaptation: string | null;
  asymmetry_rule: string | null;
  engine: string | null;
  generator_version: string | null;
  rationale: string | null;
  cue_ids: string[] | null;
  validator_report: unknown;
  why_v2: unknown;
  why_payload: Record<string, unknown>;
}
const numbers = ["sequence_order", "cns_cost", "density_target_seconds", "rir_low", "rir_high", "set_range_max"] as const;
const strings = ["slot", "phase", "sequence_role", "intensity_mode", "intent_tag", "execution_note", "adaptation",
  "asymmetry_rule", "engine", "generator_version", "rationale"] as const;
const booleans = ["cns_clamped", "per_side", "open_ended"] as const;
export const SWAP_CONTEXT_FIELDS = [...numbers, ...strings, ...booleans, "cue_ids", "validator_report", "why_v2", "why_payload"] as const;

/** JSON equivalence without depending on object key order or permitting undefined/non-finite values. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object" && value && Object.getPrototypeOf(value) === Object.prototype) {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  throw new Error("The saved exercise context is incomplete. Reload your plan.");
}

export function requireSwapSavedContext(context: SwapSavedContext): void {
  for (const field of SWAP_CONTEXT_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(context, field)) throw new Error("The saved exercise context is incomplete. Reload your plan.");
    canonicalJson(context[field]);
  }
  for (const field of numbers) if (context[field] !== null && (typeof context[field] !== "number" || !Number.isFinite(context[field]))) {
    throw new Error("The saved exercise context is incomplete. Reload your plan.");
  }
  for (const field of strings) if (context[field] !== null && typeof context[field] !== "string") {
    throw new Error("The saved exercise context is incomplete. Reload your plan.");
  }
  for (const field of booleans) if (context[field] !== null && typeof context[field] !== "boolean") {
    throw new Error("The saved exercise context is incomplete. Reload your plan.");
  }
  if (!context.slot?.trim() || !context.phase?.trim() || typeof context.sequence_order !== "number" ||
      typeof context.cns_cost !== "number" || typeof context.cns_clamped !== "boolean" ||
      !context.why_payload || Array.isArray(context.why_payload) ||
      (context.cue_ids !== null && (!Array.isArray(context.cue_ids) || context.cue_ids.some(id => typeof id !== "string")))) {
    throw new Error("The saved exercise context is incomplete. Reload your plan.");
  }
}

/** Only the replacement cue and server-owned substitution receipt may change here.
 * Rest, PAP, dose interpretation, safety provenance and every unrelated payload key stay intact.
 */
export function unchangedSwapContext(before: SwapSavedContext, after: SwapSavedContext): boolean {
  requireSwapSavedContext(before); requireSwapSavedContext(after);
  return SWAP_CONTEXT_FIELDS.every(field => {
    if (field !== "why_payload") return canonicalJson(before[field]) === canonicalJson(after[field]);
    const retained = (payload: Record<string, unknown>) => Object.fromEntries(Object.entries(payload)
      .filter(([key]) => key !== "cue" && key !== "athlete_substitution"));
    return canonicalJson(retained(before.why_payload)) === canonicalJson(retained(after.why_payload));
  });
}