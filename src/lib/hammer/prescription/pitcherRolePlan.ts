// Owner Oct 31 Part B wiring for the app's daily builder (server mirrors in wk-generate-daily).
// Organizes existing work only: tag-picked pitcher drills replace one existing pitching drill
// and carry their real pitch count, so finalArmGuard still decides what fits.
import { ownerPitchDrill } from "@/lib/prescription/ownerPlanDrills";
import { reliefSets, isLowerBodyLift, cycleDay, commandStruggle, commandExtraDays, MOUND_COMMAND_MAX_PER_WEEK, type PitchRole, type CommandEvidence } from "../../../../supabase/functions/_shared/wic/pitching/roleCycle";
import type { ThrowEvent } from "../../../../supabase/functions/_shared/wic/phases/armLedger";

type Drill = { name: string; dosage?: string; stage?: string; armCard?: string; armEvent?: ThrowEvent; prescriptionOrigin?: string; [k: string]: unknown };

const INTENT: Record<string, ThrowEvent["intent"]> = { catch_light: "low", medium: "moderate", full: "high" };

/** Swap the last ordinary pitching drill for the owner/library drill tagged for today's day type. */
export function withTaggedPitchDrill<D extends Drill>(drills: D[], ctx: { sport: "baseball" | "softball"; dayType: string; role?: PitchRole | null; owned?: ReadonlySet<string> | null; day: Date }): D[] {
  const pick = ownerPitchDrill({ sport: ctx.sport, dayType: ctx.dayType, role: ctx.role ?? null, owned: ctx.owned ?? null, day: ctx.day });
  if (!pick) return drills;
  let target = -1;
  for (let i = drills.length - 1; i >= 0; i--) { const d = drills[i]; if (d.prescriptionOrigin !== "owner" && d.armEvent && (d.stage === undefined || d.stage === "drills")) { target = i; break; } }
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

/** Owner Oct 31: extra light command day for a pitcher whose DATA shows command trouble. */
export function commandDayPlan(ctx: { sport: "baseball" | "softball"; role?: PitchRole | null; facts?: { hasSchedule?: boolean; thrownDates: string[]; plannedStartDates: string[]; limitPitching?: boolean } | null; evidence?: CommandEvidence | null; day: Date }): { add: boolean; because: string[] } {
  const judge = commandStruggle(ctx.evidence);
  if (!judge.struggling || !ctx.role || !ctx.facts?.hasSchedule) return { add: false, because: [] };
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const monday = new Date(ctx.day); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, k) => { const d = new Date(monday); d.setDate(monday.getDate() + k); const date = iso(d); // Planned starts earlier in the week are treated as pitched (the week is planned ahead); Sunday stays rest as in pitchingDay.
    const outingDates = [...ctx.facts!.thrownDates, ...ctx.facts!.plannedStartDates.filter((p) => p < date)];
    return { date, day: d.getDay() === 0 ? "rest" as const : cycleDay({ sport: ctx.sport, role: ctx.role!, date, outingDates, plannedStarts: ctx.facts!.plannedStartDates, gameDates: [] }) }; });
  const plan = commandExtraDays({ sport: ctx.sport, week, struggling: true, limitPitching: ctx.facts.limitPitching });
  const today = iso(ctx.day);
  const place = ctx.sport === "softball" ? "circle" : "mound";
  if (plan.extra.includes(today)) return { add: true, because: [`Extra light ${place} day for command (up to ${MOUND_COMMAND_MAX_PER_WEEK} a week). Why: ${judge.reasons.join(" ")}`] };
  const blocked = plan.blocked.find((b) => b.date === today);
  return { add: false, because: blocked ? [`No extra command ${place} work today because ${blocked.reason}.`] : [] };
}

/** Append one light shortbox drill (catch-light) for a command day; arm limits still decide. */
export function withCommandDrill<D extends Drill>(drills: D[], ctx: { sport: "baseball" | "softball"; role?: PitchRole | null; day: Date }): { drills: D[]; id: string | null } {
  const pick = ownerPitchDrill({ sport: ctx.sport, dayType: "side", role: ctx.role ?? null, day: ctx.day });
  if (!pick || drills.some((d) => (d as { ownerDrillId?: string }).ownerDrillId === pick.id)) return { drills, id: null };
  const count = pick.pitch_count ?? 0;
  const row = {
    name: pick.name, dosage: pick.dosage ?? "", cue: pick.cue ?? "", setup: pick.setup ?? undefined,
    stage: "drills", armCard: "pitching", prescriptionOrigin: "owner", ownerDrillId: pick.id, commandDay: true,
    pitchTags: { moundType: pick.pitch_mound_type, feet: pick.pitch_distance_feet, intensity: "catch_light", purposes: pick.pitch_purposes ?? [] },
    ...(count > 0 ? { armEvent: { kind: "pitch", count, intent: "low", estimated: false } as ThrowEvent } : {}),
  } as unknown as D;
  return { drills: [...drills, row], id: pick.id };
}
