import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoachPlanCard } from './CoachPlanCard';
vi.mock('./CoachPlanActuals', () => ({ CoachPlanActuals: () => null }));

const state = vi.hoisted(() => ({ calls: [] as Array<{ name: string; args: Record<string, string> }>, revoked: false }));
vi.mock('@/hooks/usePitcherSchedule', () => ({ localIso: (date?: Date) => date
  ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  : '2026-10-20' }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: async (name: string, args: Record<string, string>) => {
  state.calls.push({ name, args });
  if (name === 'coach_athlete_outcomes') return { data: { state: 'ok', outcomes: [] }, error: null };
  if (state.revoked) return { data: { state: 'denied' }, error: null };
  return { data: { state: 'ok', sport: 'baseball', plan_date: args._date, health_shared: false,
    blocks: [{ modality: 'hitting', title: 'Saved hitting', durationMin: 20, status: 'ready',
      because: [], roadmapReason: 'Existing scheduled work', drills: [] }] }, error: null };
} } }));

describe('coach saved-plan scope', () => {
  beforeEach(() => { state.calls = []; state.revoked = false; });
  afterEach(cleanup);
  const mount = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const tree = (athleteId: string) => <QueryClientProvider client={client}><CoachPlanCard athleteId={athleteId} /></QueryClientProvider>;
    return { ...render(tree('test-a')), client, tree };
  };
  it('reads previous dates only after deliberate expansion, always through the same gated RPC', async () => {
    mount();
    const toggle = await screen.findByRole('button', { name: 'Saved work — last 7 days' });
    expect(state.calls.filter(call => call.name === 'coach_athlete_plan').map(call => call.args)).toEqual([{ _athlete: 'test-a', _date: '2026-10-20' }]);
    fireEvent.click(toggle);
    await waitFor(() => expect(state.calls.filter(call => call.name === 'coach_athlete_plan')).toHaveLength(7));
    expect(state.calls.filter(call => call.name === 'coach_athlete_plan').map(call => call.args._date)).toEqual([
      '2026-10-20', '2026-10-19', '2026-10-18', '2026-10-17', '2026-10-16', '2026-10-15', '2026-10-14']);
    expect(state.calls.every(call => call.args._athlete === 'test-a')).toBe(true);
  });
  it('does not carry an expanded history to a different player', async () => {
    const { rerender, tree } = mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Saved work — last 7 days' }));
    await waitFor(() => expect(state.calls.filter(call => call.name === 'coach_athlete_plan')).toHaveLength(7));
    rerender(tree('test-b'));
    await screen.findByRole('button', { name: 'Saved work — last 7 days' });
    expect(state.calls.filter(call => call.name === 'coach_athlete_plan' && call.args._athlete === 'test-b').map(call => call.args._date)).toEqual(['2026-10-20']);
  });
  it('hides all saved work when the current accepted-connection read is revoked', async () => {
    const { client } = mount();
    await screen.findByRole('button', { name: 'Saved work — last 7 days' });
    state.revoked = true;
    await client.invalidateQueries({ queryKey: ['coach-athlete-plan', 'test-a'] });
    await waitFor(() => expect(screen.queryByRole('region', { name: "Hammers' plan for this player" })).toBeNull());
  });
  it('reads exactly 42 dates including today for the current player only after opening the six-week summary', async () => {
    mount();
    const toggle = await screen.findByRole('button', { name: 'Six-week summary and practice ideas' });
    expect(state.calls.filter(call => call.name === 'coach_athlete_plan')).toHaveLength(1);
    fireEvent.click(toggle);
    await waitFor(() => expect(state.calls.filter(call => call.name === 'coach_athlete_plan')).toHaveLength(43));
    const reads = state.calls.filter(call => call.name === 'coach_athlete_plan').slice(1);
    expect(reads[0].args).toEqual({ _athlete: 'test-a', _date: '2026-10-20' });
    expect(reads[41].args).toEqual({ _athlete: 'test-a', _date: '2026-09-09' });
    expect(new Set(reads.map(call => call.args._date)).size).toBe(42);
    expect(reads.every(call => call.args._athlete === 'test-a')).toBe(true);
  });
  it('does not reuse the six-week reads for a different athlete', async () => {
    const { rerender, tree } = mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Six-week summary and practice ideas' }));
    await waitFor(() => expect(state.calls.filter(call => call.name === 'coach_athlete_plan')).toHaveLength(43));
    rerender(tree('test-b'));
    await screen.findByRole('button', { name: 'Six-week summary and practice ideas' });
    expect(state.calls.filter(call => call.name === 'coach_athlete_plan' && call.args._athlete === 'test-b')).toHaveLength(1);
  });
});