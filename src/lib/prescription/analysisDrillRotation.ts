import type { EliteDrill } from '@/data/drills/eliteDrillCatalog';
import type { PrescribedBlock, DrillStep } from '@/lib/hammer/prescription/dailyPlan';
import { fadeForSignal, type ClipEvidence } from '@/lib/wic/faultLedger/cleanClipFade';
import { ownsAllGear, avoidsMissingGear } from '../../../supabase/functions/_shared/planSwap/simpleSwap';

export interface AnalysisDrillEnrollment {
  sport: string;
  category: string;
  drill_id: string;
  video_id: string;
  issue_key: string;
  fault_key: string | null;
  goal_label: string | null;
  observed_at: string;
  created_at: string;
}

export function analysisDrillCategory(block: Pick<PrescribedBlock, 'modality' | 'route'>): string | null {
  if (block.modality === 'hitting') return 'hitting';
  if (block.modality === 'throwing') return new URL(block.route, 'https://local.invalid').searchParams.get('module') === 'pitching' ? 'pitching' : 'throwing';
  if (block.modality === 'defense') return 'fielding';
  if (block.modality === 'baserunning') return 'baserunning';
  return null;
}

/** One existing ordinary slot, never prep, full-go, log, owner work or extra dose. */
export function analysisDrillSlot(drills: readonly DrillStep[]): number {
  return drills.findIndex(d => !d.ownerDrillId && d.prescriptionOrigin !== 'owner' && !d.bunt && (d.stage == null || d.stage === 'drills'));
}

export function enrollmentBecause(enrollment: AnalysisDrillEnrollment, name: string): string {
  const reason = enrollment.fault_key ? enrollment.fault_key.replace(/_/g, ' ') : `your goal: ${enrollment.goal_label ?? 'saved skill work'}`;
  return `Because you chose "${name}" to work on ${reason}, it stays in your fix-it slot while we check your progress.`;
}

export function enrolledDrill(source: DrillStep, drill: EliteDrill, enrollment: AnalysisDrillEnrollment): DrillStep {
  return { ...source, name: drill.name, slug: drill.id, setup: drill.setup, cue: drill.cues.join(' · '),
    videoUrl: drill.videoUrl, libraryVideoId: drill.libraryVideoId, equipmentNote: drill.equipment.join(', '),
    guide: undefined, prescriptionOrigin: 'analysis', routineRole: 'fix_it',
    analysisEnrollment: { videoId: enrollment.video_id, issueKey: enrollment.issue_key, drillId: drill.id },
  };
}

/** Reuse legal ready cards; clean-clip learning moves a cleared issue on, not a timer or a heart. */
export function applyAnalysisDrillRotation(input: {
  blocks: readonly PrescribedBlock[]; enrollments: readonly AnalysisDrillEnrollment[]; catalog: readonly EliteDrill[];
  sport: string; equipment: Iterable<string>; missing?: Iterable<string>; clips: readonly ClipEvidence[];
}): PrescribedBlock[] {
  return input.blocks.map(block => {
    if (block.status !== 'ready') return block;
    const index = analysisDrillSlot(block.drills);
    if (index < 0) return block;
    const category = analysisDrillCategory(block);
    const choices = input.enrollments.filter(e => e.sport === input.sport && e.category === category)
      .slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
    for (const enrollment of choices) {
      if (enrollment.fault_key && fadeForSignal({ source: 'video_analysis', discipline: enrollment.category,
        fault_key: enrollment.fault_key, observed_at: enrollment.observed_at }, input.clips).status === 'cleared') continue;
      const drill = input.catalog.find(d => d.id === enrollment.drill_id && d.category === category && d.sports.includes(input.sport as 'baseball' | 'softball'));
      if (!drill || ('ownerRowId' in drill && !(drill as EliteDrill & { placements: string[] }).placements.includes('hammers_today:skill')
        && !(drill as EliteDrill & { placements: string[] }).placements.includes(`hammers_today:${category}`))) continue;
      const gear = { equipment_requirements: drill.equipment };
      if (!ownsAllGear(gear, input.equipment) || !avoidsMissingGear(gear, input.missing ?? [])) continue;
      const drills = block.drills.slice();
      drills[index] = enrolledDrill(drills[index], drill, enrollment);
      const checklist = drills.map(d => `${d.name} — ${d.dosage}`);
      return { ...block, drills, steps: checklist, because: [...block.because, enrollmentBecause(enrollment, drill.name)],
        gamePlanTemplate: block.gamePlanTemplate ? { ...block.gamePlanTemplate, checklist } : null };
    }
    return block;
  });
}