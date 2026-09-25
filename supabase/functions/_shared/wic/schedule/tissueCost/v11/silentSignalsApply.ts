// TCS v1.1 §3 — Silent Signals applied to today's session.
// PURE. Turns logged sessions into signals, and signals into one bounded,
// reduce-never-remove effect on today's card. Pain always wins: when a pain
// record is active the pain rules govern and signals add nothing.
import {
  evaluateSignals,
  respondToSignals,
  type SignalSession,
  type SignalKey,
} from "./silentSignals.ts";

export const SILENT_SIGNALS_APPLY_VERSION = "tcs_signals_apply_v1";

export interface LogRow {
  plan_date: string;
  movement_slug: string | null;
  load_used?: number | null;
  rpe?: number | null;
  reps_completed?: number[] | null;
  sets_completed?: number | null;
  metrics?: Record<string, unknown> | null;
  /** Joined from the prescription when available. */
  reps_prescribed?: number | null;
  target_load?: number | null;
}

/** One SignalSession per logged row, oldest first. Missing data stays missing. */
export function sessionsFromLogs(rows: LogRow[]): SignalSession[] {
  const list = (Array.isArray(rows) ? rows : []).filter((r) => r && typeof r.plan_date === "string");
  return [...list]
    .sort((a, b) => (a.plan_date < b.plan_date ? -1 : a.plan_date > b.plan_date ? 1 : 0))
    .map((r) => {
      const outcome = (r.metrics as any)?.one_tap_outcome;
      const status: SignalSession["status"] =
        outcome === "skipped" || r.sets_completed === 0 ? "skipped" : outcome === "cut_short" ? "cut_short" : "done";
      const reps = Array.isArray(r.reps_completed) && r.reps_completed.length
        ? Math.min(...r.reps_completed.filter((x) => Number.isFinite(x)))
        : null;
      return {
        date: r.plan_date,
        pattern: r.movement_slug,
        region: r.movement_slug,
        status,
        loggedLoad: r.load_used ?? null,
        targetLoad: r.target_load ?? null,
        repsCompleted: Number.isFinite(reps as number) ? reps : null,
        repsPrescribed: r.reps_prescribed ?? null,
        howHard: r.rpe ?? null,
      };
    });
}

export interface SilentSignalEffect {
  applied: boolean;
  /** Always 0 or -1: one CNS-cap step down at most. Never removes a session. */
  cnsCapDelta: 0 | -1;
  signals: SignalKey[];
  /** Neutral copy, first line only on the card. */
  copy: string | null;
  reason: "pain_wins" | "no_signals" | "below_threshold" | "applied";
}

/** Reduce, never remove. Threshold: summed signal weight ≥ 2 (a repeated or two noticed signals). */
export function silentSignalEffect(input: { sessions: SignalSession[]; painActive: boolean }): SilentSignalEffect {
  if (input.painActive) return { applied: false, cnsCapDelta: 0, signals: [], copy: null, reason: "pain_wins" };
  const sig = evaluateSignals(input.sessions ?? []);
  if (sig.length === 0) return { applied: false, cnsCapDelta: 0, signals: [], copy: null, reason: "no_signals" };
  const r = respondToSignals(sig);
  const weight = sig.reduce((a, s) => a + s.weight, 0);
  if (weight < 2) return { applied: false, cnsCapDelta: 0, signals: r.signals, copy: null, reason: "below_threshold" };
  return { applied: true, cnsCapDelta: -1, signals: r.signals, copy: r.copy[0] ?? null, reason: "applied" };
}
