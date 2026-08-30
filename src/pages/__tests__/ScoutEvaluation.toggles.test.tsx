import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'evaluator-1' }, loading: false }),
}));
vi.mock('@/hooks/useScoutAccess', () => ({
  useScoutAccess: () => ({ canSendActivities: true, isScout: true, isCoach: false, loading: false }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/components/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
    }),
  },
}));

import ScoutEvaluation from '../ScoutEvaluation';

const renderForm = () =>
  render(
    <MemoryRouter initialEntries={['/scout-evaluation/athlete-1']}>
      <ScoutEvaluation />
    </MemoryRouter>,
  );

describe('ScoutEvaluation hand/side toggles', () => {
  beforeEach(() => vi.clearAllMocks());

  it('switch hitter toggle alone renders both labeled hitting tables', async () => {
    renderForm();
    expect(screen.queryByRole('heading', { name: 'Right-handed' })).toBeNull();
    expect(screen.queryByLabelText('Saw both sides')).toBeNull();

    fireEvent.click(screen.getByLabelText('Switch hitter'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Right-handed' })).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Left-handed' })).toBeTruthy();
    });
    // Hit / Power / Plate Discipline present on each side
    expect(screen.getAllByLabelText(/Hit Right-handed present/).length).toBe(1);
    expect(screen.getAllByLabelText(/Plate Discipline Left-handed future/).length).toBe(1);

    // Dismissing a side removes only that table
    fireEvent.click(screen.getByLabelText('Dismiss Left-handed'));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Left-handed' })).toBeNull());
    expect(screen.getByRole('heading', { name: 'Right-handed' })).toBeTruthy();
  });

  it('ambidextrous thrower toggle adds a throwing-hand picker to each position look', async () => {
    renderForm();
    expect(screen.queryByLabelText('Throwing hand for position 1')).toBeNull();
    fireEvent.click(screen.getByLabelText('Ambidextrous thrower'));
    await waitFor(() =>
      expect(screen.getByLabelText('Throwing hand for position 1')).toBeTruthy(),
    );
  });

  it('ambidextrous pitcher toggle renders a full pitching set per hand', async () => {
    renderForm();
    fireEvent.click(screen.getByLabelText('Include pitching tools'));
    await waitFor(() => expect(screen.getByLabelText('Ambidextrous pitcher')).toBeTruthy());

    fireEvent.click(screen.getByLabelText('Ambidextrous pitcher'));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Right-handed pitching' })).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Left-handed pitching' })).toBeTruthy();
    });
    expect(screen.getByLabelText('Fastball Right-handed pitching present')).toBeTruthy();
    expect(screen.getByLabelText('Pitchability Left-handed pitching future')).toBeTruthy();
    expect(screen.getByLabelText('Holding Runners Right-handed pitching present')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Dismiss Right-handed pitching'));
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Right-handed pitching' })).toBeNull(),
    );
  });
});
