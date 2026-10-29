import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ELITE_DRILL_CATALOG } from '@/data/drills/eliteDrillCatalog';
const mocks = vi.hoisted(() => ({ rows: [] as any[], writeError: null as Error | null, inserts: vi.fn() }));
vi.mock('./useAuth', () => ({ useOptionalAuth: () => ({ user: { id: 'self' } }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  if (table !== 'vault_saved_drills') throw new Error('Not the canonical saved-drill shelf');
  let inserted = false;
  const chain: any = { select: () => chain, eq: () => chain,
    insert: (payload: any) => { inserted = true; mocks.inserts(payload); return chain; },
    single: async () => ({ data: mocks.writeError ? null : { id: 'saved' }, error: mocks.writeError }),
    then: (resolve: any) => resolve({ data: inserted ? [{ id: 'saved' }] : mocks.rows, error: null }) };
  return chain;
} } }));
import { useSavedAnalysisDrills } from './useSavedAnalysisDrills';
beforeEach(() => { mocks.rows = []; mocks.writeError = null; vi.clearAllMocks(); });
const render = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return renderHook(() => useSavedAnalysisDrills('baseball'), { wrapper });
};
describe('prescribed drill hearts', () => {
  it('writes self, sport and category to the existing shelf without completion credit', async () => {
    const hook = render();
    await vi.waitFor(() => expect(hook.result.current.ready).toBe(true));
    await act(async () => { await hook.result.current.save(ELITE_DRILL_CATALOG[0]); });
    expect(mocks.inserts).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'self', sport: 'baseball', module_origin: 'hitting', drill_name: ELITE_DRILL_CATALOG[0].name }));
  });
  it('rejects failed canonical saves and does not claim a saved heart', async () => {
    mocks.writeError = new Error('save unavailable');
    const hook = render(); await vi.waitFor(() => expect(hook.result.current.ready).toBe(true));
    await act(async () => { await expect(hook.result.current.save(ELITE_DRILL_CATALOG[0])).rejects.toThrow('save unavailable'); });
    expect(hook.result.current.isSaved(ELITE_DRILL_CATALOG[0])).toBe(false);
  });
  it('does not duplicate a drill already saved in the same category and sport', async () => {
    mocks.rows = [{ drill_name: ELITE_DRILL_CATALOG[0].name, module_origin: 'hitting' }];
    const hook = render(); await vi.waitFor(() => expect(hook.result.current.ready).toBe(true));
    await act(async () => { await hook.result.current.save(ELITE_DRILL_CATALOG[0]); });
    expect(mocks.inserts).not.toHaveBeenCalled();
    expect(hook.result.current.isSaved(ELITE_DRILL_CATALOG[0])).toBe(true);
  });
});