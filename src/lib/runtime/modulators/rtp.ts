/**
 * RTP (return-to-play) modulator.
 *
 * Restrictions and active reconstruction phases hard-cap session kind.
 * Clinician notes are first-class lineage sources. No auto-advance: phase
 * progression requires explicit `rtp.phase_advanced` events.
 */
import { type Modulator, pickLatest, pickAll, PASS_THROUGH } from "./types";
import type { SessionKind } from "@/lib/runtime/prescription";

type RtpPhase = "acute" | "subacute" | "reintroduction" | "return" | "cleared";

interface PhasePayload {
  phase?: RtpPhase;
  domain?: "throw" | "sprint" | "lift" | "general";
}
interface RestrictionPayload {
  active?: boolean;
  ceiling_kind?: SessionKind;
  reason?: string;
}

const PHASE_CEILING: Record<RtpPhase, SessionKind | null> = {
  acute: "recovery",
  subacute: "recovery",
  reintroduction: "hybrid",
  return: "throw",
  cleared: null,
};

export const rtpModulator: Modulator = (ctx) => {
  const restrictionRows = pickAll(ctx.rows, "rtp.restriction_set");
  const activeRestriction = restrictionRows.find(
    (r) => (r.payload as RestrictionPayload | undefined)?.active,
  );
  const phaseRow = pickLatest(ctx.rows, "rtp.phase_advanced");
  const clinicianNoteRow = pickLatest(ctx.rows, "rtp.clinician_note");

  if (!activeRestriction && !phaseRow) return { ...PASS_THROUGH, domain: "rtp" };

  const sources = [
    activeRestriction?.event_id,
    phaseRow?.event_id,
    clinicianNoteRow?.event_id,
  ].filter((x): x is string => !!x);

  const restrictionPayload = activeRestriction?.payload as
    | RestrictionPayload
    | undefined;
  const phasePayload = phaseRow?.payload as PhasePayload | undefined;

  // Restriction ceiling wins when tighter than phase ceiling.
  const restrictionCeiling = restrictionPayload?.ceiling_kind ?? null;
  const phaseCeiling = phasePayload?.phase
    ? PHASE_CEILING[phasePayload.phase]
    : null;

  const notes: string[] = [];
  if (restrictionPayload?.reason) {
    notes.push(`RTP: restriction — ${restrictionPayload.reason}`);
  } else if (activeRestriction) {
    notes.push("RTP: active restriction on ledger.");
  }
  if (phasePayload?.phase) {
    notes.push(`RTP: phase ${phasePayload.phase}.`);
  }

  // Pick the tightest of the two ceilings (recovery < hybrid < throw etc.)
  const rank: Record<SessionKind, number> = {
    rest: 0, recovery: 1, hybrid: 2, throw: 3, sprint: 4, lift: 5,
  };
  let ceiling: SessionKind | null = null;
  for (const c of [restrictionCeiling, phaseCeiling]) {
    if (c == null) continue;
    if (ceiling == null || rank[c] < rank[ceiling]) ceiling = c;
  }

  return {
    domain: "rtp",
    ceilingKind: ceiling,
    notes,
    sources,
    confidenceCeiling: null,
  };
};
