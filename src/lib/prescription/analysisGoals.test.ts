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
});