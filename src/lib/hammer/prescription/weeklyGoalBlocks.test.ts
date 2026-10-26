import { describe, expect, it } from 'vitest';
import { weeklyGoalBlocks, secondGoalFirst } from './weeklyGoalBlocks';
import { projectEnvelope } from '../context/decisionFilters';
import { resolveWeeklyTemplate, applyMicrocycle } from './weeklyMicrocycle';
import { SKILL_MODALITIES, resolveSkillDaysTarget } from '../roadmap/skillFrequencyLadder';
import type { HammerAthleteContext, ContextVariable } from '../context/athleteContext';
import { priorityAccess } from '../priorityAccess';
import { entitlementsFor } from '@/constants/entitlements';
import { masteryGoalWeights } from './masteryFocus';

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
describe('judged identity selects the existing weekly goal opportunity', () => {
  for (const sport of ['baseball','softball']) it(`${sport}: eight weeks of sourced defense focus keep baseline, phase and training-day limits`, () => {
    const p=projection(sport,['hitting','fielding','throwing','speed','power']);
    const focus={observedFocus:'defense',sourceIds:['human-fielding'],reason:'Defense below standard',leftPowerStealEmphasis:false};
    const weighted={...p,categoryGoals:masteryGoalWeights(p.categoryGoals,focus)};
    const template=resolveWeeklyTemplate(p);const baseline={defense:2,hitting:3,throwing:3,baserunning:1};
    for(let week=0;week<8;week++){
      const next=weeklyGoalBlocks(template,baseline,weighted,'SS',included);
      expect(next.targets.defense).toBe(3);expect(next.targets.hitting).toBe(3);
      const original=weeklyGoalBlocks(template,baseline,p,'SS',included);
      expect(Object.values(next.targets).reduce((a,b)=>a+b,0)).toBe(Object.values(original.targets).reduce((a,b)=>a+b,0));
      for(let day=0;day<7;day++){
        const date=new Date(2026,5,7+week*7+day);
        const before=applyMicrocycle(template,date,baseline);const after=applyMicrocycle(next.template,date,next.targets);
        expect(after.perModality.strength).toEqual(before.perModality.strength);
        if(after.perModality.defense.scheduled&&!before.perModality.defense.scheduled)expect(after.perModality.defense.intensity).toBe('activation');
      }
      expect(weeklyGoalBlocks(template,baseline,weighted,'SS',new Set(['hitting'])).targets).toEqual(baseline);
    }
    expect(p.categoryGoals?.goals[0].category).toBe('hitting');
    expect(masteryGoalWeights(p.categoryGoals,{...focus,sourceIds:[]})).toBe(p.categoryGoals);
  });
});
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

  for (const sport of ['baseball', 'softball'] as const) for (const tier of ['pitcher', '5tool', 'golden2way'] as const) {
    it(`${sport}/${tier}: actual product access bounds goal blocks for all eight weeks`, () => {
      const modules = [`${sport}_${tier}`];
      const access = priorityAccess(modules, sport);
      const entitlements = entitlementsFor(modules);
      expect(access.hasHitting).toBe(entitlements.has('complete_hitter'));
      expect(access.hasPitching).toBe(entitlements.has('complete_pitcher'));
      expect(access.hasThrowing).toBe(entitlements.has('complete_player'));
      const allowed = new Set<string>(['strength', 'speed']);
      if (access.hasHitting) allowed.add('hitting');
      if (access.hasThrowing || access.hasPitching) allowed.add('throwing');
      if (access.hasThrowing) { allowed.add('defense'); allowed.add('baserunning'); }
      const position = tier === 'pitcher' ? 'P' : 'SS';
      let baseHits = 0, topHits = 0, baseDefense = 0, topDefense = 0;
      let secondFirst = 0;
      for (let week = 0; week < 8; week++) {
        const p = projection(sport, ['hitting', 'fielding', 'throwing', 'speed', 'power']);
        const baseline = Object.fromEntries(SKILL_MODALITIES.map(m => [m, resolveSkillDaysTarget('foundation', m, position)]));
        const template = resolveWeeklyTemplate(p);
        const hittingFirst = weeklyGoalBlocks(template, baseline, p, position, allowed);
        const fieldingFirst = weeklyGoalBlocks(template, baseline, projection(sport, order), position, allowed);
        for (const m of SKILL_MODALITIES) {
          expect(hittingFirst.targets[m]).toBeGreaterThanOrEqual(baseline[m]);
          expect(fieldingFirst.targets[m]).toBeGreaterThanOrEqual(baseline[m]);
          if (!allowed.has(m)) {
            expect(hittingFirst.targets[m]).toBe(baseline[m]);
            expect(fieldingFirst.targets[m]).toBe(baseline[m]);
          }
        }
        for (let day = 0; day < 7; day++) {
          const date = new Date(2026, 5, 7 + week * 7 + day);
          const base = applyMicrocycle(template, date, baseline);
          const hit = applyMicrocycle(hittingFirst.template, date, hittingFirst.targets);
          const field = applyMicrocycle(fieldingFirst.template, date, fieldingFirst.targets);
          baseHits += Number(base.perModality.hitting.scheduled);
          topHits += Number(hit.perModality.hitting.scheduled);
          baseDefense += Number(base.perModality.defense.scheduled);
          topDefense += Number(field.perModality.defense.scheduled);
          for (const after of [hit, field]) {
            expect(after.perModality.strength).toEqual(base.perModality.strength);
            for (const m of SKILL_MODALITIES) if (base.perModality[m].scheduled) expect(after.perModality[m].scheduled).toBe(true);
          }
          if (hit.perModality.hitting.scheduled && !base.perModality.hitting.scheduled) {
            expect(hit.perModality.hitting.intensity).toBe('activation');
            expect(template.perModality.hitting).toContain(day);
          }
          const blocks = SKILL_MODALITIES.filter(m => allowed.has(m) && hit.perModality[m].scheduled)
            .map(modality => ({ modality, status: 'ready' }));
          if (blocks.length > 1 && blocks.some(b => b.modality === 'defense')) {
            expect(secondGoalFirst(blocks, p)[0]?.modality).toBe('defense'); secondFirst++;
          }
        }
      }
      expect(topHits - baseHits).toBe(access.hasHitting ? 8 : 0);
      expect(topDefense - baseDefense).toBe(access.hasThrowing ? 8 : 0);
      if (access.hasThrowing) expect(secondFirst).toBeGreaterThan(0);
      else expect(secondFirst).toBe(0);
      const opposite = sport === 'baseball' ? 'softball' : 'baseball';
      expect(priorityAccess([`${opposite}_${tier}`], sport)).toEqual({ hasPitching: false, hasHitting: false, hasThrowing: false });
      const unavailable = weeklyGoalBlocks(resolveWeeklyTemplate(projection(sport, order)),
        { defense: 2 }, projection(sport, order), position, new Set(['strength', 'speed']));
      expect(unavailable.targets.defense).toBe(2);
      expect(unavailable.modality).toBeNull();
    });
  }
});