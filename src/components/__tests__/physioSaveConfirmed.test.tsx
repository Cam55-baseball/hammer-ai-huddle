// Owner Nov 6: the guided health setup's real save path confirms when the database
// echoes the row back (timestamps return as "+00:00", not "Z").
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PhysioHealthIntakeDialog } from "../physio/PhysioHealthIntakeDialog";

const state = vi.hoisted(() => ({ sent: [] as Record<string, unknown>[], dob: '2000-01-01' }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 'test-health' } }) }));
vi.mock('@/hooks/useAthleteGoals', () => ({ useAthleteGoals: () => ({ activeGoal: null, loading: false, createGoal: vi.fn(async () => true), updateGoal: vi.fn() }) }));
vi.mock('@/lib/hammer/injury/recordPain', () => ({ recordPain: vi.fn(async () => undefined) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  let row: Record<string, unknown> | null = null;
  const q: any = { select: () => q, eq: () => q, limit: () => q,
    maybeSingle: async () => ({ data: table === 'profiles' ? { date_of_birth: state.dob } : null, error: null }),
    upsert: (r: Record<string, unknown>) => { state.sent.push(r); row = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'string' && /T.*Z$/.test(v) ? v.replace('Z', '+00:00') : v])); return q; },
    single: async () => ({ data: { id: 'row', ...row }, error: null }) };
  return q;
} } }));

async function walk(pain: boolean, fill: boolean) {
  const close = vi.fn();
  render(<QueryClientProvider client={new QueryClient()}><PhysioHealthIntakeDialog open onOpenChange={close} /></QueryClientProvider>);
  fireEvent.click(await screen.findByRole('button', { name: 'Next' }));
  if (fill) { fireEvent.change(screen.getByLabelText('Food allergies'), { target: { value: 'peanuts' } }); fireEvent.change(screen.getByLabelText('Foods you avoid'), { target: { value: 'dairy' } }); }
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  if (fill) fireEvent.change(screen.getByLabelText('Meals per day'), { target: { value: '4' } });
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('button', { name: pain ? 'Yes' : 'No' }));
  if (pain) fireEvent.click(screen.getAllByRole('button').find(b => /knee/i.test(b.textContent ?? ''))!);
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  if (fill) fireEvent.change(screen.getByLabelText('Past injury note'), { target: { value: 'ankle sprain last year' } });
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  if (fill) fireEvent.change(screen.getByLabelText('Medicines'), { target: { value: 'albuterol' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save health setup' }));
  await waitFor(() => expect(close).toHaveBeenCalledWith(false));
  expect(screen.queryByText(/not confirmed/)).toBeNull();
}

describe('guided health setup — save confirms', () => {
  beforeEach(() => { state.sent = []; });
  it('adult, every optional answer, pain yes', async () => {
    state.dob = '2000-01-01';
    await walk(true, true);
    expect(state.sent[0]).toMatchObject({ allergies: ['peanuts'], food_intolerances: ['dairy'], medications: ['albuterol'], meals_per_day: 4, setup_completed: true, current_pain_answer: true, injury_history: ['ankle sprain last year'] });
  });
  it('under-18, no optional answers, pain no', async () => {
    state.dob = '2011-03-01';
    await walk(false, false);
    expect(state.sent[0]).toMatchObject({ allergies: [], meals_per_day: null, setup_completed: true, current_pain_answer: false, current_pain_area: null });
  });
});
