import { describe, expect, it } from 'vitest';
import { buildHammerDailyPlan } from './dailyPlan';
import { NORMAL_SIGNAL } from './scheduleContext';
import type { ContextVariable, HammerAthleteContext } from '@/lib/hammer/context/athleteContext';

function context(sport: string, phase: string, injuries: string[] = []): HammerAthleteContext {
  const values = { sport_primary: sport, position_primary: 'SS', lifecycle_band: 'u18', season_phase: phase,
    lifting_age_years: 2, weekly_availability_days: 6, development_priorities: ['hitting', 'defense'],
    injury_history: injuries, equipment_effective: ['field', 'glove', 'ball', 'gamer_bat', 'tee', 'net', 'overload_bat'] };
  const variables = Object.entries(values).map(([key, value]): ContextVariable => ({ key, value, label: key,
    domain: 'identity', source: 'test', confidence: 'high', missing: false, lastUpdated: null,
    lineage: { owner: 'test', source: 'test', rawConfidence: 'high' } }));
  return { variables, missing: [], missingCount: 0, isLoading: false, envelope: null,
    get<T>(key: string) { return variables.find(row => row.key === key) as ContextVariable<T> | undefined; } };
}

describe('actual plan execution structure and schedule protection', () => {
  for (const sport of ['baseball', 'softball']) for (const phase of ['in', 'off', 'pre']) {
    it(`${sport}/${phase}: eight weeks exercise actual scheduled running and hitting work`, () => {
      let runningDays = 0, hittingDays = 0;
      for (let n = 0; n < 56; n++) {
        const date = new Date(2026, 5, 1 + n);
        const plan = buildHammerDailyPlan(context(sport, phase), NORMAL_SIGNAL, null, null, undefined, date);
        for (const block of plan.blocks.filter(row => row.status === 'ready')) {
          if (block.modality === 'baserunning') {
            const full = block.drills.find(row => row.stage === 'full_go');
            expect(full).toBeDefined();
            expect(full?.dosage).toBe('5 reps');
            if (sport === 'softball') expect(full?.setup).toContain('only when the pitch is released');
            runningDays++;
          }
          if (block.modality === 'hitting') {
            const stages = block.drills.map(row => row.stage);
            expect(stages[0]).toBe('prep');
            expect(stages).toContain('full_go');
            expect(stages[stages.length - 1]).toBe('log');
            expect(stages.lastIndexOf('drills')).toBeLessThan(stages.indexOf('full_go'));
            hittingDays++;
          }
        }
      }
      expect(runningDays).toBeGreaterThan(0);
      expect(hittingDays).toBeGreaterThan(0);
    });
    for (const posture of ['game', 'tournament', 'camp', 'travel', 'team_practice', 'taper'] as const) {
      it(`${sport}/${phase}/${posture}: adds no new fielding or running full-go work`, () => {
        const signal = { ...NORMAL_SIGNAL, postureToday: posture, rationale: 'Schedule guard' };
        for (let n = 0; n < 7; n++) {
          const plan = buildHammerDailyPlan(context(sport, phase), signal, null, null, undefined, new Date(2026, 5, 1 + n));
          for (const block of plan.blocks.filter(row => ['defense', 'baserunning'].includes(row.modality))) {
            expect(block.drills.some(row => row.stage === 'full_go')).toBe(false);
          }
        }
      });
    }
  }
});