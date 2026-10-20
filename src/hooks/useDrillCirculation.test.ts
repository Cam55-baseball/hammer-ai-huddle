import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ user: { id: 'first' } as { id: string } | null,
  query: vi.fn(), from: vi.fn(), rpc: vi.fn(), cache: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useOptionalAuth: () => ({ user: mocks.user }) }));
vi.mock('@tanstack/react-query', () => ({ useQuery: mocks.query, useQueryClient: () => ({ setQueryData: mocks.cache }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from, rpc: mocks.rpc } }));
import { useDrillCirculation } from './useDrillCirculation';
const empty = { rows: [], usage: {}, served: {}, completedOn: {} };
beforeEach(() => { vi.clearAllMocks(); mocks.user = { id: 'first' }; mocks.query.mockReturnValue({ data: empty, isSuccess: true, error: null }); });
describe('self-owned drill history', () => {
  it('switching accounts uses a distinct key and never exposes old circulation while new reads load', () => {
    mocks.query.mockReturnValueOnce({ data: { ...empty, served: { oldDrill: 7 } }, isSuccess: true, error: null });
    const hook = renderHook(() => useDrillCirculation());
    expect(hook.result.current.circulation.servedToUser).toEqual({ oldDrill: 7 });
    expect(mocks.query.mock.calls[0][0].queryKey).toEqual(['drill-circulation', 'first']);
    mocks.user = { id: 'second' };
    mocks.query.mockReturnValue({ data: undefined, isSuccess: false, error: null });
    hook.rerender();
    expect(mocks.query.mock.lastCall?.[0].queryKey).toEqual(['drill-circulation', 'second']);
    expect(hook.result.current.circulation.servedToUser).toEqual({});
    expect(hook.result.current.catalog).toEqual([]);
    expect(hook.result.current.ready).toBe(false);
  });
  it('failed refresh blocks new prescriptions even if stale catalog data is cached', () => {
    const error = new Error('read failed');
    mocks.query.mockReturnValue({ data: { ...empty, served: { old: 5 } }, isSuccess: false, error });
    const { result } = renderHook(() => useDrillCirculation());
    expect(result.current.error).toBe(error);
    expect(result.current.catalog).toEqual([]);
    expect(result.current.historyCatalog).toEqual([]);
    expect(result.current.circulation).toEqual({ servedToUser: {}, usage: {} });
  });
  it('actual read keeps inactive owner overrides and scopes engagement to self', async () => {
    const chain = () => {
      const c = { select: vi.fn(), eq: vi.fn(), in: vi.fn(), limit: vi.fn().mockResolvedValue({ data: [], error: null }) };
      c.select.mockReturnValue(c); c.eq.mockReturnValue(c); c.in.mockReturnValue(c); return c;
    };
    const owner = chain(), events = chain();
    mocks.from.mockReturnValueOnce(owner).mockReturnValueOnce(events);
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    renderHook(() => useDrillCirculation());
    await expect(mocks.query.mock.calls[0][0].queryFn()).resolves.toEqual(empty);
    expect(owner.eq).not.toHaveBeenCalled();
    expect(events.eq).toHaveBeenCalledWith('user_id', 'first');
    expect(events.in).toHaveBeenCalledWith('event', ['served', 'completed']);
  });
});