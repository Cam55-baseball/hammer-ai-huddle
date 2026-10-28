import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ userId: 'first' as string | null, query: vi.fn(), from: vi.fn(), error: null as Error | null }));
vi.mock('@/hooks/useDrillCirculation', () => ({ useDrillCirculation: () => ({ userId: mocks.userId, catalog: [], ready: true, error: null }) }));
vi.mock('@tanstack/react-query', () => ({ useQuery: mocks.query }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
import { useAnalysisGoalDrills } from './useAnalysisGoalDrills';
beforeEach(() => { vi.clearAllMocks(); mocks.userId = 'first'; mocks.query.mockReturnValue({ data: [], isPending: false, isError: false, error: null }); });
describe('one self-scoped analysis goal reader', () => {
  it('keys each account and sport separately and disables anonymous reads', () => {
    const hook = renderHook(() => useAnalysisGoalDrills('hitting', 'baseball'));
    expect(mocks.query.mock.lastCall?.[0].queryKey).toEqual(['analysis-saved-goals', 'first', 'hitting', 'baseball']);
    mocks.userId = 'second'; hook.rerender();
    expect(mocks.query.mock.lastCall?.[0].queryKey[1]).toBe('second');
    mocks.userId = null; hook.rerender();
    expect(mocks.query.mock.lastCall?.[0].enabled).toBe(false);
  });
  it('surfaces errors rather than treating failed reads as no goals', () => {
    const error = new Error('read failed');
    mocks.query.mockReturnValue({ data: [], isPending: false, isError: true, error });
    const { result } = renderHook(() => useAnalysisGoalDrills('hitting', 'baseball'));
    expect(result.current.goalError).toBe(error);
    expect(result.current.matches).toEqual([]);
  });
  it('reads only the current athlete context', async () => {
    const eq = vi.fn(); const chain = { select: vi.fn(), eq, maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
    chain.select.mockReturnValue(chain); eq.mockReturnValue(chain); mocks.from.mockReturnValue(chain);
    renderHook(() => useAnalysisGoalDrills('hitting', 'baseball'));
    await mocks.query.mock.lastCall?.[0].queryFn();
    expect(mocks.from).toHaveBeenCalledWith('athlete_context');
    expect(eq).toHaveBeenCalledWith('user_id', 'first');
  });
});