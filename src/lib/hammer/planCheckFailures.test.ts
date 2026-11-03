import { describe, it, expect, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) } } }));
import { readFileSync } from 'node:fs';
import { logPlanCheckFailure, summarizePlanCheckFailures, PLAN_CHECK_RETRIES } from './planCheckFailures';
import { BYS_ITEMS } from './beforeYouStartImportance';

describe('couldn\'t-check failures (Option A)', () => {
  it('a failed lookup is logged for the owner with who, which check and the error', async () => {
    const inserted: unknown[] = [];
    const client = { from: (t: string) => ({ insert: async (row: unknown) => { inserted.push({ t, row }); return {}; } }) };
    expect(await logPlanCheckFailure('practice_history', new Error('timeout'), client)).toBe(true);
    expect(inserted).toEqual([{ t: 'plan_check_failures', row: { user_id: 'u1', check_key: 'practice_history', error: 'timeout' } }]);
  });
  it('owner summary reads in plain words with counts', () => {
    const rows = ['a', 'b', 'c', 'a'].map(u => ({ user_id: u, check_key: 'practice_history', created_at: '2026-11-03T10:00:00Z', error: 'x' }));
    const s = summarizePlanCheckFailures(rows, '2026-11-03').find(x => x.check === 'practice_history')!;
    expect(s.line).toBe('Practice-history check failed for 3 players today (4 failures in the last 7 days)');
  });
  it('the player plan shows nothing for failed lookups', () => {
    const src = readFileSync('src/components/hammer/HammerDailyPlan.tsx', 'utf8');
    expect(src).not.toMatch(/Couldn't check your (analysis history|drill choices|logged practice workload)/);
    expect(readFileSync('src/components/analyze/AnalysisPrescriptionSection.tsx', 'utf8')).not.toMatch(/Couldn't check your drill choices/);
  });
  it('check_errors is gone from the importance list; retries stay quiet', () => {
    expect(BYS_ITEMS.some(i => (i.id as string) === 'check_errors')).toBe(false);
    expect(PLAN_CHECK_RETRIES).toBeGreaterThanOrEqual(1);
  });
});
