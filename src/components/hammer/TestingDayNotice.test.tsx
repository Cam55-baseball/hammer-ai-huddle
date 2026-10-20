import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { format } from 'date-fns';
import { TestingDayNotice } from './TestingDayNotice';

const state = vi.hoisted(() => ({
  userId: 'test-athlete', rows: [] as Array<{ id: string; scheduled_for: string; status: string; tests: string[] }>,
  fail: false, missing: false, scopes: [] as Array<Array<[string, string]>>,
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: state.userId } }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  expect(table).toBe('testing_days');
  return { select: (fields: string) => {
    expect(fields).toBe('id,scheduled_for,status,tests');
    const scope: Array<[string, string]> = [];
    state.scopes.push(scope);
    return { eq: (key: string, value: string) => {
      scope.push([key, value]);
      return { eq: async (dateKey: string, date: string) => {
        scope.push([dateKey, date]);
        return { data: state.missing ? null : state.rows, error: state.fail ? new Error('unavailable') : null };
      } };
    } };
  } };
} } }));

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const tree = () => <QueryClientProvider client={client}><MemoryRouter><Routes>
    <Route path="/" element={<TestingDayNotice />} />
    <Route path="/my-connections" element={<p>Connections destination</p>} />
  </Routes></MemoryRouter></QueryClientProvider>;
  return { ...render(tree()), client, tree };
}

describe('read-only athlete testing-day details', () => {
  beforeEach(() => {
    state.userId = 'test-athlete'; state.fail = false; state.missing = false; state.scopes = [];
    state.rows = [{ id: 'day-a', scheduled_for: format(new Date(), 'yyyy-MM-dd'), status: 'scheduled', tests: ['60-yard sprint', 'Jump'] }];
  });
  afterEach(cleanup);

  it('reads only self and today, opens actual test details and reaches the existing contact page without result entry', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Testing-day details' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getAllByRole('listitem').map(item => item.textContent)).toEqual(['60-yard sprint', 'Jump']);
    expect(within(dialog).queryByRole('textbox')).toBeNull();
    expect(state.scopes).toEqual([[['athlete_id', 'test-athlete'], ['scheduled_for', format(new Date(), 'yyyy-MM-dd')]]]);
    fireEvent.click(within(dialog).getByRole('button', { name: 'My coach and organization' }));
    await screen.findByText('Connections destination');
  });

  it('closes details when the canonical day is cancelled on refresh', async () => {
    const { client } = mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Testing-day details' }));
    state.rows = [{ ...state.rows[0], status: 'skipped' }];
    await client.invalidateQueries({ queryKey: ['testing-day-notice', state.userId] });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByTestId('testing-day-notice')).toBeNull();
  });

  it('does not display one player’s open details after account changes', async () => {
    const { rerender, tree } = mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Testing-day details' }));
    state.userId = 'test-athlete-b';
    state.rows = [{ ...state.rows[0], id: 'day-b', tests: ['Throw speed'] }];
    rerender(tree());
    await screen.findByTestId('testing-day-notice');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(state.scopes[state.scopes.length - 1]?.[0]).toEqual(['athlete_id', 'test-athlete-b']);
  });

  it.each(['failed', 'missing'])('a %s refresh hides stale details and shows a source error', async mode => {
    const { client } = mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Testing-day details' }));
    state.fail = mode === 'failed'; state.missing = mode === 'missing';
    await client.invalidateQueries({ queryKey: ['testing-day-notice', state.userId] });
    await screen.findByRole('alert');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});