// Client-side mirror of the Elite Training Methods Engine payload.
// Keep in lockstep with supabase/functions/_shared/wic/methods/*.

export const METHODS_VERSION = "methods_v1";

export type MethodFamily = "contrast" | "intensity" | "density";

export interface MethodStationPayload {
  order: number;
  label: string;
  intent: string;
  loadHint: string;
  reps: number;
  restSeconds: number;
  restLabel: string;
  source: string;
  slug?: string;
  name?: string;
}

export interface TrainingMethodPayload {
  id: string;
  family: MethodFamily | string;
  display_name: string;
  shape: string;
  structure: string;
  rounds: number;
  stations: MethodStationPayload[];
  rest_between_rounds_seconds: number;
  cue: string;
  bailout: string;
  why: string;
  clamps?: string[];
  methods_version?: string;
}

const FAMILY_TONE: Record<string, string> = {
  contrast: "border-primary/50 text-primary",
  intensity: "border-amber-500/50 text-amber-700 dark:text-amber-300",
  density: "border-emerald-500/50 text-emerald-700 dark:text-emerald-300",
};

export function methodTone(family: string | null | undefined): string {
  return FAMILY_TONE[String(family ?? "")] ?? "border-muted-foreground/40 text-muted-foreground";
}

/** Read the method payload off a prescription's why_payload, if any. */
export function readTrainingMethod(
  whyPayload: unknown,
): TrainingMethodPayload | null {
  if (!whyPayload || typeof whyPayload !== "object") return null;
  const m = (whyPayload as Record<string, unknown>).training_method;
  if (!m || typeof m !== "object") return null;
  const t = m as Partial<TrainingMethodPayload>;
  if (!t.id || !t.display_name) return null;
  return {
    id: String(t.id),
    family: String(t.family ?? ""),
    display_name: String(t.display_name),
    shape: String(t.shape ?? ""),
    structure: String(t.structure ?? ""),
    rounds: Number(t.rounds ?? 1) || 1,
    stations: Array.isArray(t.stations) ? (t.stations as MethodStationPayload[]) : [],
    rest_between_rounds_seconds: Number(t.rest_between_rounds_seconds ?? 0) || 0,
    cue: String(t.cue ?? ""),
    bailout: String(t.bailout ?? ""),
    why: String(t.why ?? ""),
    clamps: Array.isArray(t.clamps) ? (t.clamps as string[]) : [],
    methods_version: t.methods_version ? String(t.methods_version) : METHODS_VERSION,
  };
}

export function formatRest(seconds: number): string {
  if (seconds <= 0) return "no rest";
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)} min`;
}
