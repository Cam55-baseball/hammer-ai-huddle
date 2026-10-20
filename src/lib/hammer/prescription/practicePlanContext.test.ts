import { describe, expect, it } from 'vitest';
import { buildHammerDailyPlan } from './dailyPlan';
import { NORMAL_SIGNAL } from './scheduleContext';
import type { ContextVariable, HammerAthleteContext } from '../context/athleteContext';
import { applyPracticePlanContext, reduceDosageForPractice } from './practicePlanContext';
import { categoryPracticeLoads } from './categoryPracticeLoad';

describe('reduceDosageForPractice (owner: ~30% less, never below half the prescribed sets, whole sets, reps unchanged)', () => {
  it('cuts leading set counts by about 30% with the half-dose floor', () => {
    expect(reduceDosageForPractice('10 x 5')).toBe('7 x 5');
    expect(reduceDosageForPractice('3 x 8')).toBe('2 x 8');
    expect(reduceDosageForPractice('2 x 10')).toBe('1 x 10');
  });
  it('never goes below half the prescribed sets and never below one set', () => {
    expect(reduceDosageForPractice('1 x 10')).toBe('1 x 10');
    expect(reduceDosageForPractice('4 x 12')).toBe('3 x 12');
  });
  it('unparseable dosages stay unchanged rather than being guessed', () => {
    expect(reduceDosageForPractice('20 swings')).toBe('20 swings');
    expect(reduceDosageForPractice('3 rounds of 10')).toBe('3 rounds of 10');
    expect(reduceDosageForPractice('')).toBe('');
  });
});

const context = (sport: string): HammerAthleteContext => {
  const values = { sport_primary: sport, position_primary: 'SS', lifecycle_band: 'u18', season_phase: 'off',
    lifting_age_years: 2, weekly_availability_days: 6, development_priorities: ['hitting', 'defense'],
    injury_history: [], equipment_effective: ['field', 'glove', 'ball', 'gamer_bat', 'tee', 'net'] };
  const variables = Object.entries(values).map(([key, value]): ContextVariable => ({ key, value, label: key,
    domain: 'identity', source: 'test', confidence: 'high', missing: false, lastUpdated: null,
    lineage: { owner: 'test', source: 'test', rawConfidence: 'high' } }));
  return { variables, missing: [], missingCount: 0, isLoading: false, envelope: null,
    get<T>(key: string) { return variables.find(row => row.key === key) as ContextVariable<T> | undefined; } };
};

describe('practice history reaches the actual plan without guessed dose floors', () => {
  for (const sport of ['baseball', 'softball']) it(`${sport}: a single logged session carries exact source and missing values without claiming a reduction`, () => {
    const day = new Date(2026, 5, 4);
    const before = buildHammerDailyPlan(context(sport), NORMAL_SIGNAL, null, null, undefined, day);
    const records = [{ id: 'actual-session', date: '2026-06-03', sport, category: 'fielding', minutes: 40, intensity: null }];
    const after = buildHammerDailyPlan(context(sport), NORMAL_SIGNAL, null, null, undefined, day, { practiceRecords: records });
    const defense = after.blocks.find(block => block.modality === 'defense');
    expect(defense?.practiceContext).toEqual({ category: 'fielding', sourceIds: ['actual-session'], sessions: 1,
      minutes: 40, intensityMinutes: 0, missingMinutes: 0, missingIntensity: 1, consecutiveDays: 1, doseChanged: false });
    expect(defense?.drills).toEqual(before.blocks.find(block => block.modality === 'defense')?.drills);
    expect(defense?.because).toEqual(before.blocks.find(block => block.modality === 'defense')?.because);
    after.blocks.filter(block => block.modality !== 'defense').forEach(block => expect(block.practiceContext).toBeUndefined());
  });
  it('exact pitching route cannot consume throwing practice; closed cards and lifting stay untouched', () => {
    const plan = buildHammerDailyPlan(context('baseball'), NORMAL_SIGNAL, null, null, undefined, new Date(2026, 5, 4));
    const source = plan.blocks.find(block => block.modality === 'defense');
    expect(source).toBeDefined();
    if (!source) return;
    const pitching = { ...source, modality: 'throwing' as const, route: '/practice?module=pitching' };
    const throwing = { ...pitching, route: '/practice?module=throwing' };
    const closed = { ...pitching, status: 'off-day' as const };
    const strength = { ...source, modality: 'strength' as const };
    const loads = categoryPracticeLoads([{ id: 'pitch', date: '2026-06-03', sport: 'baseball', category: 'pitching', minutes: 30, intensity: 8 }], '2026-06-04', 'baseball');
    const result = applyPracticePlanContext([pitching, throwing, closed, strength], loads);
    expect(result[0].practiceContext?.sourceIds).toEqual(['pitch']);
    expect(result[0].practiceContext?.intensityMinutes).toBe(240);
    expect(result[0].drills).toEqual(pitching.drills);
    expect(result.slice(1)).toEqual([throwing, closed, strength]);
  });
  for (const sport of ['baseball', 'softball']) it(`${sport}: three fielding days annotate only ready fielding and preserve all work`, () => {
    const records = [1, 2, 3].map(day => ({ id: String(day), date: `2026-06-0${day}`, sport, category: 'fielding', minutes: null, intensity: null }));
    const ctx = context(sport), day = new Date(2026, 5, 4);
    const before = buildHammerDailyPlan(ctx, NORMAL_SIGNAL, null, null, undefined, day);
    const after = buildHammerDailyPlan(ctx, NORMAL_SIGNAL, null, null, undefined, day, { practiceRecords: records });
    const fielding = after.blocks.find(block => block.modality === 'defense');
    expect(fielding?.status).toBe('ready');
    expect(fielding?.because?.length).toBe(1);
    for (const block of before.blocks) {
      const next = after.blocks.find(row => row.modality === block.modality && row.side === block.side);
      expect(next?.drills).toEqual(block.drills);
      expect(next?.durationMin).toBe(block.durationMin);
      expect(next?.status).toBe(block.status);
      if (block.modality !== 'defense') expect(next?.because).toEqual(block.because);
    }
    const wrongSport = buildHammerDailyPlan(ctx, NORMAL_SIGNAL, null, null, undefined, day,
      { practiceRecords: records.map(record => ({ ...record, sport: sport === 'baseball' ? 'softball' : 'baseball' })) });
    expect(wrongSport.blocks).toEqual(before.blocks);
  });
  for (const sport of ['baseball', 'softball']) it(`${sport}: off-season hitting streak preserves full-go, logging and all other categories`, () => {
    const ctx = context(sport);
    let hittingDays = 0;
    for (let n = 0; n < 56; n++) {
      const day = new Date(2026, 5, 1 + n);
      const records = [1,2,3].map(offset => {
        const date = new Date(day); date.setDate(date.getDate() - offset);
        return { id: `${n}-${offset}`, date: date.toISOString().slice(0,10), sport, category: 'hitting', minutes: 40, intensity: 8 };
      });
      const before = buildHammerDailyPlan(ctx, NORMAL_SIGNAL, null, null, undefined, day);
      const after = buildHammerDailyPlan(ctx, NORMAL_SIGNAL, null, null, undefined, day, { practiceRecords: records });
      for (const block of before.blocks) {
        const next = after.blocks.find(row => row.modality === block.modality && row.side === block.side);
        expect(next?.drills).toEqual(block.drills);
        expect(next?.durationMin).toBe(block.durationMin);
        expect(next?.status).toBe(block.status);
        if (block.modality === 'hitting' && block.status === 'ready') {
          expect(next?.because?.length).toBe((block.because?.length ?? 0) + 1);
          expect(next?.drills.some(row => row.stage === 'full_go')).toBe(true);
          expect(next?.drills[next.drills.length - 1]?.stage).toBe('log');
          hittingDays++;
        } else expect(next).toEqual(block);
      }
    }
    expect(hittingDays).toBeGreaterThan(0);
  });
});