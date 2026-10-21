import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('coach snapshot sport authority', () => {
  it('the hosted function definition requires canonical athlete sport before selecting a dated snapshot', () => {
    const sql = readFileSync('drizzle/migrations/0089_coach_plan_canonical_sport.sql', 'utf8');
    expect(sql).toMatch(/JOIN public\.athlete_context c ON c\.user_id = s\.user_id AND c\.sport_primary = s\.sport/);
    expect(sql).toMatch(/public\._coach_training_access\(_athlete\)/);
    expect(sql).toMatch(/public\.resolve_recruiting_scope\(_athlete, 'health'\)/);
  });
});