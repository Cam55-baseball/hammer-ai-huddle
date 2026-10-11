import { describe, it, expect } from 'vitest';
import { describeRequest } from '../Requests';

describe('Requests inbox wording', () => {
  it('incoming coach request names the coach', () => {
    expect(describeRequest({ kind: 'coach_player', incoming: true, other_name: 'Sam', org_name: null, team_name: null }))
      .toBe('Sam wants to connect as your coach');
  });
  it('incoming team join names player and team', () => {
    expect(describeRequest({ kind: 'org_player', incoming: true, other_name: 'Ava', org_name: 'Hawks', team_name: '14U' }))
      .toBe('Ava — player on 14U (Hawks)');
  });
});
