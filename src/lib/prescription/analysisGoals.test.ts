import { describe, expect, it } from 'vitest';
import { ELITE_DRILL_CATALOG } from '@/data/drills/eliteDrillCatalog';
import { categoryGoals, matchGoalDrills } from './analysisGoals';

describe('owner October 28 goal-linked library practice', () => {
  const drill = { ...ELITE_DRILL_CATALOG[0], videoUrl: 'https://example.test/owner-library.mp4' };
  it('offers an instructional library drill for a saved goal even without fault flags', () => {
    const result = matchGoalDrills([drill], ['Lower-half sequencing'], 'hitting', 'baseball');
    expect(result.map(r => r.drill.id)).toEqual([drill.id]);
    expect(result[0]?.reasons).toEqual(['Your goal: Lower-half sequencing']);
  });
  it('does not invent videos or cross skill boundaries', () => {
    expect(matchGoalDrills([{ ...drill, videoUrl: null }], ['Lower-half sequencing'], 'hitting', 'baseball')).toEqual([]);
    expect(matchGoalDrills([drill], ['Lower-half sequencing'], 'pitching', 'baseball')).toEqual([]);
  });
  it('uses only the saved category goal, never ongoing-plan actions', () => {
    expect(categoryGoals({ hitting: ['Contact Rate'], pitching: ['Command'] }, 'hitting')).toEqual(['Contact Rate']);
    expect(categoryGoals({ prescriptive_actions: ['Tex Vision'] }, 'hitting')).toEqual([]);
  });
  const saved = { version: 2, updatedAt: '2026-10-28',
    baseball: { position: { hitting: [{ id: 'barrel_control', rank: 'primary' }] },
      pitcher: { hitting: [{ id: 'two_strike_approach', rank: 'primary' }], pitching: [{ id: 'command', rank: 'primary' }] } },
    softball: { position: { hitting: [{ id: 'all_fields', rank: 'primary' }] } } };
  it('reads real sport-scoped ranked goals with canonical labels', () => {
    expect(categoryGoals(saved, 'hitting', 'baseball', 'SS')).toEqual(['Barrel control']);
    expect(categoryGoals(saved, 'hitting', 'softball', 'SS')).toEqual(['Hitting to all fields']);
  });
  it('does not combine pitcher and position-player hitting goals', () => {
    expect(categoryGoals(saved, 'hitting', 'baseball', 'P')).toEqual(['Contact Rate']);
    expect(categoryGoals(saved, 'hitting', 'baseball')).toEqual([]);
    expect(categoryGoals(saved, 'throwing', 'baseball', 'P')).toEqual([]);
  });
  it('matches barrel control only to existing current identities with media', () => {
    const entry = ELITE_DRILL_CATALOG.find(d => d.id === 'elite.hit.high_tee_plane_match');
    if (!entry) throw new Error('Missing canonical drill');
    expect(matchGoalDrills([{ ...entry, videoUrl: 'https://example.test/library.mp4' }], ['Barrel control'], 'hitting', 'baseball').map(m => m.drill.id)).toEqual([entry.id]);
    expect(matchGoalDrills([], ['Barrel control'], 'hitting', 'baseball')).toEqual([]);
    expect(matchGoalDrills([{ ...entry, videoUrl: '  ' }], ['Barrel control'], 'hitting', 'baseball')).toEqual([]);
  });
  it('never substitutes shared words for a declared goal match', () => {
    expect(matchGoalDrills([drill], ['Unrelated sequencing goal'], 'hitting', 'baseball')).toEqual([]);
    expect(matchGoalDrills([drill], ['Contact Rate'], 'hitting', 'baseball')).toEqual([]);
  });
  it('keeps canonical legacy intent labels without borrowing throwing for pitching', () => {
    const legacy = { version: 1, goals: ['speed', 'power', 'throwing', 'hitting', 'fielding'].map((category, i) => ({ category, rank: i + 1, intent: category === 'hitting' ? 'contact_quality' : null })) };
    expect(categoryGoals(legacy, 'hitting', 'baseball')).toEqual(['Hard contact']);
    expect(categoryGoals(legacy, 'pitching', 'baseball')).toEqual([]);
  });
});