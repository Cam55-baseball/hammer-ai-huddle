/**
 * Owner Nov 1 (round 4 + round 5 defaults): owner Tissue care activities replace built-in
 * tissue-care movements like-for-like (body area + movement type) wherever tissue care,
 * recovery, warm-up mobility and cool-down care are prescribed. Count and time budget stay
 * the built-in's. No match = the built-in stays (nothing irrelevant is forced in).
 * Pure / bundle-safe (no browser imports).
 */
import { ownerDrillsForSlot, careDosage } from "./ownerPlanDrills";
import type { OwnerDrillRow } from "./ownerDrills";
import { WARMUP_LIBRARY } from "@/lib/hammer/prescription/warmupLibrary";
import {
  builtinCareTags, careAreaOfRegion, pickCareForDay, DEFAULT_CARE_CONFIG,
  CARE_AREAS, CARE_TYPES, CARE_CONTEXTS,
  type CareArea, type CareContext, type CareItem, type CareMatchConfig, type CareTarget, type CareType,
} from "../../../supabase/functions/_shared/tissueCare/matching";

let config: CareMatchConfig = DEFAULT_CARE_CONFIG;
export function setTissueCareConfig(next: CareMatchConfig) { config = next; }
export function tissueCareConfig(): CareMatchConfig { return config; }

const pick = <T extends string>(xs: readonly unknown[] | null | undefined, allowed: readonly T[]): T[] =>
  [...new Set((xs ?? []).filter((x): x is T => allowed.includes(x as T)))];

/** True when an owner row carries the new area/type tags. Legacy rows keep their old behavior. */
export function hasCareTags(r: Pick<OwnerDrillRow, "care_areas" | "care_types">): boolean {
  return pick(r.care_areas, CARE_AREAS).length > 0 && pick(r.care_types, CARE_TYPES).length > 0;
}

/** Owner row → matcher item. Legacy untagged rows only stand in for the Recovery "Mobility + foam roll". */
export function ownerCareItem(r: OwnerDrillRow): CareItem {
  if (!hasCareTags(r)) return { id: r.id, name: r.name, areas: ["full_body"], types: ["foam_roll", "mobility"], contexts: ["recovery", "rest_day"], sports: r.sports, origin: "owner", intensity: "light" };
  return {
    id: r.id, name: r.name, origin: "owner", sports: r.sports,
    areas: pick(r.care_areas, CARE_AREAS), types: pick(r.care_types, CARE_TYPES),
    contexts: pick(r.care_contexts, CARE_CONTEXTS), roles: (r.care_roles ?? []).filter(Boolean),
    intensity: r.care_intensity === "moderate" ? "moderate" : r.care_intensity === "light" ? "light" : null,
  };
}

interface Row { name: string; dosage?: string; slug?: string; setup?: string; cue?: string; stopIf?: string; stage?: string; prescriptionOrigin?: string; executionKind?: string; armCard?: string }
interface Block { modality: string; status: string; drills: Row[]; because?: string[] }

export interface CarePlanCtx {
  sport: string;
  modules?: readonly string[] | null;
  owned?: ReadonlySet<string> | null;
  day: Date;
  role?: string | null;
  injuredRegions?: readonly string[];
  lightOnly?: boolean;
  restDay?: boolean;
}

function warmupContext(blocks: readonly Block[]): CareContext {
  const ready = (m: string[]) => blocks.some((b) => m.includes(b.modality) && b.status === "ready");
  if (ready(["throwing", "pitching"])) return "pre_throwing";
  if (ready(["hitting"])) return "pre_hitting";
  if (ready(["strength"])) return "pre_lift";
  if (ready(["speed", "conditioning"])) return "pre_speed";
  return "warm_up";
}

/** Context of a care row inside a block, or null when the row is not a tissue-care slot. */
function rowContext(b: Block, d: Row, warm: CareContext, rest: boolean): CareContext | null {
  if (b.modality === "warmup") return warm;
  if (b.modality === "recovery") return rest ? "rest_day" : /cool-down/i.test(d.name) ? "cool_down" : "recovery";
  if (/cool-?down|finisher/i.test(d.name)) return "cool_down";
  return null;
}

function rotated<T extends { id: string }>(xs: T[], day: Date): T[] {
  const s = [...xs].sort((a, b) => a.id.localeCompare(b.id));
  if (!s.length) return s;
  const k = Math.floor(day.getTime() / 86_400_000) % s.length;
  return [...s.slice(k), ...s.slice(0, k)];
}

/** Eligible owner tissue-care pool for this player (sport, gear, Programs). */
export function ownerCarePool(ctx: CarePlanCtx): OwnerDrillRow[] {
  return ownerDrillsForSlot(["hammers_today:tissue_care"], { sport: ctx.sport, owned: ctx.owned ?? null })
    .filter((r) => { const p = r.conditioning_programs ?? []; return p.length === 0 || p.some((x) => (ctx.modules ?? []).includes(`${ctx.sport}_${x}`)); });
}

export function applyTissueCareMatching<B extends Block>(blocks: B[], ctx: CarePlanCtx): B[] {
  const rows = ownerCarePool(ctx);
  if (!rows.length) return blocks;
  const byId = new Map(rows.map((r) => [r.id, r]));
  const pool = rotated(rows, ctx.day).map(ownerCareItem);
  const warm = warmupContext(blocks);
  const injured = [...new Set((ctx.injuredRegions ?? []).map(careAreaOfRegion).filter((a): a is CareArea => !!a))];
  const slots: Array<{ bi: number; di: number; target: CareTarget }> = [];
  blocks.forEach((b, bi) => {
    if (b.status !== "ready") return;
    b.drills.forEach((d, di) => {
      if (d.prescriptionOrigin === "owner" || d.executionKind || d.armCard) return;
      const context = rowContext(b, d, warm, !!ctx.restDay);
      if (!context) return;
      const lib = d.slug ? WARMUP_LIBRARY.find((w) => w.slug === d.slug) : undefined;
      if (lib?.role === "arm_care") return;
      const tags = builtinCareTags({ name: d.name, role: lib?.role ?? null, setup: d.setup ?? null, dosage: d.dosage ?? null });
      if (!tags) return;
      slots.push({ bi, di, target: { areas: tags.areas, type: tags.types[0] as CareType, context, sport: ctx.sport, role: ctx.role ?? null, injuredAreas: injured, lightOnly: !!ctx.lightOnly } });
    });
  });
  const already = blocks.flatMap((b) => b.drills.map((d) => (d as { ownerDrillId?: string }).ownerDrillId).filter((x): x is string => !!x));
  const picks = pickCareForDay(slots.map((s) => s.target), pool, config, already);
  const out = blocks.map((b) => ({ ...b, drills: [...b.drills] }));
  const notes = new Map<number, string[]>();
  picks.forEach((m, i) => {
    if (!m) return;
    const { bi, di } = slots[i];
    const r = byId.get(m.item.id)!;
    const src = out[bi].drills[di];
    const legacy = !hasCareTags(r);
    // Legacy untagged rows keep their old Recovery-slot behavior exactly (only "Mobility + foam roll").
    if (legacy && !(out[bi].modality === "recovery" && src.name === "Mobility + foam roll")) return;
    out[bi].drills[di] = {
      name: r.name, dosage: legacy ? careDosage(r) : src.dosage ?? careDosage(r), cue: r.cue ?? "",
      ...(src.stage ? { stage: src.stage } : {}),
      prescriptionOrigin: "owner", ownerDrillId: r.id, careMeasure: r.care_measure ?? null,
      ...(r.setup?.trim() ? { setup: r.setup } : {}), ...(r.equipment.length ? { equipmentNote: r.equipment.join(", ") } : {}),
      stopIf: src.stopIf, ...(legacy ? {} : { careMatch: { tier: m.tier, replaced: src.name } }),
    } as unknown as Row;
    if (!legacy) notes.set(bi, [...(notes.get(bi) ?? []), m.because]);
  });
  return out.map((b, bi) => (notes.has(bi) ? { ...b, because: [...(b.because ?? []), ...notes.get(bi)!.slice(0, 2)] } : b)) as B[];
}
