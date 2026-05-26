/**
 * Cycle modulator — menstrual-cycle aware modulation.
 *
 * Constitutional contract:
 *  - Athlete-private by default; coach/org/external viewers see nothing
 *    (opaque ceiling only; no payload disclosure).
 *  - No phase prediction. We only modulate from explicitly logged phases.
 *  - No black-box hormonal scoring. Output is a bounded ceiling + note.
 *  - Survivability supersedes optimism: high-symptom days cap at recovery.
 */
import { type Modulator, PASS_THROUGH, pickLatest } from "./types";

type Phase = "menstrual" | "follicular" | "ovulatory" | "luteal" | "unknown";
type Severity = "none" | "mild" | "moderate" | "severe";

interface PhasePayload {
  phase?: Phase;
  symptom_severity?: Severity;
  confidence?: number;
}

export const cycleModulator: Modulator = (ctx) => {
  const phaseRow = pickLatest(ctx.rows, "cycle.phase_logged");
  const symptomRow = pickLatest(ctx.rows, "cycle.symptom_logged");
  if (!phaseRow && !symptomRow) return { ...PASS_THROUGH, domain: "cycle" };

  // Privacy: non-self viewers receive no information from the cycle modulator.
  if (ctx.viewerScope !== "self") {
    return { ...PASS_THROUGH, domain: "cycle" };
  }

  const phase = (phaseRow?.payload as PhasePayload | undefined)?.phase;
  const severity = (symptomRow?.payload as PhasePayload | undefined)
    ?.symptom_severity;
  const sources = [phaseRow?.event_id, symptomRow?.event_id].filter(
    (x): x is string => !!x,
  );
  const confidenceCeiling =
    (phaseRow?.payload as PhasePayload | undefined)?.confidence ?? null;

  if (severity === "severe") {
    return {
      domain: "cycle",
      ceilingKind: "recovery",
      notes: ["Cycle: severe symptoms logged — recovery ceiling."],
      sources,
      confidenceCeiling,
    };
  }
  if (severity === "moderate" || phase === "menstrual") {
    return {
      domain: "cycle",
      ceilingKind: "hybrid",
      notes: ["Cycle: hybrid ceiling based on logged phase/symptoms."],
      sources,
      confidenceCeiling,
    };
  }
  // Mild/follicular/ovulatory/luteal without severe symptoms → no ceiling change.
  return {
    domain: "cycle",
    ceilingKind: null,
    notes: phase ? [`Cycle: logged phase ${phase}.`] : [],
    sources,
    confidenceCeiling,
  };
};
