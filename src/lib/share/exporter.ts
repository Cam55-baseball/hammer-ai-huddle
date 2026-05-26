/**
 * Wave 3 — Share/export builder. Re-runs from canonical events; no cached truth.
 * Embeds replay handle (engineVersion + lastEventId) in metadata.
 */
import type { AsbEventRow } from "@/hooks/useAsbTimeline";
import { ENGINE_VERSION } from "@/lib/asb/engineVersion";
import { shareState } from "@/lib/runtime/projections/shareState";
import type { DailyPrescription } from "@/lib/runtime/prescription";

export interface ShareExport {
  engine_version: string;
  replay_handle: string;
  last_event_id: string | null;
  generated_at_event_id: string | null;
  confidence: number | null;
  sources: string[];
  scope: string;
  payload: {
    kind: DailyPrescription["kind"];
    state: DailyPrescription["state"];
    headline: string;
    rationale: string[];
  } | null;
}

export function buildShareExport(
  rows: AsbEventRow[] | undefined,
  prescription: DailyPrescription | null,
): ShareExport {
  const { state, meta } = shareState(rows, "self");
  if (!state.granted) {
    return {
      engine_version: ENGINE_VERSION,
      replay_handle: `${ENGINE_VERSION}::${meta.lastEventId ?? "∅"}`,
      last_event_id: meta.lastEventId,
      generated_at_event_id: state.lastSource,
      confidence: null,
      sources: [],
      scope: state.scope,
      payload: null,
    };
  }
  return {
    engine_version: ENGINE_VERSION,
    replay_handle: `${ENGINE_VERSION}::${meta.lastEventId ?? "∅"}`,
    last_event_id: meta.lastEventId,
    generated_at_event_id: state.lastSource,
    confidence: prescription?.confidence ?? null,
    sources: prescription?.sourceEventIds ?? [],
    scope: state.scope,
    payload: prescription
      ? {
          kind: prescription.kind,
          state: prescription.state,
          headline: prescription.headline,
          rationale: prescription.rationale,
        }
      : null,
  };
}
