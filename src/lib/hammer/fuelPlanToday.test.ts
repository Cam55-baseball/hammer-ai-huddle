import { describe, expect, it } from 'vitest';
import { buildHammerDailyPlan } from './prescription/dailyPlan';
import { NORMAL_SIGNAL } from './prescription/scheduleContext';
import type { ContextVariable, HammerAthleteContext } from './context/contextProjection';
import { fuelPlanToday } from './fuelPlanToday';

function ctxFor(position: string, band: string): HammerAthleteContext {
  const values = { sport_primary: 'baseball', position_primary: position, lifecycle_band: band, season_phase: 'off', equipment_effective: ['bat', 'tee', 'net', 'field', 'glove', 'ball'], injury_history: [] };
  const variables = Object.entries(values).map(([key, value]): ContextVariable => ({ key, value, label: key, domain: 'identity', source: 'test', confidence: 'high', missing: false, lastUpdated: null, lineage: { owner: 'test', source: 'test', rawConfidence: 'high' } }));
  return { variables, missing: [], missingCount: 0, isLoading: false, envelope: null, get<T>(key: string) { return variables.find(v => v.key === key) as ContextVariable<T> | undefined; } };
}
// Wednesday = training day in every six-day template.
const DAY = new Date('2026-11-04T12:00:00');
const PROGRAMS = [['5Tool', 'baseball_5tool', 'SS'], ['Complete Pitcher', 'baseball_pitcher', 'P'], ['Golden 2Way', 'baseball_golden2way', 'SS']] as const;

describe('Fuel plan shows in Before you start on a training day', () => {
  for (const [label, module, pos] of PROGRAMS) for (const [who, age] of [['adult', 22], ['under-18', 15]] as const) {
    it(`${label} ${who}`, () => {
      const plan = buildHammerDailyPlan(ctxFor(pos, age < 18 ? 'u18' : 'adult'), NORMAL_SIGNAL, null, null, undefined, DAY, { subscriptionModules: [module] });
      const fuel = plan.blocks.find(b => b.modality === 'fueling');
      expect(fuel).toBeTruthy();
      const shown = fuelPlanToday(fuel!, { goalType: 'lose_weight', age, restDay: false, saved: { protein_goal: 120, calorie_goal: 2200 } });
      expect(shown.status).toBe('ready');
      expect(shown.drills.length).toBeGreaterThan(0);
      const text = JSON.stringify(shown);
      if (age < 18) {
        expect(text).not.toMatch(/lose weight|body-comp|calorie/i);
        expect(text).toMatch(/grow and train/);
      } else {
        expect(text).toMatch(/lose weight/);
      }
    });
  }
});

it('rest day gets rest-day guidance with no new numbers', () => {
  const block = { modality: 'fueling', status: 'ready', title: 'Fueling', why: '', drills: [{ name: 'Pre-session', dosage: '60–90 min' }], steps: [] };
  const shown = fuelPlanToday(block, { goalType: null, age: 15, restDay: true });
  expect(shown.title).toBe('Fuel plan — rest day');
  expect(JSON.stringify(shown.drills)).not.toMatch(/\d/);
});
