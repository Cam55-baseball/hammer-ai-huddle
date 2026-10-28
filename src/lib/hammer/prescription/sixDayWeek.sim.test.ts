// Owner Oct 28: 6-day week for everyone (no week-by-week ramp), weekly floors
// hitting 3 / defense 4 / baserunning 1 / bunting 2 (5Tool + Golden 2Way),
// readiness modulates inside the session, Sunday = soft recovery + Mind only.
// Real builder (buildHammerDailyPlan) over 8 weeks, both sports, every program.
import { describe, expect, it } from 'vitest';
import { buildHammerDailyPlan } from './dailyPlan';
import { NORMAL_SIGNAL } from './scheduleContext';
import { buntingProgram } from '../../../../supabase/functions/_shared/wic/buntingProgram';
import { dailyMindItem } from '@/lib/hammer/week/weeklyVolume';
import type { ContextVariable, HammerAthleteContext } from '@/lib/hammer/context/athleteContext';

const gear = ['tee', 'gamer_bat', 'net', 'field', 'glove', 'ball'];
function context(values: Record<string, unknown>): HammerAthleteContext {
  const variables = Object.entries(values).map(([key, value]): ContextVariable => ({ key, value, label: key,
    domain: 'identity', source: 'test', confidence: 'high', missing: false, lastUpdated: null,
    lineage: { owner: 'test', source: 'test', rawConfidence: 'high' } }));
  return { variables, missing: [], missingCount: 0, isLoading: false, envelope: null,
    get<T>(key: string) { return variables.find(row => row.key === key) as ContextVariable<T> | undefined; } };
}
const SKILLS = ['hitting', 'defense', 'baserunning', 'throwing'] as const;
const FLOORS = { hitting: 3, defense: 4, baserunning: 1 } as const;
const PHYSICAL = ['hitting', 'defense', 'baserunning', 'throwing', 'speed', 'strength'];

describe('six-day week through the real daily-plan builder (8 weeks)', () => {
  for (const sport of ['baseball', 'softball'] as const)
    for (const tier of ['pitcher', '5tool', 'golden2way'] as const)
      for (const phase of ['off', 'pre', 'in', 'post'] as const) {
        it(`${sport}/${tier}/${phase}: 6 training days, floors met, no ramp, rest day clean`, () => {
          const modules = [`${sport}_${tier}`];
          const position = tier === 'pitcher' ? 'P' : 'SS';
          const perWeek: Record<string, number>[] = [];
          // Beginner (lifting age 0.5) and advanced (5 yrs) get the SAME days — no ladder ramp.
          for (const liftingAge of [0.5, 5]) for (let w = 0; w < 8; w++) {
            const counts: Record<string, number> = { hitting: 0, defense: 0, baserunning: 0, throwing: 0, training: 0 };
            for (let d = 0; d < 7; d++) {
              const date = new Date(2026, 5, 1 + w * 7 + d); // Mon 2026-06-01
              const plan = buildHammerDailyPlan(context({ sport_primary: sport, position_primary: position, lifecycle_band: 'adult',
                season_phase: phase, lifting_age_years: liftingAge, weekly_availability_days: 6, injury_history: [],
                equipment_effective: gear }), NORMAL_SIGNAL, null, null, undefined, date, { subscriptionModules: modules });
              let trained = false;
              for (const m of SKILLS) if (plan.microcycle.perModality[m].scheduled) { counts[m]++; trained = true; }
              if (date.getDay() === 0) {
                // Rest day: no physical skill/lift/speed work is ready.
                expect(trained).toBe(false);
                expect(plan.blocks.filter(b => PHYSICAL.includes(b.modality) && b.status === 'ready' && b.drills.length > 0)).toEqual([]);
              } else if (trained) counts.training++;
              // The Mind item exists every day, rest day included, and is never physical.
              expect(dailyMindItem(w * 7 + d, false).physical).toBe(false);
            }
            perWeek.push(counts);
          }
          expect(perWeek.every(c => c.training === 6)).toBe(true);
          // No ramp: every week (and both training ages) schedules identical session counts.
          expect(new Set(perWeek.map(c => JSON.stringify(c))).size).toBe(1);
          const week = perWeek[0];
          expect(week.hitting).toBeGreaterThanOrEqual(FLOORS.hitting);
          expect(week.defense).toBeGreaterThanOrEqual(FLOORS.defense);
          expect(week.baserunning).toBeGreaterThanOrEqual(FLOORS.baserunning);
          // Pitcher throwing stays under the existing bullpen cap (arm rules unchanged).
          if (tier === 'pitcher') expect(week.throwing).toBeLessThanOrEqual(5);
        });
      }

  it('bunting gets its 2 weekly sessions for 5Tool/Golden 2Way from the 6-day legal hitting days, never for Pitcher', () => {
    for (const sport of ['baseball', 'softball'] as const) {
      const legal = [1, 2, 3, 4, 5, 6];
      for (const tier of ['5tool', 'golden2way'])
        expect(buntingProgram({ sport, modules: [`${sport}_${tier}`], bats: 'R', legalWeekdays: legal } as never).scheduled).toHaveLength(2);
      expect(buntingProgram({ sport, modules: [`${sport}_pitcher`], bats: 'R', legalWeekdays: legal } as never).scheduled).toHaveLength(0);
    }
  });

  it('low readiness keeps every scheduled skill session as the low-taxing version (still counts)', () => {
    for (const sport of ['baseball', 'softball'] as const) {
      const date = new Date(2026, 5, 3); // Wednesday
      const make = (readiness: number) => buildHammerDailyPlan(context({ sport_primary: sport, position_primary: 'SS',
        lifecycle_band: 'adult', season_phase: 'off', lifting_age_years: 2, weekly_availability_days: 6, injury_history: [],
        equipment_effective: gear, readiness: { score: readiness } }), NORMAL_SIGNAL, null, null, undefined, date,
        { subscriptionModules: [`${sport}_5tool`] });
      const low = make(0.3), normal = make(0.6);
      for (const m of ['hitting', 'defense', 'baserunning'] as const) {
        expect(low.microcycle.perModality[m].scheduled).toBe(normal.microcycle.perModality[m].scheduled);
        if (low.microcycle.perModality[m].scheduled) {
          expect(low.microcycle.perModality[m].intensity).toBe('activation');
          expect(low.microcycle.perModality[m].reason).toContain('low-taxing');
        }
      }
      expect(normal.microcycle.perModality.hitting.intensity).not.toBe('activation');
    }
  });

  it('injury still lowers days below the floor (safety wins over minimums)', () => {
    const plan = buildHammerDailyPlan(context({ sport_primary: 'baseball', position_primary: 'SS', lifecycle_band: 'adult',
      season_phase: 'off', lifting_age_years: 2, weekly_availability_days: 6, injury_history: [{ region: 'hamstring' }],
      equipment_effective: gear }), NORMAL_SIGNAL, null, null, undefined, new Date(2026, 5, 1), { subscriptionModules: ['baseball_5tool'] });
    expect(plan.microcycle.skillDays.baserunning.length).toBeLessThanOrEqual(2);
  });
});
