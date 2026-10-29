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
  for (const sport of ['baseball', 'softball']) for (const program of ['5tool', 'golden2way']) {
    it(`${sport}/${program}: equipped catcher framing uses the existing beginner dose for 56 days`, () => {
      const appearances = Array(8).fill(0);
      for (let day = 0; day < 56; day++) {
        const phase = day < 21 ? 'off' : day < 42 ? 'pre' : 'in';
        const plan = buildHammerDailyPlan(context(sport, 'C', phase,
          ['tee', 'gamer_bat', 'net', 'field', 'glove', 'ball', 'catchers_gear', 'partner']), NORMAL_SIGNAL,
          null, null, undefined, new Date(2026, 5, 1 + day), { subscriptionModules: [`${sport}_${program}`] });
        for (const block of plan.blocks.filter(b => b.modality === 'defense' && b.status === 'ready')) {
          for (const drill of block.drills ?? []) if (drill.name === 'Framing ladder — 4 corners') {
            expect(drill.dosage).toBe('4×4 reps (one set per zone)');
            appearances[Math.floor(day / 7)]++;
          }
        }
      }
      expect(appearances.slice(0, 3).every(count => count > 0)).toBe(true);
    });
  }
  for (const sport of ['baseball', 'softball']) for (const position of ['C', 'SS', 'OF']) {
    it(`${sport}/${position}: missing gear never grants work on any of 56 days`, () => {
      for (let day = 0; day < 56; day++) {
        const date = new Date(2026, 5, 1 + day);
        const phase = day < 20 ? 'off' : day < 40 ? 'pre' : 'in';
        const plan = buildHammerDailyPlan(context(sport, position, phase, []), NORMAL_SIGNAL, null, null, undefined, date,
          { subscriptionModules: [`${sport}_5tool`], alwaysMissingGear: ['field', 'glove', 'ball', 'catchers_gear', 'partner'] });
        const defense = plan.blocks.find(b => b.modality === 'defense');
        expect(defense).toBeDefined();
        expect(defense?.drills.some(d => d.executionKind === 'fielding_reads')).toBe(false);
        expect(defense?.drills.every(d => /dry|shadow|footwork|read/i.test(d.name))).toBe(true);
      }
    });
  }
});