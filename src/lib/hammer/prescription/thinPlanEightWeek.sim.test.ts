import { expect, it } from 'vitest';
import { buildHammerDailyPlan } from './dailyPlan';
import { validatePlanWeek } from './planSanity';
import { NORMAL_SIGNAL } from './scheduleContext';
import type { ContextVariable, HammerAthleteContext } from '../context/athleteContext';

for (const sport of ['baseball', 'softball']) for (const program of ['pitcher', '5tool', 'golden2way', 'hitting', 'throwing']) for (const phase of ['off', 'pre', 'in', 'post'] as const) {
  it(`${sport}/${program}/${phase}: eight actual-builder weeks have zero recovery-only training days`, () => {
    const variables = Object.entries({ sport_primary: sport, position_primary: program === 'pitcher' ? 'P' : 'SS',
      lifecycle_band: 'adult', season_phase: phase, lifting_age_years: 5, weekly_availability_days: 6,
      injury_history: [], equipment_effective: ['tee', 'gamer_bat', 'net', 'field', 'glove', 'ball'],
    }).map(([key, value]) => ({ key, value, confidence: 'high', missing: false }) as ContextVariable);
    const ctx = { variables, missing: [], missingCount: 0, isLoading: false, envelope: null,
      get: (key: string) => variables.find(v => v.key === key) } as HammerAthleteContext;
    for (let week = 0; week < 8; week++) {
      const days = Array.from({ length: 7 }, (_, day) => {
        const date = new Date(2026, 9, 26 + week * 7 + day);
        const plan = buildHammerDailyPlan(ctx, NORMAL_SIGNAL, null, null, undefined, date, { subscriptionModules: [`${sport}_${program}`] });
        expect(plan.sanity?.ok, JSON.stringify(plan.sanity)).toBe(true);
        return { restDay: date.getDay() === 0, work: plan.blocks.filter(b => b.status === 'ready').flatMap(b => b.drills.map(d => ({ category: b.modality, slug: d.slug }))) };
      });
      const floors = program === 'pitcher' ? { defense: 4 } : program === 'hitting' ? { hitting: 3 } : program === 'throwing' ? { defense: 4 } : { hitting: 3, defense: 4, baserunning: 1 };
      const result = validatePlanWeek(days, floors);
      if (program === 'pitcher') expect(days.flatMap(d => d.work).some(w => ['hitting', 'baserunning', 'bunting'].includes(w.category))).toBe(false);
      expect(result.ok, JSON.stringify(result)).toBe(true);
    }
  });
}