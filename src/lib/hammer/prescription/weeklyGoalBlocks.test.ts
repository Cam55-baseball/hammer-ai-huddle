import { describe, expect, it } from 'vitest';
import { weeklyGoalBlocks, secondGoalFirst } from './weeklyGoalBlocks';
import { projectEnvelope } from '../context/decisionFilters';
import { resolveWeeklyTemplate, applyMicrocycle } from './weeklyMicrocycle';
import { SKILL_MODALITIES, resolveSkillDaysTarget } from '../roadmap/skillFrequencyLadder';
import type { HammerAthleteContext, ContextVariable } from '../context/athleteContext';

function projection(sport: string, order: string[], extra: Record<string, unknown> = {}) {
  const values = { sport_primary: sport, season_phase: 'off', lifecycle_band: 'adult', lifting_age_years: 2,
    weekly_availability_days: 6, injury_history: [], category_goals: { version: 1, updatedAt: '2026-10-20',
      goals: order.map((category, i) => ({ category, rank: i + 1, intent: null })) }, ...extra };
  const variables = Object.entries(values).map(([key, value]) => ({ key, value })) as ContextVariable[];
  return projectEnvelope({ get: (key: string) => variables.find(v => v.key === key), variables,
    missing: [], missingCount: 0, isLoading: false, envelope: null } as HammerAthleteContext);
}
const order = ['fielding', 'hitting', 'throwing', 'speed', 'power'];
const included = new Set(SKILL_MODALITIES);
describe('weekly goal blocks — owner replacement, both sports and six cohorts over eight weeks', () => {
  for (const sport of ['baseball', 'softball']) for (const tier of ['pitcher', '5tool', 'golden2way']) {
    it(`${sport}/${tier}: one extra top block, baseline never reduced, second first, no rest-day or lifting change`, () => {
      let firstTotal = 0, changedTotal = 0;
      for (let week = 0; week < 8; week++) {
        const p = projection(sport, order);
        const position = tier === 'pitcher' ? 'P' : 'SS';
        const baseline = Object.fromEntries(SKILL_MODALITIES.map(m => [m, resolveSkillDaysTarget('foundation', m, position)]));
        const template = resolveWeeklyTemplate(p);
        const next = weeklyGoalBlocks(template, baseline, p, position, included);
        expect(next.targets.defense).toBe(3);
        for (const m of SKILL_MODALITIES) expect(next.targets[m]).toBeGreaterThanOrEqual(baseline[m]);
        expect(next.template.perModality.strength).toEqual(template.perModality.strength);
        const swapped = weeklyGoalBlocks(template, baseline, projection(sport, ['hitting', 'fielding', 'throwing', 'speed', 'power']), position, included);
        expect(swapped.targets.hitting).toBe(4);
        expect(swapped.targets.defense).toBe(2);
        for (let d = 0; d < 7; d++) {
          const date = new Date(2026, 5, 7 + week * 7 + d);
          const before = applyMicrocycle(template, date, baseline);
          const after = applyMicrocycle(next.template, date, next.targets);
          firstTotal += Number(before.perModality.defense.scheduled);
          changedTotal += Number(after.perModality.defense.scheduled);
          if (after.perModality.defense.scheduled && !before.perModality.defense.scheduled) {
            expect(template.perModality.defense).toContain(date.getDay());
            expect(after.perModality.defense.intensity).toBe('activation');
          }
          expect(after.perModality.strength).toEqual(before.perModality.strength);
        }
      }
      expect(firstTotal).toBe(16); expect(changedTotal).toBe(24);
      const blocks = [{ modality: 'warmup', status: 'ready' }, { modality: 'defense', status: 'ready' },
        { modality: 'strength', status: 'ready' }, { modality: 'hitting', status: 'ready' }, { modality: 'recovery', status: 'ready' }];
      expect(secondGoalFirst(blocks, projection(sport, order)).map(b => b.modality)).toEqual(['warmup', 'hitting', 'strength', 'defense', 'recovery']);
    });
  }
  it('phase, availability, injury and pitcher/youth ceilings refuse extra work without reducing baseline', () => {
    for (const extra of [{ season_phase: 'post' }, { weekly_availability_days: 1 }, { injury_history: ['knee'] }]) {
      const p = projection('baseball', order, extra);
      const baseline = { defense: 2, hitting: 3, throwing: 3, baserunning: 1 };
      expect(weeklyGoalBlocks(resolveWeeklyTemplate(p), baseline, p, 'SS', included).targets).toEqual(baseline);
    }
    const p = projection('baseball', ['throwing', 'fielding', 'hitting', 'speed', 'power']);
    const baseline = { throwing: 5, defense: 3, hitting: 4, baserunning: 2 };
    expect(weeklyGoalBlocks(resolveWeeklyTemplate(p), baseline, p, 'P', included).targets.throwing).toBe(5);
  });
  it('power never creates a lifting block and an excluded skill never receives a boost', () => {
    const p = projection('baseball', ['power', 'hitting', 'throwing', 'fielding', 'speed']);
    const template = resolveWeeklyTemplate(p);
    expect(weeklyGoalBlocks(template, { hitting: 3 }, p, 'SS', included).template).toBe(template);
    expect(weeklyGoalBlocks(template, { defense: 2 }, projection('baseball', order), 'SS', new Set(['throwing'])).targets.defense).toBe(2);
  });
  it('counts existing lift and sprint days against weekly availability before adding a skill block', () => {
    const p = projection('baseball', order, { weekly_availability_days: 3 });
    const original = resolveWeeklyTemplate(p);
    const template = { ...original, perModality: { ...original.perModality,
      defense: [1, 2, 3] as const, hitting: [1, 2, 3] as const,
      strength: [4] as const, speed: [5] as const },
      priorityDayOrder: { ...original.priorityDayOrder, defense: [1, 2, 3] as const, hitting: [1, 2, 3] as const } };
    const baseline = { defense: 2, hitting: 3 };
    const skillOnly = weeklyGoalBlocks(template, baseline, p, 'SS', new Set(['defense', 'hitting']));
    expect(skillOnly.targets.defense).toBe(3);
    const fullWeek = weeklyGoalBlocks(template, baseline, p, 'SS', new Set(['defense', 'hitting', 'strength', 'speed']));
    expect(fullWeek.targets).toEqual(baseline);
    expect(fullWeek.template).toBe(template);
  });
});