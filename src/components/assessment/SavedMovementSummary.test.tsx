import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
const state = vi.hoisted(() => ({ userId: 'a', doneAt: '2026-01-01T12:00:00Z', update: vi.fn(), eq: vi.fn(), invalidate: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: state.userId } }) }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: { movement_screen: { history: { current_pain: 'yes' } }, movement_done_at: state.doneAt }, error: null, isPending: false }), useQueryClient: () => ({ invalidateQueries: state.invalidate }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ update: state.update }) } }));
vi.mock('@/lib/assessment/movementSummary', () => ({ movementSummary: () => [] .concat({ key: 'shoulder_ir', name: 'Shoulder', left: null, right: null } as any) }));
vi.mock('./MovementScreenForm', () => ({ MovementScreenForm: ({ value, onChange }: any) => <button onClick={() => onChange({ ...value, observations: Object.fromEntries(movementGroups.flatMap(g => [...g.items]).map(i => [i.key, { leftStatus: 'controlled', rightStatus: 'controlled', left: '17' }])) })}>Enter complete test screen</button> }));
vi.mock('@/components/hammer/ReportInjuryDialog', () => ({ ReportInjuryDialog: () => null }));
import { movementGroups } from '@/lib/assessment/movementScreen';
import { SavedMovementSummary } from './SavedMovementSummary';
beforeEach(() => {
  vi.clearAllMocks(); state.userId = 'a'; state.doneAt = '2026-01-01T12:00:00Z';
  state.update.mockImplementation((patch: any) => ({ eq: (...args: any[]) => { state.eq(...args); return { select: () => ({ single: async () => ({ data: { movement_done_at: patch.movement_done_at }, error: null }) }) }; } }));
});
describe('re-screen draft ownership', () => {
  it('does not carry a self draft into another account', () => {
    const view = render(<SavedMovementSummary />);
    fireEvent.click(screen.getByRole('button', { name: 'Re-check movement & safety' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enter complete test screen' }));
    state.userId = 'b'; view.rerender(<SavedMovementSummary />);
    expect(screen.queryByRole('button', { name: 'Save movement check' })).toBeNull();
    expect(state.update).not.toHaveBeenCalled();
  });
  it('does not carry a self draft through a coach view and back', () => {
    const view = render(<SavedMovementSummary />);
    fireEvent.click(screen.getByRole('button', { name: 'Re-check movement & safety' }));
    view.rerender(<SavedMovementSummary athleteId="other" />);
    expect(screen.queryByRole('button', { name: 'Save movement check' })).toBeNull();
    view.rerender(<SavedMovementSummary />);
    expect(screen.queryByRole('button', { name: 'Save movement check' })).toBeNull();
  });
  it('invalidates a draft after its canonical screen date changes', () => {
    const view = render(<SavedMovementSummary />);
    fireEvent.click(screen.getByRole('button', { name: 'Re-check movement & safety' }));
    state.doneAt = '2026-02-01T12:00:00Z'; view.rerender(<SavedMovementSummary />);
    expect(screen.queryByRole('button', { name: 'Save movement check' })).toBeNull();
  });
  it('saves complete same-owner entries to the same assessment without clearing pain history', async () => {
    render(<SavedMovementSummary />);
    fireEvent.click(screen.getByRole('button', { name: 'Re-check movement & safety' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enter complete test screen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save movement check' }));
    await waitFor(() => expect(state.invalidate).toHaveBeenCalledTimes(2));
    expect(state.eq).toHaveBeenCalledWith('user_id', 'a');
    expect(state.update.mock.calls[0][0]).toMatchObject({ pain_flag: true, movement_screen: { history: { current_pain: 'yes' }, observations: { shoulder_ir: { left: '17', rightStatus: 'controlled' } } } });
  });
});