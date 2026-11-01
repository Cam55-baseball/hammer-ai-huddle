/**
 * Owner drills filed under Hammers Today (skill, warm-up, defense) and the
 * defensive library.
 *
 * Owner-approved narrow addition (2026-10-01): plan generation merges switched-on,
 * fully-eligible owner drills into the block they were filed under — nothing else.
 * The merge never changes HOW MANY drills a block prescribes: it swaps one slot,
 * rotating through eligible drills by day so none monopolises the block and a
 * newly switched-on drill is served within (pool size) days.
 */
import type { OwnerDrillRow } from "./ownerDrills";
import { ownerConditioningProblems } from "../../../supabase/functions/_shared/wic/conditioning/ownerConditioning";

export type PlanSlot = "hammers_today:skill" | "hammers_today:warmup" | "hammers_today:defense" | "defensive_library"
  | "hammers_today:baserunning" | "hammers_today:bunting" | "hammers_today:mind" | "hammers_today:conditioning"
  | "hammers_today:tissue_care" | "hammers_today:focus_routine";
export type SkillBlock = "hitting" | "throwing";

export const PLAN_SLOTS: PlanSlot[] = ["hammers_today:skill", "hammers_today:warmup", "hammers_today:defense", "defensive_library",
  "hammers_today:baserunning", "hammers_today:bunting", "hammers_today:mind", "hammers_today:conditioning",
  "hammers_today:tissue_care", "hammers_today:focus_routine"];

let rows: OwnerDrillRow[] = [];
let loading: Promise<void> | null = null;

export function setOwnerPlanDrills(next: OwnerDrillRow[]) {
  rows = next;
}

/** Fire-and-forget load; plan generation stays synchronous and simply uses what's loaded. */
export function loadOwnerPlanDrills(): Promise<void> {
  if (!loading) {
    loading = (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await (supabase as any).from("owner_drills").select("*").eq("active", true);
        rows = (data ?? []) as OwnerDrillRow[];
        // Owner Nov 1: tissue-care matching settings (defaults when unset or unreadable).
        const cfg = await (supabase as any).from("app_settings").select("setting_value").eq("setting_key", "tissue_care_matching").maybeSingle();
        const [{ setTissueCareConfig }, { careConfigFrom }] = await Promise.all([import("./tissueCarePlan"), import("../../../supabase/functions/_shared/tissueCare/matching")]);
        setTissueCareConfig(careConfigFrom(cfg.error ? null : cfg.data?.setting_value));
      } catch {
        /* built-in plan stays */
      }
    })();
  }
  return loading;
}

/** Which skill block(s) a drill declares, from the analyses ticked on it. */
export function skillBlocksOf(r: Pick<OwnerDrillRow, "placements">): SkillBlock[] {
  const out = new Set<SkillBlock>();
  for (const p of r.placements) {
    if (/^analysis:[a-z]+:hitting$/.test(p)) out.add("hitting");
    if (/^analysis:[a-z]+:(throwing|pitching)$/.test(p)) out.add("throwing");
    if (/^hammers_today:(hitting|bat_speed_weighted|bat_speed_overspeed)$/.test(p)) out.add("hitting");
    if (/^hammers_today:(throwing|pitching)$/.test(p)) out.add("throwing");
  }
  return [...out];
}

const clean = (s: string | null | undefined) => (s ?? "").trim();

/**
 * Fields a drill must carry before it may be served in a plan placement.
 * Returns plain-language gaps; empty = complete.
 */
export function missingForPlacement(r: Omit<OwnerDrillRow, "created_at" | "id">, slot: PlanSlot): string[] {
  const miss: string[] = [];
  if (!clean(r.name)) miss.push("a name");
  if (!clean(r.dosage)) miss.push("a dose");
  if (!clean(r.cue)) miss.push("a cue");
  if (r.sports.length === 0) miss.push("a sport");
  if (slot === "hammers_today:skill") {
    if (skillBlocksOf(r).length === 0) miss.push("which skill (tick a hitting, throwing or pitching analysis)");
    if (r.steps.filter((s) => clean(s)).length === 0 && !clean(r.setup)) miss.push("set-up or steps");
  }
  if (slot === "hammers_today:bunting") {
    if (!["squeeze", "sac_3b", "sac_1b", "drag", "push", "hit"].includes(clean(r.bunt_type))) miss.push("a bunt type");
    if (!["R", "L"].includes(clean(r.bunt_side))) miss.push("a bunt side");
  }
  if (slot === "hammers_today:conditioning") miss.push(...ownerConditioningProblems(r));
  if (slot === "hammers_today:mind" && r.equipment.length > 0) miss.push("no equipment (Mind items are non-physical)");
  if (slot === "hammers_today:tissue_care" || slot === "hammers_today:focus_routine") miss.push(...careMeasureProblems(r));
  if (slot === "hammers_today:focus_routine" && r.equipment.length > 0) miss.push("no equipment (focus routines are non-physical)");
  return miss;
}

export const CARE_MEASURES = [["time", "Time"], ["rounds", "Rounds"], ["check_off", "Check-off"]] as const;

/** Owner Nov 1: tissue-care / focus-routine activities need a measure (time, rounds or check-off). */
export function careMeasureProblems(r: Pick<OwnerDrillRow, "care_measure" | "work_seconds" | "rounds">): string[] {
  const m = r.care_measure ?? null;
  if (m === "time") return (r.work_seconds ?? 0) > 0 ? [] : ["a time (minutes)"];
  if (m === "rounds") return (r.rounds ?? 0) > 0 ? [] : ["a number of rounds"];
  if (m === "check_off") return [];
  return ["a measure (time, rounds or check-off)"];
}

/** Plain dose line for a tissue-care / focus-routine activity, from its measure. */
export function careDosage(r: Pick<OwnerDrillRow, "care_measure" | "work_seconds" | "rounds" | "dosage">): string {
  const base = r.care_measure === "time" ? `${Math.max(1, Math.round((r.work_seconds ?? 0) / 60))} min`
    : r.care_measure === "rounds" ? `${r.rounds} rounds` : "Check off when done";
  return [base, (r.dosage ?? "").trim()].filter(Boolean).join(" · ");
}

/** Owner tissue-care or focus-routine activity for this player (sport, equipment, Programs), rotated by day. */
export function ownerCareDrill(slot: "hammers_today:tissue_care" | "hammers_today:focus_routine", ctx: { sport: string; modules?: readonly string[] | null; owned?: ReadonlySet<string> | null; day?: Date }): OwnerDrillRow | null {
  const pool = ownerDrillsForSlot([slot], { sport: ctx.sport, owned: slot === "hammers_today:focus_routine" ? null : ctx.owned ?? null })
    .filter((r) => { const p = r.conditioning_programs ?? []; return p.length === 0 || p.some((x) => (ctx.modules ?? []).includes(`${ctx.sport}_${x}`)); });
  return rotate(pool, ctx.day ?? new Date());
}

/** Builder summary: per filed plan placement, whether it competes or what it still needs. */
export function planReadiness(r: Omit<OwnerDrillRow, "created_at" | "id">): Array<{ slot: PlanSlot; missing: string[] }> {
  return PLAN_SLOTS.filter((s) => filedSlots(r).includes(s)).map((slot) => ({ slot, missing: missingForPlacement(r, slot) }));
}

export interface MergeContext {
  sport: string;
  /** Athlete's declared equipment tokens. Unknown/empty → only equipment-free drills qualify. */
  owned?: ReadonlySet<string> | null;
  /** Required for the skill slot: which skill block is being built. */
  skill?: SkillBlock;
  day?: Date;
}

const norm = (s: string) => s.trim().toLowerCase();

/** Oct 28 engine category tags map onto the existing legal plan slots (no new slots, no new dose). */
const TAG_SLOT: Record<string, PlanSlot> = {
  "hammers_today:hitting": "hammers_today:skill",
  "hammers_today:bat_speed_weighted": "hammers_today:skill",
  "hammers_today:bat_speed_overspeed": "hammers_today:skill",
  "hammers_today:throwing": "hammers_today:skill",
  "hammers_today:pitching": "hammers_today:skill",
  "hammers_today:defense_low_taxing": "hammers_today:defense",
  "hammers_today:baserunning": "hammers_today:baserunning",
  "hammers_today:bunting": "hammers_today:bunting",
  "hammers_today:mind": "hammers_today:mind",
};
export function filedSlots(r: Pick<OwnerDrillRow, "placements">): PlanSlot[] {
  const out = new Set<PlanSlot>();
  for (const p of r.placements) {
    if ((PLAN_SLOTS as string[]).includes(p)) out.add(p as PlanSlot);
    if (TAG_SLOT[p]) out.add(TAG_SLOT[p]);
  }
  return [...out];
}

/** Every condition the drill declares must hold. */
export function eligibleFor(r: OwnerDrillRow, slots: PlanSlot[], ctx: MergeContext): boolean {
  if (!r.active) return false;
  const filed = filedSlots(r);
  const slot = slots.find((s) => filed.includes(s));
  if (!slot) return false;
  if (missingForPlacement(r, slot).length > 0) return false;
  if (!r.sports.includes(ctx.sport)) return false;
  if (slot === "hammers_today:skill" && (!ctx.skill || !skillBlocksOf(r).includes(ctx.skill))) return false;
  const need = r.equipment.map(norm).filter(Boolean);
  if (need.length > 0) {
    const owned = new Set([...(ctx.owned ?? [])].map(norm));
    if (!need.every((e) => owned.has(e))) return false;
  }
  return true;
}

export function ownerDrillsForSlot(slots: PlanSlot[], ctx: MergeContext): OwnerDrillRow[] {
  return rows.filter((r) => eligibleFor(r, slots, ctx));
}

interface StepLike { name: string; dosage?: string; cue?: string; stage?: string; prescriptionOrigin?: string }

/** Swap one drill (the last) for today's owner drill. Count unchanged. */
export function mergeOwnerSlotDrills<T extends StepLike>(drills: T[], slots: PlanSlot[], ctxOrSport: MergeContext | string, day = new Date()): T[] {
  const ctx: MergeContext = typeof ctxOrSport === "string" ? { sport: ctxOrSport, day } : ctxOrSport;
  // Pitcher-tagged drills are placed only by ownerPitchDrill on their tagged day type.
  const pool = ownerDrillsForSlot(slots, ctx).filter((r) => !r.pitch_mound_type).sort((a, b) => a.id.localeCompare(b.id));
  if (pool.length === 0 || drills.length === 0) return drills;
  // Catalog tags cannot replace preparation, live execution, logging, or
  // another owner's already chosen slot. Legacy unstaged slots remain eligible.
  // Catalog scenario identities (executionKind) are never renamed away.
  let target = -1;
  for (let i = drills.length - 1; i >= 0; i--) {
    const drill = drills[i] as T & { executionKind?: string };
    if (drill.prescriptionOrigin !== 'owner' && !drill.executionKind && (drill.stage === undefined || drill.stage === 'drills')) { target = i; break; }
  }
  if (target < 0) return drills;
  const dayIndex = Math.floor((ctx.day ?? day).getTime() / 86_400_000);
  const pick = pool[dayIndex % pool.length];
  // Replace the slot wholesale so no built-in set-up, guide or slug leaks onto his drill.
  const owned = {
    name: pick.name,
    dosage: pick.dosage ?? "",
    cue: pick.cue ?? "",
    prescriptionOrigin: "owner",
    ownerDrillId: pick.id,
    routineRole: pick.routine_role ?? null,
    skillArea: pick.skill_area ?? null,
    batSpeedKind: pick.bat_speed_kind ?? null,
    videoUrl: pick.video_url ?? null,
    libraryVideoId: pick.library_video_id ?? null,
    ...(clean(pick.setup) ? { setup: pick.setup } : {}),
    ...(pick.equipment.length ? { equipmentNote: pick.equipment.join(", ") } : {}),
  } as unknown as T;
  return drills.map((drill, index) => index === target ? owned : drill);
}

const rotate = <R extends { id: string }>(pool: R[], day: Date): R | null => {
  if (!pool.length) return null;
  const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id));
  return sorted[Math.floor(day.getTime() / 86_400_000) % sorted.length];
};

/** Owner bunting drill for EXACTLY this side and type (explicit owner tags), or null. Dose stays the plan's. */
export function ownerBuntDrill(ctx: { sport: string; side: "R" | "L"; type: string; owned?: ReadonlySet<string> | null; day?: Date }): OwnerDrillRow | null {
  return rotate(ownerDrillsForSlot(["hammers_today:bunting"], ctx)
    .filter((r) => r.bunt_side === ctx.side && r.bunt_type === ctx.type), ctx.day ?? new Date());
}

/** Owner Mind item (non-physical, no equipment) for the sport, rotated by day, or null. */
export function ownerMindDrill(ctx: { sport: string; day?: Date }): OwnerDrillRow | null {
  return rotate(ownerDrillsForSlot(["hammers_today:mind"], { sport: ctx.sport, owned: null }), ctx.day ?? new Date());
}

/** Owner Oct 31: which pitcher tags fit each pitching day type, per sport. */
export const PITCH_DAY_TAGS: Record<string, { baseball: string[]; softball: string[]; purpose?: string }> = {
  side: { baseball: ["shortbox"], softball: ["shortbox_circle"] },
  touch: { baseball: ["light_mound"], softball: ["circle"] },
  bullpen: { baseball: ["full_bullpen", "light_mound"], softball: ["circle"] },
  available: { baseball: ["light_mound"], softball: ["circle"] },
  flush: { baseball: ["flat_ground"], softball: ["flat_ground"], purpose: "throwing_mobility" },
};
/** Owner/library pitcher drill picked by its tags for this pitching day, sport and role, or null. */
export function ownerPitchDrill(ctx: { sport: string; dayType: string; role?: string | null; owned?: ReadonlySet<string> | null; day?: Date }): OwnerDrillRow | null {
  const want = PITCH_DAY_TAGS[ctx.dayType];
  if (!want) return null;
  const types = ctx.sport === "softball" ? want.softball : want.baseball;
  const pool = ownerDrillsForSlot(["hammers_today:skill"], { sport: ctx.sport, skill: "throwing", owned: ctx.owned ?? null } as MergeContext)
    .filter((r) => r.pitch_mound_type && types.includes(r.pitch_mound_type))
    .filter((r) => !want.purpose || (r.pitch_purposes ?? []).includes(want.purpose))
    .filter((r) => !ctx.role || !(r.pitch_role_fit ?? []).length || (r.pitch_role_fit ?? []).includes(ctx.role));
  return rotate(pool, ctx.day ?? new Date());
}

if (typeof window !== "undefined" && import.meta.env.MODE !== "test") void loadOwnerPlanDrills();
