import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
const state = vi.hoisted(() => ({ userId: 'a', writeError: null as Error | null, readError: null as Error | null, read: null as null | (() => Promise<any>), write: null as null | (() => Promise<any>), insert: vi.fn(), remove: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: state.userId } }) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({
  select: () => ({ eq: () => ({ in: async () => state.read ? state.read() : ({ data: [], error: state.readError }) }) }),
  insert: async (row: unknown) => { state.insert(row); return state.write ? state.write() : { error: state.writeError }; },
  delete: () => ({ eq: () => ({ eq: async () => { state.remove(); return { error: state.writeError }; } }) }),
}) } }));
import { useVideoFaultFeedback } from './useVideoFaultFeedback';
const ctx = { skillDomain: 'hitting', faultTagKey: null, faultTagLayer: null, source: 'analysis_recommendation' } as const;
beforeEach(() => { vi.clearAllMocks(); state.userId = 'a'; state.writeError = null; state.readError = null; state.read = null; state.write = null; });
describe('confirmed video feedback saves', () => {
  it('blocks writes while the canonical read is pending', async () => {
    state.read = () => new Promise(() => {});
    const hook = renderHook(() => useVideoFaultFeedback(['v']));
    await act(async () => { expect(await hook.result.current.toggleSave('v', ctx)).toBe(false); });
    expect(state.insert).not.toHaveBeenCalled();
    expect(hook.result.current.canRecord).toBe(false);
  });
  it('blocks writes when canonical flags could not be read', async () => {
    state.readError = new Error('read denied');
    const hook = renderHook(() => useVideoFaultFeedback(['v']));
    await act(async () => {});
    await act(async () => { expect(await hook.result.current.toggleSave('v', ctx)).toBe(false); });
    expect(state.insert).not.toHaveBeenCalled();
    expect(hook.result.current.canRecord).toBe(false);
  });
  it('does not duplicate concurrent writes or lose another confirmed video', async () => {
    let finish: ((value: any) => void) | undefined;
    state.write = () => new Promise(resolve => { finish = resolve; });
    const hook = renderHook(() => useVideoFaultFeedback(['v', 'w']));
    await act(async () => {});
    await act(async () => {
      const first = hook.result.current.toggleSave('v', ctx);
      expect(await hook.result.current.toggleSave('v', ctx)).toBe(false);
      state.write = null;
      await hook.result.current.toggleSave('w', ctx);
      finish?.({ error: null });
      await first;
    });
    expect(state.insert).toHaveBeenCalledTimes(2);
    expect(hook.result.current.isSaved('v')).toBe(true);
    expect(hook.result.current.isSaved('w')).toBe(true);
    expect(state.insert.mock.calls[0][0]).toMatchObject({ fault_tag_key: null, fault_tag_layer: null });
  });
  it('does not grant saved state when the canonical insert fails', async () => {
    state.writeError = new Error('save rejected');
    const hook = renderHook(() => useVideoFaultFeedback(['v']));
    await act(async () => {});
    await act(async () => { await hook.result.current.toggleSave('v', ctx); });
    expect(hook.result.current.isSaved('v')).toBe(false);
  });
  it('retains saved state when removal fails', async () => {
    const hook = renderHook(() => useVideoFaultFeedback(['v']));
    await act(async () => {});
    await act(async () => { await hook.result.current.toggleSave('v', ctx); });
    expect(hook.result.current.isSaved('v')).toBe(true);
    state.writeError = new Error('delete rejected');
    await act(async () => { await hook.result.current.toggleSave('v', ctx); });
    expect(hook.result.current.isSaved('v')).toBe(true);
  });
  it('does not borrow another account saved flags', async () => {
    const hook = renderHook(() => useVideoFaultFeedback(['v']));
    await act(async () => {});
    await act(async () => { await hook.result.current.toggleSave('v', ctx); });
    state.userId = 'b'; hook.rerender();
    await waitFor(() => expect(hook.result.current.isSaved('v')).toBe(false));
  });
});