import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const state = vi.hoisted(() => ({ sport: 'baseball' as 'baseball' | 'softball', reads: [] as { table: string; filters: Record<string, unknown> }[] }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'athlete-self' } }) }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: () => ({ modules: ['baseball_pitcher', 'softball_5tool'] }) }));
vi.mock('@/hooks/useRecapCountdown', () => ({ useRecapCountdown: () => ({ loading: false, canGenerateRecap: false, hasMissedRecap: false }) }));
vi.mock('@/contexts/SportThemeContext', () => ({ useSportTheme: () => ({ sport: state.sport }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  const filters: Record<string, unknown> = {};
  const chain = {
    select: () => chain, eq: (key: string, value: unknown) => { filters[key] = value; return chain; },
    order: () => chain, limit: () => chain, maybeSingle: () => chain,
    then: (resolve: (result: unknown) => unknown) => {
      state.reads.push({ table, filters: { ...filters } });
      // Only baseball has a saved, locked test. Softball has no baseline.
      const data = table === 'vault_performance_tests'
        ? filters.sport === 'baseball' ? [{ next_entry_date: '2099-01-01' }] : []
        : table === 'vault_weekly_wellness_quiz' ? { id: 'weekly' } : [{ next_entry_date: '2099-01-01', next_prompt_date: '2099-01-01' }];
      return Promise.resolve({ data, error: null }).then(resolve);
    },
  };
  return chain;
} } }));

import { useScheduledPriorityTasks } from './useScheduledPriorityTasks';

describe('scheduled prompt sport history', () => {
  beforeEach(() => { state.reads.length = 0; });
  it('switching sport reads separate performance history; baseball lock cannot hide softball baseline', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    state.sport = 'baseball';
    const hook = renderHook(() => useScheduledPriorityTasks(), { wrapper });
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    expect(hook.result.current.tasks.some(task => task.id === 'performance')).toBe(false);
    state.sport = 'softball'; hook.rerender();
    await waitFor(() => expect(hook.result.current.tasks.some(task => task.id === 'performance')).toBe(true));
    expect(state.reads.filter(read => read.table === 'vault_performance_tests').map(read => read.filters)).toEqual([
      { user_id: 'athlete-self', sport: 'baseball' }, { user_id: 'athlete-self', sport: 'softball' },
    ]);
    client.clear();
  });
});