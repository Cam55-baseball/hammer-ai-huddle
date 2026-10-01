/**
 * Owner drill builder + circulation (owner-approved plan 2026-10-01).
 *
 * - `owner_drills` rows either add a new drill or replace a built-in drill
 *   by id (`overrides_drill_id`). Switched-off rows remove the drill.
 * - Circulation: rotate drills that fix the same fault, unseen first,
 *   usage lifts priority slowly but is capped, new drills get a fair start,
 *   pinned always included. Usage is NEVER presented as effectiveness.
 */
import type { EliteDrill, EliteDrillLevel } from "@/data/drills/eliteDrillCatalog";
import type { PrescriptionMatch } from "./matchDrills";

export type Placement = string; // "analysis:<sport>:<hitting|pitching|throwing>" | "hammers_today:<slot>" | "defensive_library"

export interface OwnerDrillRow {
  id: string;
  overrides_drill_id: string | null;
  placements: string[];
  sports: string[];
  name: string;
  fault_keys: string[];
  phase: string | null;
  level: string | null;
  dosage: string | null;
  setup: string | null;
  steps: string[];
  cue: string | null;
  feel: string | null;
  feel_wrong: string | null;
  common_mistake: string | null;
  equipment: string[];
  video_url: string | null;
  active: boolean;
  pinned: boolean;
  created_at: string;
}

export const ANALYSIS_PLACEMENTS: Array<{ id: Placement; label: string }> = [
  { id: "analysis:baseball:hitting", label: "Baseball hitting analysis" },
  { id: "analysis:softball:hitting", label: "Softball hitting analysis" },
  { id: "analysis:baseball:pitching", label: "Baseball pitching analysis" },
  { id: "analysis:softball:pitching", label: "Softball windmill analysis" },
  { id: "analysis:baseball:throwing", label: "Baseball throwing analysis" },
  { id: "analysis:softball:throwing", label: "Softball throwing analysis" },
];
export const OTHER_PLACEMENTS: Array<{ id: Placement; label: string }> = [
  { id: "hammers_today:skill", label: "Hammers Today — skill block" },
  { id: "hammers_today:warmup", label: "Hammers Today — warm-up" },
  { id: "hammers_today:defense", label: "Hammers Today — defense block" },
  { id: "defensive_library", label: "Defensive library" },
];

export interface OwnerDrill extends EliteDrill {
  ownerRowId: string;
  placements: string[];
  pinned: boolean;
  createdAt: string;
}

function analysisTargets(placements: string[]) {
  return placements
    .filter((p) => p.startsWith("analysis:"))
    .map((p) => {
      const [, sport, category] = p.split(":");
      return { sport: sport as EliteDrill["sports"][number], category: category as EliteDrill["category"] };
    });
}

/** One row → one EliteDrill per analysis category it lands in. */
export function rowToDrills(row: OwnerDrillRow): OwnerDrill[] {
  const targets = analysisTargets(row.placements);
  const byCat = new Map<EliteDrill["category"], Set<EliteDrill["sports"][number]>>();
  for (const t of targets) {
    if (!byCat.has(t.category)) byCat.set(t.category, new Set());
    byCat.get(t.category)!.add(t.sport);
  }
  const baseId = row.overrides_drill_id ?? `owner.${row.id}`;
  return [...byCat.entries()].map(([category, sports], i) => ({
    id: i === 0 ? baseId : `${baseId}.${category}`,
    name: row.name,
    category,
    sports: [...sports],
    subSkill: row.phase ?? "",
    level: (row.level as EliteDrillLevel) ?? "feel",
    fixes: "",
    setup: row.setup ?? "",
    steps: row.steps ?? [],
    cues: row.cue ? [row.cue] : [],
    dosage: row.dosage ?? "",
    equipment: row.equipment ?? [],
    violationKeys: row.fault_keys ?? [],
    pieV2Signals: [],
    movementPatterns: [],
    phase: row.phase ?? undefined,
    feel: row.feel ?? undefined,
    feelWrong: row.feel_wrong ?? undefined,
    commonMistake: row.common_mistake ?? undefined,
    source: "Owner drill builder",
    videoUrl: row.video_url,
    ownerReview: "approved",
    ownerRowId: row.id,
    placements: row.placements,
    pinned: row.pinned,
    createdAt: row.created_at,
  }));
}

/** Built-in catalog with owner overrides applied and owner drills added. */
export function mergeCatalog(base: EliteDrill[], rows: OwnerDrillRow[]): EliteDrill[] {
  const overridden = new Map<string, OwnerDrillRow>();
  for (const r of rows) if (r.overrides_drill_id) overridden.set(r.overrides_drill_id, r);
  const out: EliteDrill[] = [];
  for (const d of base) {
    const r = overridden.get(d.id);
    if (!r) { out.push(d); continue; }
    if (!r.active) continue;
    const [replacement] = rowToDrills(r);
    // Keep the built-in category/sports if the owner chose no analysis placement.
    out.push(replacement ?? { ...d, name: r.name, videoUrl: r.video_url });
  }
  for (const r of rows) if (!r.overrides_drill_id && r.active) out.push(...rowToDrills(r));
  return out;
}

export interface CirculationInput {
  /** times this athlete has already been served each drill */
  servedToUser: Record<string, number>;
  /** global usage totals (counts only) */
  usage: Record<string, { completed: number; returned: number }>;
  now?: Date;
}

export const CIRCULATION = {
  unseenBonus: 15,
  perServePenalty: 8,
  usageCap: 8, // usage can never outweigh one extra serve → no drill monopolises a fault
  newDrillBoost: 10,
  newDrillDays: 21,
  pinnedBonus: 1000,
} as const;

/** Re-rank matches for circulation. Usage = "used / repeated", never "effective". */
export function circulate(matches: PrescriptionMatch[], c: CirculationInput): PrescriptionMatch[] {
  const now = (c.now ?? new Date()).getTime();
  const ranked = matches.map((m) => {
    const id = m.drill.id;
    const served = c.servedToUser[id] ?? 0;
    const u = c.usage[id];
    const usageScore = u ? Math.min(CIRCULATION.usageCap, Math.log2(1 + u.completed + 2 * u.returned)) : 0;
    const od = m.drill as Partial<OwnerDrill>;
    const isNew = od.createdAt
      ? (now - new Date(od.createdAt).getTime()) / 86_400_000 < CIRCULATION.newDrillDays
      : false;
    const rank =
      m.score +
      (served === 0 ? CIRCULATION.unseenBonus : 0) -
      served * CIRCULATION.perServePenalty +
      usageScore +
      (isNew ? CIRCULATION.newDrillBoost : 0) +
      (od.pinned ? CIRCULATION.pinnedBonus : 0);
    return { m, rank };
  });
  return ranked.sort((a, b) => b.rank - a.rank || a.m.drill.id.localeCompare(b.m.drill.id)).map((r) => r.m);
}
