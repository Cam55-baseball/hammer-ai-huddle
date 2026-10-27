import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LongTermVideoSuggestions } from './LongTermVideoSuggestions';

const state = vi.hoisted(() => ({ failure: false, calls: [] as string[], received: [] as unknown[] }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'self' } }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  const q: Record<string, unknown> = {};
  for (const method of ['select','eq','is','gte','order','limit']) q[method] = (...args: unknown[]) => { state.calls.push(`${table}:${method}:${args.join(',')}`); return q; };
  const result = () => table === 'hie_snapshots' ? { data: { sport: 'baseball', weakness_clusters: [] }, error: null } : { data: [{ sport: 'baseball', module: 'hitting' }, { sport: 'softball', module: 'pitching' }], error: state.failure ? new Error('read failed') : null };
  q.maybeSingle = () => Promise.resolve(result());
  q.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve);
  return q;
} } }));
vi.mock('@/lib/analysisToTaxonomy', () => ({ moduleToSkillDomain: () => 'hitting', aggregateWeaknessClustersToTaxonomy: (_: unknown, __: unknown, sessions: unknown[]) => { state.received = sessions; return { movementPatterns: [], resultTags: [], contextTags: [] }; } }));
vi.mock('@/components/video-suggestions/VideoSuggestionsPanel', () => ({ VideoSuggestionsPanel: () => null }));
afterEach(() => { cleanup(); state.calls = []; state.received = []; state.failure = false; });
function mount() { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LongTermVideoSuggestions /></QueryClientProvider>); }
describe('canonical recent-session evidence', () => {
  it('excludes deleted sessions at the source and opposite-sport evidence before aggregation', async () => {
    mount();
    await waitFor(() => expect(state.received).toEqual([{ sport: 'baseball', module: 'hitting' }]));
    expect(state.calls).toContain('performance_sessions:is:deleted_at,');
    expect(state.calls).not.toContain('hie_snapshots:is:deleted_at,');
  });
  it('shows source-read failure rather than treating it as empty evidence', async () => {
    state.failure = true;
    const view = mount();
    await waitFor(() => expect(view.getByRole('alert')).toBeVisible());
    expect(state.received).toEqual([]);
  });
});