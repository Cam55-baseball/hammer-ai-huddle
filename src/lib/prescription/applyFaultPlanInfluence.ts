/** Analysis → Hammers Today overlay. Replaces one existing legal skill drill; never adds work. */
import type { EliteDrill } from "@/data/drills/eliteDrillCatalog";
import type { PrescribedBlock, DrillStep } from "@/lib/hammer/prescription/dailyPlan";
import type { CirculationInput, OwnerDrill } from "@/lib/prescription/ownerDrills";
import { matchPrescriptionDrills } from "@/lib/prescription/matchDrills";
import { recencyWeight, type Discipline, type RankedFault } from "@/lib/wic/faultLedger/ranking";

const PLAN_SIGNAL_SOURCES = new Set(["video_analysis", "report_card"]);

export interface AnalysisInfluenceTrace {
  readonly version: "analysis-slot-v1";
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
  readonly blocks: ReadonlyArray<PrescribedBlock>;
  readonly rankedFaults: ReadonlyArray<RankedFault>;
  readonly sport: "baseball" | "softball";
  readonly ownedEquipment: ReadonlySet<string>;
  readonly catalog: ReadonlyArray<EliteDrill>;
  readonly circulation: CirculationInput;
  readonly now?: Date;
}

function isOwnerDrill(drill: EliteDrill): drill is OwnerDrill {
  return "ownerRowId" in drill;
}

function eligibleCatalog(catalog: ReadonlyArray<EliteDrill>, ownedEquipment: ReadonlySet<string>): EliteDrill[] {
  const owned = new Set([...ownedEquipment].map((item) => item.trim().toLowerCase()));
  return catalog.filter((drill) => {
    // Owner-created and owner-overridden drills keep their sole route through
    // ownerPlanDrills, where every owner placement condition remains enforced.
    if (isOwnerDrill(drill)) return false;
    return drill.equipment.every((item) => owned.has(item.trim().toLowerCase()));
  });
}

function disciplineForBlock(block: PrescribedBlock): Discipline | null {
  if (block.modality === "hitting") return "hitting";
  if (block.modality === "throwing") return "throwing";
  return null;
}

export function applyFaultPlanInfluence(input: FaultPlanInfluenceInput): ReadonlyArray<PrescribedBlock> {
  const now = input.now ?? new Date();
  const priorities = input.rankedFaults.slice(0, 3);
  if (priorities.length === 0) return input.blocks;
  const catalog = eligibleCatalog(input.catalog, input.ownedEquipment);
  if (catalog.length === 0) return input.blocks;

  return input.blocks.map((block) => {
    const discipline = disciplineForBlock(block);
    if (!discipline || block.status !== "ready" || block.drills.length === 0) return block;
    const signals = priorities.flatMap((priority) => priority.signals
      .filter((signal) => signal.discipline === discipline && PLAN_SIGNAL_SOURCES.has(signal.source))
      .map((signal) => ({ signal, priority })));
    if (signals.length === 0) return block;

    const faultKeys = [...new Set(signals.map(({ signal }) => signal.fault_key))];
    const [match] = matchPrescriptionDrills({
      catalog,
      circulation: input.circulation,
      faultKeys,
      module: discipline,
      sport: input.sport,
      max: 1,
    });
    if (!match) return block;
    const sourceSignal = signals.find(({ signal }) => match.drill.violationKeys.includes(signal.fault_key));
    if (!sourceSignal) return block;

    const replacementIndex = block.drills.findIndex(
      (drill) => (drill as InfluencedDrillStep).prescriptionOrigin !== "owner",
    );
    if (replacementIndex < 0) return block;
    const displaced = block.drills[replacementIndex];
    const replacement: InfluencedDrillStep = {
      name: match.drill.name,
      slug: match.drill.id,
      setup: match.drill.setup || undefined,
      dosage: match.drill.dosage,
      cue: match.drill.cues[0],
      equipmentNote: match.drill.equipment.length ? match.drill.equipment.join(", ") : undefined,
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
    return {
      ...block,
      drills,
      steps: checklist,
      roadmapReason: `${block.roadmapReason} Recent analysis shaped one existing drill slot.`,
      gamePlanTemplate: block.gamePlanTemplate ? { ...block.gamePlanTemplate, checklist } : null,
    };
  });
}