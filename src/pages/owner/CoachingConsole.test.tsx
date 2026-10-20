import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CoachingConsole from './CoachingConsole';
import { OWNER_QUESTIONS, questionSituation } from '@/lib/intelligence/ownerQuestions';
import type { Principle, PrincipleVersion } from '@/lib/intelligence/principles';

const state = vi.hoisted(() => ({ principles: [] as Principle[], versions: [] as PrincipleVersion[],
  saves: [] as Record<string, unknown>[], fail: false }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: (table: string) => ({ select: () => ({ order: async () => ({
    data: table === 'coaching_principles' ? state.principles : state.versions, error: null,
  }) }) }),
  rpc: async (name: string, args?: Record<string, unknown>) => {
    if (name === 'owner_principle_population_stats') return { data: [], error: null };
    expect(name).toBe('owner_save_principle');
    if (state.fail) throw new Error('offline');
    if (!args) throw new Error('missing args');
    state.saves.push(args);
    const previous = state.principles.find(p => p.id === args._principle);
    const id = previous?.id ?? 'saved-principle';
    const next = (previous?.current_version ?? 0) + 1;
    state.principles = [...state.principles.filter(p => p.id !== id), { id, active: previous?.active ?? true, current_version: next }];
    state.versions = [...state.versions, { id: `saved-v${next}`, principle_id: id, version: next,
      body: String(args._body), sport: String(args._sport), area: String(args._area), situation: String(args._situation),
      applies_when: String(args._applies_when), not_when: String(args._not_when), connected_work: null,
      evidence_kind: 'experience', evidence_note: String(args._evidence_note), created_at: '2026-10-20T17:15:00Z' }];
    return { data: id, error: null };
  },
} }));
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><CoachingConsole /></MemoryRouter></QueryClientProvider>);
}
describe('owner question actual form save and declared version readback', () => {
  beforeEach(() => { state.principles = []; state.versions = []; state.saves = []; state.fail = false; window.scrollTo = vi.fn(); });
  afterEach(cleanup);
  it('selected answer saves exact question identity, then editing appends and retains the old version', async () => {
    mount();
    const questions = await screen.findByRole('region', { name: 'Questions for the owner' });
    await waitFor(() => expect(within(questions).getAllByRole('button', { name: OWNER_QUESTIONS[0].options[0] })).toHaveLength(6));
    fireEvent.click(within(questions).getAllByRole('button', { name: OWNER_QUESTIONS[0].options[0] })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Save principle' }));
    await waitFor(() => expect(state.versions).toHaveLength(1));
    await waitFor(() => expect(within(questions).getByText(`Current answer: ${OWNER_QUESTIONS[0].options[0]}`)).toBeTruthy());
    expect(state.saves[0]).toMatchObject({ _principle: null, _sport: 'baseball', _area: 'mechanics', _situation: questionSituation(OWNER_QUESTIONS[0].id) });
    const old = structuredClone(state.versions[0]);
    fireEvent.click(within(questions).getAllByRole('button', { name: 'Write my answer' })[0]);
    fireEvent.change(screen.getByLabelText('Principle'), { target: { value: 'Keep every existing safety rule.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save new version' }));
    await waitFor(() => expect(within(questions).getByText('Current answer: Keep every existing safety rule.')).toBeTruthy());
    expect(state.saves[1]._principle).toBe('saved-principle');
    expect(state.versions[0]).toEqual(old);
    expect(state.principles[0].current_version).toBe(2);
  });
  it('the principle list and edit form use declared current, not a higher stray version', async () => {
    const q = OWNER_QUESTIONS[0];
    state.principles = [{ id: 'p', active: false, current_version: 1 }];
    const v: PrincipleVersion = { id: 'v1', principle_id: 'p', version: 1, body: 'Declared answer', sport: q.sport, area: q.area,
      situation: questionSituation(q.id), applies_when: null, not_when: null, connected_work: null,
      evidence_kind: 'experience', evidence_note: null, created_at: '2026-10-20T17:15:00Z' };
    state.versions = [v, { ...v, id: 'v9', version: 9, body: 'Uncommitted future answer' }];
    mount();
    await screen.findByText('Current answer: Declared answer');
    const list = screen.getByRole('region', { name: 'Your principles' });
    fireEvent.click(within(list).getByRole('button', { name: 'Edit' }));
    expect((screen.getByLabelText('Principle') as HTMLTextAreaElement).value).toBe('Declared answer');
    expect(state.principles[0].active).toBe(false);
    expect(state.saves).toHaveLength(0);
  });
  it('a rejected save retains the draft, adds no version and can retry', async () => {
    state.fail = true; mount();
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Write my answer' })).toHaveLength(6));
    fireEvent.click(screen.getAllByRole('button', { name: 'Write my answer' })[0]);
    fireEvent.change(screen.getByLabelText('Principle'), { target: { value: 'My saved review' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save principle' }));
    await screen.findByRole('alert');
    expect(state.versions).toHaveLength(0);
    expect((screen.getByLabelText('Principle') as HTMLTextAreaElement).value).toBe('My saved review');
    state.fail = false; fireEvent.click(screen.getByRole('button', { name: 'Save principle' }));
    await screen.findByText('Current answer: My saved review');
    expect(state.versions).toHaveLength(1);
  });
});