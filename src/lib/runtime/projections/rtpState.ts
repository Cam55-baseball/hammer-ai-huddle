import { memoize } from "./types";

export type RtpPhase = "acute" | "subacute" | "reintroduction" | "return" | "cleared";

export interface RtpRestriction {
  active: boolean;
  ceilingKind: string | null;
  reason: string | null;
  sourceEventId: string;
}

export interface RtpState {
  phase: RtpPhase | null;
  phaseSource: string | null;
  restrictions: RtpRestriction[];
  clinicianNoteSource: string | null;
}

const PREFIXES = ["rtp."];

export const buildRtpState = memoize<RtpState>((rows) => {
  let phase: RtpPhase | null = null;
  let phaseSource: string | null = null;
  let clinicianNoteSource: string | null = null;
  const restrictions: RtpRestriction[] = [];
  for (const r of rows) {
    const p = r.payload as
      | { phase?: RtpPhase; active?: boolean; ceiling_kind?: string; reason?: string }
      | undefined;
    if (r.topic_id === "rtp.phase_advanced" && p?.phase) {
      phase = p.phase;
      phaseSource = r.event_id;
    }
    if (r.topic_id === "rtp.restriction_set") {
      restrictions.push({
        active: !!p?.active,
        ceilingKind: p?.ceiling_kind ?? null,
        reason: p?.reason ?? null,
        sourceEventId: r.event_id,
      });
    }
    if (r.topic_id === "rtp.clinician_note") clinicianNoteSource = r.event_id;
  }
  return { phase, phaseSource, restrictions, clinicianNoteSource };
});

export function rtpState(rows: Parameters<typeof buildRtpState>[0], scope: Parameters<typeof buildRtpState>[1]) {
  return buildRtpState(rows, scope, PREFIXES);
}
