/** One write path for an exercise log row (used by the save hook and the autosave outbox). */
import { canonicalMetricMap, deriveSideMetrics } from "@/lib/hammer/logging/metricNormalizer";

export interface ExerciseLogPayload {
  prescription_id: string;
  plan_date: string;
  movement_slug: string;
  rounds: Record<string, number | string | null>[];
  outcome?: "completed" | "cut_short";
  /** More than prescribed was entered (extra sets, reps, time or distance). */
  did_more?: boolean;
  /** Existing metrics kept on rewrite (e.g. survey answers). */
  extra_metrics?: Record<string, unknown> | null;
  rpe?: number | null;
  bar_feel?: string | null;
  notes?: string | null;
  ai_readback?: string | null;
  template_id?: string | null;
  field_schema?: Array<{ key: string; label: string; unit?: string; kind: string }> | null;
}

const REWRITTEN = new Set(["rounds", "template_id", "field_schema", "one_tap_outcome", "cut_short", "did_more", "per_side"]);

export function buildExerciseLogRow(userId: string, p: ExerciseLogPayload) {
  const repsCompleted = p.rounds.map((r) => (r.reps ?? r.throws ?? r.contacts ?? null)).filter((v): v is number => typeof v === "number");
  const weights = p.rounds.map((r) => r.weight).filter((v): v is number => typeof v === "number");
  const durationTotal = p.rounds.map((r) => r.duration ?? r.time ?? null).filter((v): v is number => typeof v === "number").reduce((a, b) => a + b, 0) || null;
  const d = p.rounds.map((r) => r.distance).filter((v): v is number => typeof v === "number");
  const kept = Object.fromEntries(Object.entries(p.extra_metrics ?? {}).filter(([k]) => !REWRITTEN.has(k)));
  return {
    user_id: userId,
    prescription_id: p.prescription_id,
    plan_date: p.plan_date,
    movement_slug: p.movement_slug,
    sets_completed: p.rounds.length,
    reps_completed: repsCompleted.length ? repsCompleted : null,
    load_used: weights.length ? Math.max(...weights) : null,
    duration_seconds_completed: durationTotal,
    distance_feet_completed: d.length ? Math.max(...d) : null,
    total_reps_completed: repsCompleted.reduce((a, b) => a + b, 0) || null,
    rpe: p.rpe ?? null,
    bar_feel: p.bar_feel ?? null,
    notes: p.notes ?? null,
    ai_readback: p.ai_readback ?? null,
    metrics: {
      ...kept,
      ...(p.outcome ? { one_tap_outcome: p.outcome, cut_short: p.outcome === "cut_short" } : {}),
      ...(p.did_more ? { did_more: true } : {}),
      rounds: p.rounds,
      template_id: p.template_id ?? null,
      field_schema: p.field_schema ?? null,
      ...canonicalMetricMap(p.template_id ?? null, p.rounds),
      per_side: deriveSideMetrics(p.template_id ?? null, p.rounds),
    },
  };
}

/** Replace this prescription's log with the new one. Returns an error message or null. */
export async function writeExerciseLog(client: any, userId: string, p: ExerciseLogPayload): Promise<string | null> {
  const row = buildExerciseLogRow(userId, p);
  const { error: delErr } = await client.from("wk_session_logs").delete().eq("user_id", userId).eq("prescription_id", p.prescription_id);
  if (delErr) return delErr.message || "Could not save";
  const { error } = await client.from("wk_session_logs").insert(row);
  return error ? error.message || "Could not save" : null;
}
