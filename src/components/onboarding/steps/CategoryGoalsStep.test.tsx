import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CategoryGoalsStep } from './CategoryGoalsStep';

const state = vi.hoisted(() => ({ raw: null as unknown, writes: [] as any[], success: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'test-picker' } }) }));
vi.mock('@/contexts/SideContext', () => ({ useSideContext: () => ({ isSwitchHitter: false, isAmbidextrousThrower: false }) }));
vi.mock('sonner', () => ({ toast: { success: state.success, error: vi.fn() } }));
vi.mock('@/lib/onboarding/draftStore', () => ({ readDraftSlot: async () => null, writeDraftSlot: vi.fn(), clearDraftSlot: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({
  select: () => ({ eq: () => ({
    maybeSingle: async () => ({ data: { category_goals: state.raw, sport_primary: 'baseball', position_primary: 'CF' }, error: null }),
    single: async () => ({ data: { category_goals: state.raw }, error: null }),
  }) }),
  upsert: async (value: any) => { state.writes.push(value); state.raw = value.category_goals; return { error: null }; },
}) } }));
beforeEach(() => { state.raw = null; state.writes = []; state.success.mockReset(); });
afterEach(cleanup);
it('the actual editor saves two ranked picks and all category priorities together', async () => {
  render(<MemoryRouter><QueryClientProvider client={new QueryClient()}><CategoryGoalsStep onContinue={vi.fn()} /></QueryClientProvider></MemoryRouter>);
  const barrel = await screen.findByRole('button', { name: /Barrel control/ });
  await waitFor(() => expect(barrel.hasAttribute('disabled')).toBe(false));
  fireEvent.click(barrel);
  fireEvent.click(screen.getByRole('button', { name: /^Plate discipline/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Make Plate discipline primary' }));
  for (const category of ['Hitting', 'Fielding', 'Throwing', 'Speed', 'Power']) {
    fireEvent.click(screen.getByRole('button', { name: `${category} priority` }));
  }
  fireEvent.click(screen.getByRole('button', { name: 'Save & continue' }));
  await waitFor(() => expect(state.success).toHaveBeenCalledTimes(1));
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0].category_goals.baseball.position.hitting).toEqual([
    { id: 'plate_discipline', rank: 'primary' }, { id: 'barrel_control', rank: 'secondary' },
  ]);
  expect(state.writes[0].category_goals.categoryOrder).toEqual(['hitting', 'fielding', 'throwing', 'speed', 'power']);
});
it('an older saved fielding goal can be removed so two current fielding goals can be picked and ranked', async () => {
  state.raw = { version: 2, baseball: { position: { fielding: [{ id: 'first_step', rank: 'primary' }, { id: 'range', rank: 'secondary' }] } } };
  render(<MemoryRouter><QueryClientProvider client={new QueryClient()}><CategoryGoalsStep onContinue={vi.fn()} /></QueryClientProvider></MemoryRouter>);
  const older = await screen.findByRole('button', { name: /First-step read \(older goal\)/ });
  await waitFor(() => expect(older.hasAttribute('disabled')).toBe(false));
  fireEvent.click(older);
  fireEvent.click(screen.getByRole('button', { name: /^Improve footwork/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Make Improve footwork primary' }));
  for (const category of ['Fielding', 'Hitting', 'Throwing', 'Speed', 'Power']) {
    fireEvent.click(screen.getByRole('button', { name: `${category} priority` }));
  }
  fireEvent.click(screen.getByRole('button', { name: 'Save & continue' }));
  await waitFor(() => expect(state.success).toHaveBeenCalledTimes(1));
  expect(state.writes[0].category_goals.baseball.position.fielding).toEqual([
    { id: 'footwork', rank: 'primary' }, { id: 'range', rank: 'secondary' },
  ]);
});
