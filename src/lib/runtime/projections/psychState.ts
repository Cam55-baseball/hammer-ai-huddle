/**
 * Phase 153 — relational.psych.* projection.
 *
 * Pure, deterministic, memoized. Folds psych events into per-axis state.
 * Self-supremacy enforced: self_report always supersedes inferred on the
 * same axis. Inferred confidence is clamped to 0.7 (defense in depth — the
 * schema also enforces this).
 */
import { memoize, type Scope } from "./types";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";
import {
  PSYCH_AXES,
  type PsychAxis,
  type PsychBand,
  bandOfValue,
} from "@/lib/runtime/relational/schemas";
import {
  clampInferredConfidence,
  resolveEffectiveBand,
} from "@/lib/runtime/relational/psychInference";

export interface PsychAxisState {
  axis: PsychAxis;
  self_reported_value: number | null;
  self_reported_event_id: string | null;
  inferred_value: number | null;
  inferred_confidence: number | null;
  inferred_event_id: string | null;
  effective_band: PsychBand | null;
  effective_value: number | null;
  confidence: number | null;
  source: "self" | "inferred" | "none";
  requires_ack: boolean;
  evidence_event_ids: string[];
  missingness_fields: string[];
}

export interface PsychState {
  axes: Record<PsychAxis, PsychAxisState>;
}

const PREFIXES = ["relational.psych."];

function emptyAxis(axis: PsychAxis): PsychAxisState {
  return {
    axis,
    self_reported_value: null,
    self_reported_event_id: null,
    inferred_value: null,
    inferred_confidence: null,
    inferred_event_id: null,
    effective_band: null,
    effective_value: null,
    confidence: null,
    source: "none",
    requires_ack: false,
    evidence_event_ids: [],
    missingness_fields: [],
  };
}

export const buildPsychState = memoize<PsychState>((rows) => {
  const axes: Record<string, PsychAxisState> = {};
  for (const a of PSYCH_AXES) axes[a] = emptyAxis(a);

  for (const r of rows) {
    const p = r.payload as Record<string, unknown> | undefined;
    if (!p) continue;
    const axis = p.axis as PsychAxis | undefined;
    if (!axis || !PSYCH_AXES.includes(axis)) continue;
    const cur = axes[axis];

    if (r.topic_id === "relational.psych.self_report") {
      cur.self_reported_value = p.value as number;
      cur.self_reported_event_id = r.event_id;
      cur.missingness_fields =
        ((p.missingness as { fields?: string[] })?.fields) ?? [];
    } else if (r.topic_id === "relational.psych.inferred") {
      cur.inferred_value = p.value as number;
      cur.inferred_confidence = clampInferredConfidence(
        (p.confidence as number) ?? 0,
      );
      cur.inferred_event_id = r.event_id;
      cur.evidence_event_ids = (p.evidence_event_ids as string[]) ?? [];
    } else if (r.topic_id === "relational.psych.transition") {
      const requires = Boolean(p.requires_human_ack);
      cur.requires_ack = cur.requires_ack || requires;
    }
  }

  // Resolve effective band per axis using self-supremacy.
  for (const a of PSYCH_AXES) {
    const cur = axes[a];
    const eff = resolveEffectiveBand({
      selfReportValue: cur.self_reported_value,
      inferredValue: cur.inferred_value,
      inferredConfidence: cur.inferred_confidence,
    });
    cur.effective_value = eff.effectiveValue;
    cur.effective_band = eff.effectiveBand;
    cur.confidence = eff.confidence;
    cur.source = eff.source;
    // Auto-flag ack requirement for crisis/strained landed bands.
    if (cur.effective_band === "crisis" || cur.effective_band === "strained") {
      cur.requires_ack = true;
    }
    // Sanity: derived band must equal bandOfValue(effective_value) when present.
    if (
      cur.effective_value !== null &&
      cur.effective_band !== bandOfValue(cur.effective_value)
    ) {
      cur.effective_band = bandOfValue(cur.effective_value);
    }
  }

  return { axes: axes as Record<PsychAxis, PsychAxisState> };
});

export function psychState(
  rows: AsbEventRow[] | undefined,
  scope: Scope,
) {
  return buildPsychState(rows, scope, PREFIXES);
}
