import { describe, it, expect } from 'vitest';
import { splitRoster } from '../AssignAthletesCard';

describe('assign screen roster split', () => {
  it('only players are assignable; staff are coach choices', () => {
    const r = splitRoster([
      { user_id: '1', full_name: 'A', role_in_org: 'player', assigned_coaches: [] },
      { user_id: '2', full_name: 'B', role_in_org: 'coach', assigned_coaches: [] },
      { user_id: '3', full_name: 'C', role_in_org: 'scout', assigned_coaches: [] },
    ]);
    expect(r.athletes.map((x) => x.user_id)).toEqual(['1']);
    expect(r.coaches.map((x) => x.user_id)).toEqual(['2']);
  });
});
