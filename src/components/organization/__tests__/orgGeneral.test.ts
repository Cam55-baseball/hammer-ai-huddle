import { describe, it, expect } from 'vitest';
import { orgOverview } from '../OrganizationGeneral';

const row = (o: any) => ({ athlete_id: 'x', name: null, team_id: null, team_name: null, coach_id: null, coach_name: null, today_planned: 0, today_done: 0, week_planned: 0, week_done: 0, missed_days: 0, latest_test: null, top_alert: null, last_active: null, ...o });

describe('organization General overview (owner Nov 4 #4)', () => {
  it('counts players, coaches, teams, completion and cautions from org data', () => {
    const o = orgOverview(
      [row({ team_id: 't1', week_planned: 10, week_done: 5 }), row({ team_id: 't1', week_planned: 10, week_done: 10, missed_days: 2 }), row({ team_id: 't2', top_alert: { metric_key: 'm', kind: 'k', at: '' } })],
      [{ role_in_org: 'player' }, { role_in_org: 'player' }, { role_in_org: 'player' }, { role_in_org: 'coach' }, { role_in_org: 'admin' }],
    );
    expect(o).toEqual({ players: 3, coaches: 2, teams: 2, planned: 20, done: 15, completionPct: 75, cautions: 2 });
  });
});
