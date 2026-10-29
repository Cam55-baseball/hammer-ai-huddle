import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'player' } }) }));
const mocks = vi.hoisted(() => ({ completed: false }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  rpc: vi.fn(async (name: string) => {
    if (name !== 'initial_plan_missing') throw new Error(`Unexpected RPC: ${name}`);
    return { data: mocks.completed ? [] : [{ key: 'assessment', label: 'Complete initial assessment', href: '/initial-assessment' }], error: null };
  }),
  from: (table: string) => {
  const data = table === 'initial_assessments' ? { completed_at: mocks.completed ? '2026-10-27T23:19:00Z' : null }
    : table === 'profiles' ? { date_of_birth: '2000-01-01', hammers_today_started_at: null }
    : table === 'athlete_context' ? { sport_primary: 'softball', position_primary: 'C', competition_level: 'college', category_goals: { hitting: ['contact'] }, goal_summary: 'contact', goal_priority_rank: ['hitting'], weekly_availability_days: 6 }
    : table === 'athlete_mpi_settings' ? [{ sport: 'softball', season_status: 'off_season' }]
    : table === 'athlete_equipment_context' ? { equipment: ['glove'] } : null;
  const chain: any = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data, error: null }), then: (resolve: any) => resolve({ data, error: null }) };
  return chain;
} } }));
import { useHammersTodayStart } from './useHammersTodayStart';
afterEach(() => { cleanup(); localStorage.clear(); mocks.completed = false; });
it('rechecks missing details when canonical assessment completion resolves', async () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  const { result } = renderHook(useHammersTodayStart, { wrapper });
  await waitFor(() => expect(result.current.missing.some(item => item.key === 'assessment')).toBe(true));
  expect(result.current.assessmentReady).toBe(false);
  mocks.completed = true;
  await qc.invalidateQueries({ queryKey: ['assessment-start', 'player'] });
  await waitFor(() => expect(result.current.missing.some(item => item.key === 'assessment')).toBe(false));
  await waitFor(() => expect(result.current.assessmentReady).toBe(true));
});