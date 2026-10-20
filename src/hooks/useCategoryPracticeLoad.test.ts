import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), query: vi.fn(), user: { id: 'player' } }));
vi.mock('@tanstack/react-query', () => ({ useQuery: mocks.query }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
import { useCategoryPracticeLoad } from './useCategoryPracticeLoad';
function source(data: unknown[] = [], error: unknown = null) {
  const c = { select: vi.fn(), eq: vi.fn(), gte: vi.fn(), lt: vi.fn(), is: vi.fn(), contains: vi.fn(), limit: vi.fn() };
  for (const method of [c.select, c.eq, c.gte, c.lt, c.is, c.contains]) method.mockReturnValue(c);
  c.limit.mockResolvedValue({ data, error });
  return c;
}
beforeEach(() => { vi.clearAllMocks(); mocks.query.mockImplementation(options => options); });
describe('actual weekly practice source wiring', () => {
  it('both reads scope to self, selected sport and the preceding seven calendar dates', async () => {
    const sessions = source([{ id: 'real', session_date: '2026-10-19', sport: 'softball', module: 'fielding', session_type: 'team_session' }]);
    const logs = source([{ id: 'log', plan_date: '2026-10-18', duration_seconds_completed: 2400, rpe: 8, metrics: { modality: 'hitting' } }]);
    mocks.from.mockReturnValueOnce(sessions).mockReturnValueOnce(logs);
    const query = useCategoryPracticeLoad('softball', '2026-10-20') as unknown as { queryKey: unknown[]; queryFn: () => Promise<unknown> };
    expect(query.queryKey).toEqual(['category-practice-load', 'player', 'softball', '2026-10-20']);
    expect(await query.queryFn()).toEqual([
      { id: 'performance:real', date: '2026-10-19', sport: 'softball', category: 'fielding', minutes: null, intensity: null },
      { id: 'wk:log', date: '2026-10-18', sport: 'softball', category: 'hitting', minutes: 40, intensity: 8 },
    ]);
    for (const c of [sessions, logs]) { expect(c.eq).toHaveBeenCalledWith('user_id', 'player'); expect(c.limit).toHaveBeenCalledWith(1000); }
    expect(sessions.eq).toHaveBeenCalledWith('sport', 'softball');
    expect(sessions.gte).toHaveBeenCalledWith('session_date', '2026-10-13');
    expect(sessions.lt).toHaveBeenCalledWith('session_date', '2026-10-20');
    expect(sessions.is).toHaveBeenCalledWith('deleted_at', null);
    expect(logs.contains).toHaveBeenCalledWith('metrics', { kind: 'practice', sport: 'softball' });
    expect(logs.gte).toHaveBeenCalledWith('plan_date', '2026-10-13');
    expect(logs.lt).toHaveBeenCalledWith('plan_date', '2026-10-20');
  });
  for (const failed of ['sessions', 'logs']) it(`${failed}: errors and capped histories propagate instead of returning invented zero load`, async () => {
    for (const capped of [false, true]) {
      const bad = source(capped ? Array(1000).fill({}) : [], capped ? null : new Error('read failed'));
      mocks.from.mockReturnValueOnce(failed === 'sessions' ? bad : source()).mockReturnValueOnce(failed === 'logs' ? bad : source());
      const query = useCategoryPracticeLoad('baseball', '2026-10-20') as unknown as { queryFn: () => Promise<unknown> };
      await expect(query.queryFn()).rejects.toThrow();
    }
  });
});