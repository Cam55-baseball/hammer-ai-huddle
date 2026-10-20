import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RankGoalsPromptCard } from './RankGoalsPromptCard';
import { CATEGORY_KEYS, CATEGORY_LABELS, normalizeCategoryGoals } from '@/lib/hammer/goals/categoryGoals';

const state = vi.hoisted(() => ({
  raw: null as Record<string, unknown> | null,
  writes: [] as Array<{ user_id: string; category_goals: Record<string, unknown> }>,
  fail: false, thrown: false, reads: 0, invoke: vi.fn(),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'test-goal-player' } }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  functions: { invoke: state.invoke },
  from: (table: string) => {
    expect(table).toBe('athlete_context');
    return {
      select: () => ({ eq: (key: string, id: string) => {
        expect([key, id]).toEqual(['user_id', 'test-goal-player']);
        return { maybeSingle: async () => { state.reads++; return { data: { category_goals: state.raw }, error: null }; } };
      } }),
      upsert: async (value: typeof state.writes[number], options: unknown) => {
        expect(options).toEqual({ onConflict: 'user_id' });
        if (state.thrown) throw new Error('network unavailable');
        if (state.fail) return { error: { message: 'write failed' } };
        state.writes.push(value); state.raw = value.category_goals;
        return { error: null };
      },
    };
  },
} }));

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const view = render(<QueryClientProvider client={client}><RankGoalsPromptCard /></QueryClientProvider>);
  return { ...view, client, invalidate };
}

describe('real goal confirmation save and canonical readback', () => {
  beforeEach(() => {
    localStorage.clear(); state.writes = []; state.fail = false; state.thrown = false; state.reads = 0;
    state.invoke.mockReset();
    state.raw = { version: 2, categoryOrder: [...CATEGORY_KEYS], updatedAt: '2020-01-01T23:59:00Z',
      baseball: { position: { hitting: [{ id: 'barrel_control', rank: 'primary' }] } },
      softball: { position: { fielding: [{ id: 'first_step', rank: 'primary' }] } } };
  });
  afterEach(cleanup);

  it('confirms the existing order, preserves both sports and reads it back without rebuilding the plan', async () => {
    const previous = structuredClone(state.raw);
    const before = Date.now();
    const { client, invalidate } = mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Keep my order' }));
    await waitFor(() => expect(screen.queryByTestId('rank-goals-prompt')).toBeNull());
    expect(state.writes).toHaveLength(1);
    expect(state.writes[0].user_id).toBe('test-goal-player');
    expect(state.raw?.baseball).toEqual(previous?.baseball);
    expect(state.raw?.softball).toEqual(previous?.softball);
    expect(Date.parse(String(state.raw?.updatedAt))).toBeGreaterThanOrEqual(before);
    expect(normalizeCategoryGoals(state.raw)?.goals.map(goal => goal.category)).toEqual(CATEGORY_KEYS);
    expect(client.getQueryData(['goal-ranking', 'test-goal-player'])).toMatchObject({ ranked: [...CATEGORY_KEYS], raw: state.raw });
    expect(state.reads).toBeGreaterThan(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['hammer-context-envelope', 'test-goal-player'] });
    expect(state.invoke).not.toHaveBeenCalled();
  });

  it('a changed legacy ranking reaches canonical planning and retains entered intents and notes', async () => {
    state.raw = { version: 1, categoryOrder: [...CATEGORY_KEYS], updatedAt: '2020-01-01',
      goals: CATEGORY_KEYS.map((category, index) => ({ category, rank: index + 1,
        intent: category === 'hitting' ? 'bat_speed' : null, notes: category === 'hitting' ? 'saved preference' : null })) };
    mount();
    await screen.findByRole('button', { name: 'Keep my order' });
    const reverse = [...CATEGORY_KEYS].reverse();
    for (const category of reverse) fireEvent.click(screen.getByRole('button', { name: CATEGORY_LABELS[category] }));
    fireEvent.click(screen.getByRole('button', { name: 'Save my order' }));
    await waitFor(() => expect(screen.queryByTestId('rank-goals-prompt')).toBeNull());
    const readback = normalizeCategoryGoals(state.raw);
    expect(readback?.goals.map(goal => goal.category)).toEqual(reverse);
    expect(readback?.goals.find(goal => goal.category === 'hitting')).toMatchObject({ intent: 'bat_speed', notes: 'saved preference', rank: 2 });
    expect(state.raw?.categoryOrder).toEqual(reverse);
  });

  it.each(['returned', 'thrown'])('failed %s writes leave the old confirmation and allow retry', async mode => {
    const previous = structuredClone(state.raw);
    state.fail = mode === 'returned'; state.thrown = mode === 'thrown';
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Keep my order' }));
    await screen.findByRole('alert');
    expect(state.raw).toEqual(previous);
    expect(state.writes).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Keep my order' }).hasAttribute('disabled')).toBe(false);
    state.fail = false; state.thrown = false;
    fireEvent.click(screen.getByRole('button', { name: 'Keep my order' }));
    await waitFor(() => expect(screen.queryByTestId('rank-goals-prompt')).toBeNull());
    expect(state.writes).toHaveLength(1);
  });
});