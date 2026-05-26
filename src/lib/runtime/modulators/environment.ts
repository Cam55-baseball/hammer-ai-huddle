/**
 * Environment modulator — travel, sleep disruption, climate, density.
 *
 * Each component contributes bounded stress; compound stress tightens
 * ceiling. Lineage cites every contributing event.
 */
import { type Modulator, PASS_THROUGH, pickLatest, pickAll } from "./types";

interface EnvPayload {
  hours?: number;
  severity?: "low" | "moderate" | "high";
  delta_tz?: number;
}

export const environmentModulator: Modulator = (ctx) => {
  // Determinism: derive "now" from newest event in scope, not wall clock.
  const all = pickAll(ctx.rows, "env.");
  const newestTs = all[0]?.occurred_at;
  const nowMs = newestTs ? new Date(newestTs).getTime() : 0;
  const recent = all.filter((r) => {
    const age = (nowMs - new Date(r.occurred_at).getTime()) / (1000 * 60 * 60);
    return age <= 72; // last 3 days relative to most recent env event
  });
  if (recent.length === 0) return { ...PASS_THROUGH, domain: "environment" };

  let stress = 0;
  const notes: string[] = [];
  const sources: string[] = [];
  for (const r of recent) {
    const p = r.payload as EnvPayload | undefined;
    const sev = p?.severity;
    const w = sev === "high" ? 3 : sev === "moderate" ? 2 : 1;
    stress += w;
    sources.push(r.event_id);
    if (notes.length < 2) {
      const kind = r.topic_id.replace("env.", "");
      notes.push(`Env: ${kind} (${sev ?? "logged"}).`);
    }
  }

  if (stress >= 5) {
    return {
      domain: "environment",
      ceilingKind: "recovery",
      notes: [...notes, "Env: compound stress — recovery ceiling."],
      sources,
      confidenceCeiling: null,
    };
  }
  if (stress >= 3) {
    return {
      domain: "environment",
      ceilingKind: "hybrid",
      notes: [...notes, "Env: elevated stress — hybrid ceiling."],
      sources,
      confidenceCeiling: null,
    };
  }
  return {
    domain: "environment",
    ceilingKind: null,
    notes,
    sources,
    confidenceCeiling: null,
  };
};
