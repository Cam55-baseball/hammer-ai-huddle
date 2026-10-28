import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
const state = vi.hoisted(() => ({ userId: 'a', writeError: null as Error | null, insert: vi.fn(), remove: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: state.userId } }) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({
  select: () => ({ eq: () => ({ in: async () => ({ data: [], error: null }) }) }),
  insert: async (row: unknown) => { state.insert(row); return { error: state.writeError }; },
  delete: () => ({ eq: () => ({ eq: async () => { state.remove(); return { error: state.writeError }; } }) }),
}) } }));
import { useVideoFaultFeedback } from './useVideoFaultFeedback';
const ctx = { skillDomain: 'hitting', faultTagKey: null, faultTagLayer: null, source: 'analysis_recommendation' } as const;
beforeEach(() => { vi.clearAllMocks(); state.userId = 'a'; state.writeError = null; });
describe('confirmed video feedback saves', () => {
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