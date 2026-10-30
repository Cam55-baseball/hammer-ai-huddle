/** Analysis → Hammers Today overlay. Replaces one existing legal skill drill; never adds work. */
import type { EliteDrill } from "@/data/drills/eliteDrillCatalog";
import type { PrescribedBlock, DrillStep } from "@/lib/hammer/prescription/dailyPlan";
import type { CirculationInput, OwnerDrill } from "@/lib/prescription/ownerDrills";
import { matchPrescriptionDrills } from "@/lib/prescription/matchDrills";
import { recencyWeight, type Discipline, type RankedFault } from "@/lib/wic/faultLedger/ranking";
import { fadeMessage } from "@/lib/wic/faultLedger/cleanClipFade";
import { recurringBecause, stillRecurring, type RecurringIssue } from "@/lib/wic/faultLedger/recurringIssues";
import { PHILOSOPHY_TEST_USERS } from '@/lib/intelligence/testSettings';
import { eligibleFor } from './ownerPlanDrills';
import type { OwnerDrillRow } from './ownerDrills';

const PLAN_SIGNAL_SOURCES = new Set(["video_analysis", "report_card"]);

export interface AnalysisInfluenceTrace {
  readonly version: "analysis-slot-v1";
  /** Set when the slot was filled for a stored recurring issue. */
  readonly recurring?: { readonly analysisCount: number; readonly videoIds: readonly string[] };
  readonly faultKey: string;
  readonly rootPatternId: string;
  readonly source: "video_analysis" | "report_card";
  readonly observedAt: string;
  readonly recencyWeight: number;
  readonly drillId: string;
  readonly displacedDrill: string;
}

export interface InfluencedDrillStep extends DrillStep {
  readonly prescriptionOrigin?: "owner" | "analysis";
  readonly analysisInfluence?: AnalysisInfluenceTrace;
}

export interface FaultPlanInfluenceInput {
  readonly userId?: string;
  readonly ownerRows?: readonly OwnerDrillRow[];
  readonly blocks: ReadonlyArray<PrescribedBlock>;
  readonly rankedFaults: ReadonlyArray<RankedFault>;
  readonly sport: "baseball" | "softball";
  readonly ownedEquipment: ReadonlySet<string>;
  readonly catalog: ReadonlyArray<EliteDrill>;
  readonly circulation: CirculationInput;
  readonly now?: Date;
  /** Canonical source-record provenance, never inferred from the selected sport. */
  /** Stored recurring issues (self-scoped read); they take the fix-it slot first. */
  readonly recurringIssues?: ReadonlyArray<RecurringIssue>;
  readonly signalScopes?: Readonly<Record<string, { sport: 'baseball' | 'softball'; module: string }>>;
}

function isOwnerDrill(drill: EliteDrill): drill is OwnerDrill {
  return "ownerRowId" in drill;
}

function eligibleCatalog(catalog: ReadonlyArray<EliteDrill>, ownedEquipment: ReadonlySet<string>, input: FaultPlanInfluenceInput): EliteDrill[] {
  const owned = new Set([...ownedEquipment].map((item) => item.trim().toLowerCase()));
  return catalog.filter((drill) => {
    // Owner-created and owner-overridden drills keep their sole route through
    // ownerPlanDrills, where every owner placement condition remains enforced.
    if (isOwnerDrill(drill)) {
      if (!PHILOSOPHY_TEST_USERS.some(id=>id===input.userId)) return false;
      const row=input.ownerRows?.find(r=>r.id===drill.ownerRowId);
      if(!row || row.routine_role!=='fix_it')return false;
      const slot=drill.category==='fielding'?'hammers_today:defense':drill.category==='baserunning'?'hammers_today:baserunning':'hammers_today:skill';
      if(!eligibleFor(row,[slot],{sport:input.sport,owned,day:input.now,skill:drill.category==='hitting'?'hitting':'throwing'}))return false;
    }
    return drill.equipment.every((item) => owned.has(item.trim().toLowerCase()));
  });
}

/**
 * The athlete-facing reason drills eased: the most recent clean-clip fade for
 * this skill. Text only — never adds, removes or reorders a drill.
 */
function withCleanClipNote(block: PrescribedBlock, discipline: Discipline, ranked: ReadonlyArray<RankedFault>): PrescribedBlock {
  const fades = ranked.flatMap((r) => r.fades ?? [])
    .filter(({ signal, fade }) => signal.discipline === discipline && fade.status !== "none" && fade.latestCleanClipAt)
    .sort((a, b) => String(b.fade.latestCleanClipAt).localeCompare(String(a.fade.latestCleanClipAt)));
  const top = fades[0];
  if (!top) return block;
  const note = fadeMessage(discipline, top.signal.fault_key, top.fade.status);
  return note ? { ...block, cleanClipNote: note } : block;
}

/** Exact category only: an overhand throwing card is not a pitching prescription. */
function disciplinesForBlock(block: PrescribedBlock): Discipline[] {
  if (block.modality === "hitting") return ["hitting"];
  if (block.modality === "pitching") return ["pitching"];
  if (block.modality === "throwing") {
    const module = new URL(block.route, 'https://local.invalid').searchParams.get('module');
    return module === 'pitching' ? ['pitching'] : ['throwing'];
  }
  if (block.modality === "defense") return ["fielding"];
  if (block.modality === "baserunning") return ["running"];
  return [];
}
const MODULE_FOR: Record<string, string> = { hitting: "hitting", throwing: "throwing", pitching: "pitching", fielding: "fielding", running: "baserunning" };

export function applyFaultPlanInfluence(input: FaultPlanInfluenceInput): ReadonlyArray<PrescribedBlock> {
  const now = input.now ?? new Date();
  // A fault cleared by clean clips gives up its priority slot (Stage 2).
  const priorities = input.rankedFaults.filter((r) => !r.clearedByCleanClips).slice(0, 3);
  const catalog = eligibleCatalog(input.catalog, input.ownedEquipment, input);

  return input.blocks.map((original) => {
    const disciplines = disciplinesForBlock(original);
    if (disciplines.length === 0 || original.status !== "ready" || original.drills.length === 0) return original;
    const block = disciplines.reduce((b, d) => withCleanClipNote(b, d, input.rankedFaults), original);
    if (catalog.length === 0) return block;
    const recurringBlock = applyRecurring(block, disciplines, input, catalog, now);
    if (recurringBlock) return recurringBlock;
    if (priorities.length === 0) return block;
    const signals = priorities.flatMap((priority) => priority.signals
      .filter((signal) => {
        if (!disciplines.includes(signal.discipline) || !PLAN_SIGNAL_SOURCES.has(signal.source)) return false;
        if (signal.discipline !== 'fielding' && signal.discipline !== 'running') return true;
        const scope = input.signalScopes?.[signal.id];
        return scope?.sport === input.sport && scope.module === (signal.discipline === 'running' ? 'baserunning' : 'fielding');
      })
      .map((signal) => ({ signal, priority })));
    if (signals.length === 0) return block;

    // Highest-priority finding's skill picks the drill library; a skill with no library (e.g. running) honestly swaps nothing.
    const discipline = signals[0].signal.discipline;
    const faultKeys = [...new Set(signals.filter(({ signal }) => signal.discipline === discipline).map(({ signal }) => signal.fault_key))];
    // No category spill-over (owner rule Oct 20): only drills from the flagged
    // skill's own category. Fielding and running have no category of their own
    // yet, so they swap nothing rather than borrow a throwing drill.
    const [match] = matchPrescriptionDrills({
      catalog: catalog.filter((d) => d.category === (discipline === 'running' ? 'baserunning' : discipline)),
      circulation: input.circulation,
      faultKeys,
      module: MODULE_FOR[discipline],
      sport: input.sport,
      max: 1,
    });
    if (!match) return block;
    const sourceSignal = signals.find(({ signal }) => match.drill.violationKeys.includes(signal.fault_key));
    if (!sourceSignal) return block;

    const replacementIndex = block.drills.findIndex(
      (drill) => (drill as InfluencedDrillStep).prescriptionOrigin !== "owner" &&
        !drill.bunt && !drill.armEvent && (drill.stage === undefined || drill.stage === "drills"),
    );
    if (replacementIndex < 0) return block;
    const displaced = block.drills[replacementIndex];
    const replacement: InfluencedDrillStep = {
      name: match.drill.name,
      slug: match.drill.id,
      setup: match.drill.setup || undefined,
      dosage: displaced.dosage,
      cue: match.drill.cues[0],
      equipmentNote: match.drill.equipment.length ? match.drill.equipment.join(", ") : undefined,
      stage: "drills",
      prescriptionOrigin: "analysis",
      analysisInfluence: {
        version: "analysis-slot-v1",
        faultKey: sourceSignal.signal.fault_key,
        rootPatternId: sourceSignal.priority.rootPatternId,
        source: sourceSignal.signal.source as "video_analysis" | "report_card",
        observedAt: sourceSignal.signal.observed_at,
        recencyWeight: recencyWeight(sourceSignal.signal.observed_at, now.getTime()),
        drillId: match.drill.id,
        displacedDrill: displaced.name,
      },
    };
    const drills = block.drills.slice();
    drills[replacementIndex] = replacement;
    const checklist = drills.map((drill) => `${drill.name} — ${drill.dosage}`);
    const seen = new Date(sourceSignal.signal.observed_at);
    const when = Number.isNaN(seen.getTime()) ? "your latest video" : `your video from ${seen.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    const because = `Because ${when} showed: ${sourceSignal.priority.says}. "${match.drill.name}" works on it today.`;
    return {
      ...block,
      drills,
      steps: checklist,
      because: [...(block.because ?? []), because],
      roadmapReason: `${block.roadmapReason} Recent analysis shaped one existing drill slot.`,
      gamePlanTemplate: block.gamePlanTemplate ? { ...block.gamePlanTemplate, checklist } : null,
    };
  });
}

/** Fix-it slot for a recurring issue: same one-slot replacement, same dose, never an owner slot. */
function applyRecurring(block: PrescribedBlock, disciplines: Discipline[], input: FaultPlanInfluenceInput,
  catalog: EliteDrill[], now: Date): PrescribedBlock | null {
  const issues = (input.recurringIssues ?? [])
    .filter((i) => i.sport === input.sport && disciplines.includes(i.skill_domain as Discipline) && stillRecurring(i, now.getTime()))
    .sort((a, b) => b.analysis_count - a.analysis_count || b.last_seen.localeCompare(a.last_seen));
  for (const issue of issues) {
    const discipline = issue.skill_domain as Discipline;
    const [match] = matchPrescriptionDrills({
      catalog: catalog.filter((d) => d.category === (discipline === "running" ? "baserunning" : discipline)),
      circulation: input.circulation, faultKeys: [issue.fault_key], module: MODULE_FOR[discipline], sport: input.sport, max: 1,
    });
    if (!match || !match.drill.violationKeys.includes(issue.fault_key)) continue;
    const idx = block.drills.findIndex((d) => (d as InfluencedDrillStep).prescriptionOrigin !== "owner" && !d.bunt && !d.armEvent && (d.stage === undefined || d.stage === "drills"));
    if (idx < 0) return null;
    const displaced = block.drills[idx];
    const replacement: InfluencedDrillStep = {
      name: match.drill.name, slug: match.drill.id, setup: match.drill.setup || undefined, dosage: displaced.dosage,
      cue: match.drill.cues[0], equipmentNote: match.drill.equipment.length ? match.drill.equipment.join(", ") : undefined,
      stage: "drills", prescriptionOrigin: "analysis",
      analysisInfluence: {
        version: "analysis-slot-v1", faultKey: issue.fault_key, rootPatternId: issue.fault_key, source: "video_analysis",
        observedAt: issue.last_seen, recencyWeight: recencyWeight(issue.last_seen, now.getTime()), drillId: match.drill.id,
        displacedDrill: displaced.name, recurring: { analysisCount: issue.analysis_count, videoIds: issue.video_ids },
      },
    };
    const drills = block.drills.slice();
    drills[idx] = replacement;
    const checklist = drills.map((d) => `${d.name} — ${d.dosage}`);
    return {
      ...block, drills, steps: checklist,
      because: [...(block.because ?? []), recurringBecause(issue, match.drill.name)],
      roadmapReason: `${block.roadmapReason} A recurring finding shaped one existing drill slot.`,
      gamePlanTemplate: block.gamePlanTemplate ? { ...block.gamePlanTemplate, checklist } : null,
    };
  }
  return null;
}
