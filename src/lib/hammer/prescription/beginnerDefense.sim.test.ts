import { describe, expect, it } from 'vitest';
import { buildHammerDailyPlan } from './dailyPlan';
import { NORMAL_SIGNAL } from './scheduleContext';
import type { ContextVariable, HammerAthleteContext } from '../context/athleteContext';
function context(sport: string, position: string, phase: string, equipment: string[]): HammerAthleteContext {
  const values = { sport_primary: sport, position_primary: position, lifecycle_band: 'u18', season_phase: phase,
    lifting_age_years: 0, weekly_availability_days: 6, development_priorities: ['defense'], injury_history: [], equipment_effective: equipment };
  const variables = Object.entries(values).map(([key, value]): ContextVariable => ({ key, value, label: key,
    domain: 'identity', source: 'test', confidence: 'high', missing: false, lastUpdated: null,
    lineage: { owner: 'test', source: 'test', rawConfidence: 'high' } }));
  return { variables, missing: [], missingCount: 0, isLoading: false, envelope: null,
    get<T>(key: string) { return variables.find(v => v.key === key) as ContextVariable<T> | undefined; } };
}
describe('beginner eight-week defense safety through the actual builder', () => {
  for (const sport of ['baseball', 'softball']) for (const position of ['C', 'SS', 'OF']) {
    it(`${sport}/${position}: missing gear never grants work on any of 56 days`, () => {
      for (let day = 0; day < 56; day++) {
        const date = new Date(2026, 5, 1 + day);
        const phase = day < 20 ? 'off' : day < 40 ? 'pre' : 'in';
        const plan = buildHammerDailyPlan(context(sport, position, phase, []), NORMAL_SIGNAL, null, null, undefined, date,
          { subscriptionModules: [`${sport}_5tool`] });
        const defense = plan.blocks.find(b => b.modality === 'defense');
        expect(defense).toBeDefined();
        expect(defense?.drills).toEqual([]);
        expect(defense?.status).not.toBe('ready');
      }
    });
  }
});