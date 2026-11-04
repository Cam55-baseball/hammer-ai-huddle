import { describe, it, expect } from 'vitest';
import { groupMembers } from '../OrganizationMemberList';

describe('organization connections grouping (owner Nov 4 #3)', () => {
  it('a coach added to an org appears under Coaches, players under Athletes', () => {
    const g = Object.fromEntries(groupMembers([
      { id: 'c', role_in_org: 'coach' }, { id: 'a', role_in_org: 'admin' }, { id: 'p', role_in_org: 'player' },
    ]));
    expect(g.Coaches.map((r: any) => r.id)).toEqual(['c', 'a']);
    expect(g.Athletes.map((r: any) => r.id)).toEqual(['p']);
    expect(g.Staff).toBeUndefined();
  });
});
