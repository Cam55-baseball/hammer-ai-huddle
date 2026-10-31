// Owner Oct 31 Part B wiring for the app's daily builder (server mirrors in wk-generate-daily).
// Organizes existing work only: tag-picked pitcher drills replace one existing pitching drill
// and carry their real pitch count, so finalArmGuard still decides what fits.
import { ownerPitchDrill } from "@/lib/prescription/ownerPlanDrills";
import { reliefSets, isLowerBodyLift, type PitchRole } from "../../../../supabase/functions/_shared/wic/pitching/roleCycle";
import type { ThrowEvent } from "../../../../supabase/functions/_shared/wic/phases/armLedger";

type Drill = { name: string; dosage?: string; stage?: string; armCard?: string; armEvent?: ThrowEvent; prescriptionOrigin?: string; [k: string]: unknown };

const INTENT: Record<string, ThrowEvent["intent"]> = { catch_light: "low", medium: "moderate", full: "high" };

/** Swap the last ordinary pitching drill for the owner/library drill tagged for today's day type. */
export function withTaggedPitchDrill<D extends Drill>(drills: D[], ctx: { sport: "baseball" | "softball"; dayType: string; role?: PitchRole | null; owned?: ReadonlySet<string> | null; day: Date }): D[] {
  const pick = ownerPitchDrill({ sport: ctx.sport, dayType: ctx.dayType, role: ctx.role ?? null, owned: ctx.owned ?? null, day: ctx.day });
  if (!pick) return drills;
  let target = -1;
  for (let i = drills.length - 1; i >= 0; i--) { const d = drills[i]; if (d.prescriptionOrigin !== "owner" && d.stage !== "prep" && d.stage !== "log") { target = i; break; } }
  const count = pick.pitch_count ?? 0;
  const row = {
    name: pick.name, dosage: pick.dosage ?? "", cue: pick.cue ?? "", setup: pick.setup ?? undefined,
    stage: "drills", armCard: "pitching", prescriptionOrigin: "owner", ownerDrillId: pick.id,
    pitchTags: { moundType: pick.pitch_mound_type, feet: pick.pitch_distance_feet, intensity: pick.pitch_intensity, purposes: pick.pitch_purposes ?? [] },
    ...(count > 0 ? { armEvent: { kind: "pitch", count, intent: INTENT[pick.pitch_intensity ?? ""] ?? "moderate", estimated: false } as ThrowEvent } : {}),
  } as unknown as D;
  if (target < 0) return [...drills, row];
  return drills.map((d, i) => (i === target ? row : d));
}

const SETS = /^(\d+)\s*[x×]\s*(.+)$/i;
/** Same weight, fewer sets for bullpen arms/closers; no lower-body lift the day before a start. */
export function applyPitcherLiftRule<D extends Drill>(drills: D[], ctx: { role?: PitchRole | null; startsTomorrow?: boolean }): { drills: D[]; because: string[] } {
  const because: string[] = [];
  let out = drills;
  if (ctx.startsTomorrow) {
    const kept = out.filter((d) => !isLowerBodyLift(d.name));
    if (kept.length !== out.length) because.push("No lower-body lift the day before a start.");
    out = kept;
  }
  if (ctx.role && ctx.role !== "starter") {
    let changed = false;
    out = out.map((d) => {
      const m = SETS.exec(d.dosage ?? "");
      if (!m) return d;
      const to = reliefSets(Number(m[1]), ctx.role!);
      if (to === Number(m[1])) return d;
      changed = true;
      return { ...d, dosage: `${to} x ${m[2]}` };
    });
    if (changed) because.push("Bullpen arms and closers keep the same weight with fewer sets.");
  }
  return { drills: out, because };
}
