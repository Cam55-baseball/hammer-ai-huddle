import { describe, expect, it } from 'vitest';
import { buildHammerDailyPlan } from './dailyPlan';
import { NORMAL_SIGNAL } from './scheduleContext';
import type { ContextVariable, HammerAthleteContext } from '../context/athleteContext';

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
});