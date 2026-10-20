import { describe, expect, it } from 'vitest';
import { FIELD_RUNNING_DRILLS } from '@/data/drills/fieldRunningDrills';
import { matchPrescriptionDrills } from '../matchDrills';
import { applyFaultPlanInfluence } from '../applyFaultPlanInfluence';
import type { PrescribedBlock } from '@/lib/hammer/prescription/dailyPlan';
import type { RankedFault } from '@/lib/wic/faultLedger/ranking';

describe('own-category fielding and running fixes', () => {
  for (const sport of ['baseball', 'softball'] as const) for (const category of ['fielding', 'baserunning'] as const) {
    it(`${sport}/${category}: exact issue swaps one drill without dose or execution changes`, () => {
      const key = category === 'fielding' ? 'bobble' : 'late_jump';
      const discipline = category === 'fielding' ? 'fielding' : 'running';
      const block: PrescribedBlock = { modality: category === 'fielding' ? 'defense' : 'baserunning', title: category,
        why: 'Existing work', roadmapReason: 'Existing reason', phase: 'skill', status: 'ready',
        drills: [{ name: 'Prep', dosage: '10 reps', stage: 'prep' }, { name: 'Issue work', dosage: '3×8', stage: 'drills' },
          { name: 'Full go', dosage: '5 reps', stage: 'full_go' }], steps: [], cues: [], stopRules: [], durationMin: 20,
        route: '/practice', ctaLabel: 'Open', missing: [], missingContextKeys: [], gamePlanTemplate: null };
      const ranked: RankedFault[] = [{ rootPatternId: key, family: null, score: 1, sources: ['video_analysis'],
        disciplines: [discipline], totalSampleSize: 1, latestObservedAt: '2026-10-20', says: key, fades: [], clearedByCleanClips: false,
        signals: [{ id: 'one', user_id: 'test', source: 'video_analysis', fault_key: key, root_pattern_id: key,
          discipline, confidence: 0.8, sample_size: 1, severity: 0.5, evidence: key, observed_at: '2026-10-20' }] }];
      const [after] = applyFaultPlanInfluence({ blocks: [block], rankedFaults: ranked, sport, ownedEquipment: new Set(['field', 'glove', 'ball']),
        signalScopes: { one: { sport, module: category } },
        catalog: FIELD_RUNNING_DRILLS, circulation: { servedToUser: {}, usage: {} }, now: new Date('2026-10-20') });
      expect(after.drills[1].slug).toBeDefined();
      expect(after.drills.map(drill => drill.dosage)).toEqual(['10 reps', '3×8', '5 reps']);
      expect(after.drills[0]).toBe(block.drills[0]); expect(after.drills[2]).toBe(block.drills[2]);
      expect(after.durationMin).toBe(20);
      expect(matchPrescriptionDrills({ catalog: FIELD_RUNNING_DRILLS, sport, module: category === 'fielding' ? 'baserunning' : 'fielding', faultKeys: [key] })).toEqual([]);
      const [withoutGear] = applyFaultPlanInfluence({ blocks: [block], rankedFaults: ranked, sport, ownedEquipment: new Set(),
        signalScopes: { one: { sport, module: category } },
        catalog: FIELD_RUNNING_DRILLS, circulation: { servedToUser: {}, usage: {} } });
      expect(withoutGear.drills).toBe(block.drills);
      const [unscoped] = applyFaultPlanInfluence({ blocks: [block], rankedFaults: ranked, sport, ownedEquipment: new Set(['field', 'glove', 'ball']),
        catalog: FIELD_RUNNING_DRILLS, circulation: { servedToUser: {}, usage: {} } });
      expect(unscoped.drills).toBe(block.drills);
      const [otherSport] = applyFaultPlanInfluence({ blocks: [block], rankedFaults: ranked, sport, ownedEquipment: new Set(['field', 'glove', 'ball']),
        signalScopes: { one: { sport: sport === 'baseball' ? 'softball' : 'baseball', module: category } },
        catalog: FIELD_RUNNING_DRILLS, circulation: { servedToUser: {}, usage: {} } });
      expect(otherSport.drills).toBe(block.drills);
    });
  }
});