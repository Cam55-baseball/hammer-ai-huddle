import { render, waitFor, cleanup } from '@testing-library/react';
import { afterEach, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DevelopThisWeek } from './DevelopThisWeek';
const state = vi.hoisted(() => ({ error: false, calls: [] as string[] }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'self' } }) }));
vi.mock('@/contexts/SportThemeContext', () => ({ useSportTheme: () => ({ sport: 'baseball' }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  state.calls.push(table);
  const q: Record<string, unknown> = {};
  for (const method of ['select','eq','gte','lte','order']) q[method] = () => q;
  q.then = (resolve: (data: unknown) => unknown) => Promise.resolve({ data: [{ plan_date: '2026-10-27', sport: 'baseball', payload: { blocks: [{ status: 'ready', title: 'Hitting', drills: [{ name: 'Saved tee work', dosage: '10 swings' }] }] } }], error: state.error ? new Error('failed') : null }).then(resolve);
  return q;
} } }));
afterEach(() => { cleanup(); vi.useRealTimers(); state.error = false; state.calls = []; });
function mount() { vi.setSystemTime(new Date('2026-10-27T12:00:00')); return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><DevelopThisWeek /></QueryClientProvider>); }
it('reads saved work without invoking a generator or evidence recommender', async () => {
  const view = mount();
  await waitFor(() => expect(view.getByText('Saved tee work · 10 swings')).toBeInTheDocument());
  expect(state.calls).toEqual(['athlete_plan_snapshots']);
});
it('does not display saved work after a source failure', async () => {
  state.error = true; const view = mount();
  await waitFor(() => expect(view.getByRole('alert')).toBeVisible());
  expect(view.queryByText('Saved tee work · 10 swings')).toBeNull();
});