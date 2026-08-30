import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const setCriterionMandatory = { mutate: vi.fn(), isPending: false };
const addCriterion = { mutate: vi.fn(), isPending: false };
const deleteCriterion = { mutate: vi.fn(), isPending: false };
const updateStandard = { mutate: vi.fn(), isPending: false };
const createStandard = { mutate: vi.fn(), isPending: false };

const standard = {
  id: 'std-1',
  org_id: null,
  org_name: 'State U Baseball',
  label: '2027 RHP targets',
  sport: 'baseball',
  active: true,
  created_by: 'owner-1',
  created_at: new Date().toISOString(),
  recruiting_role: 'position_player' as const,
  target_positions: [] as string[],
  position_match_logic: 'any' as const,
};

const criteriaRows = [
  { id: 'c-1', standard_id: 'std-1', field: 'defense_present_grade', operator: 'gte', value: 55, is_mandatory: true },
  { id: 'c-2', standard_id: 'std-1', field: 'hit_present_grade', operator: 'gte', value: 50, is_mandatory: false },
];

vi.mock('@/components/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/recruiting/RecruiterContactCard', () => ({
  RecruiterContactCard: () => <div />,
}));
vi.mock('@/components/recruiting/StandardMatchNotificationList', () => ({
  StandardMatchNotificationList: () => <div />,
}));
vi.mock('@/hooks/useStandardMatchPings', () => ({
  useDispatchStandardMatchPings: () => ({ mutate: vi.fn(), isPending: false }),
  usePendingStandardPings: () => ({ data: [], isLoading: false }),
}));
vi.mock('@/hooks/useStandardMatchPreview', () => ({
  useStandardMatchPreview: () => ({ data: [], isLoading: false }),
  useSaveStandardMatches: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@/hooks/useOrgStandards', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useOrgStandards: () => ({
      standards: { data: [standard], isLoading: false },
      createStandard,
      updateStandard,
      deleteStandard: { mutate: vi.fn(), isPending: false },
      duplicateStandard: { mutate: vi.fn(), isPending: false },
    }),
    useStandardCriteria: () => ({
      criteria: { data: criteriaRows, isLoading: false },
      addCriterion,
      deleteCriterion,
      setCriterionMandatory,
    }),
    useStandardsCriteriaMap: () => ({ data: { 'std-1': criteriaRows }, isLoading: false }),
    useMyStandardMatches: () => ({ data: [], isLoading: false }),
  };
});

import RecruitingStandards from '../RecruitingStandards';

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/recruiting/standards']}>
      <RecruitingStandards />
    </MemoryRouter>,
  );

describe('RecruitingStandards — role/position + mandatory/preferred', () => {
  beforeEach(() => vi.clearAllMocks());

  it('New standard button reveals the creation form with role and position controls', async () => {
    renderPage();
    expect(screen.queryByLabelText('Organization')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /New standard/i }));

    await waitFor(() => expect(screen.getByLabelText('Organization')).toBeTruthy());
    expect(screen.getByText('Recruiting role')).toBeTruthy();
    expect(screen.getByText('Positions')).toBeTruthy();
    // Baseball position chips render and are togglable
    const chip = screen.getByRole('button', { name: 'SS' });
    expect(chip.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(chip);
    await waitFor(() => expect(screen.getByRole('button', { name: 'SS' }).getAttribute('aria-pressed')).toBe('true'));

    // ANY/ALL logic only appears once two positions are chosen
    expect(screen.queryByText(/When several positions are selected/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '2B' }));
    await waitFor(() => expect(screen.getByText(/When several positions are selected/i)).toBeTruthy());
  });

  it('criteria list separates mandatory from preferred and can flip a criterion', async () => {
    renderPage();
    fireEvent.click(screen.getByText(standard.label));

    // Both buckets render with their own flip control
    const makePreferred = await screen.findAllByRole('button', { name: 'Make preferred' });
    const makeMandatory = await screen.findAllByRole('button', { name: 'Make mandatory' });
    expect(makePreferred.length).toBe(1); // the one mandatory criterion
    expect(makeMandatory.length).toBe(1); // the one preferred criterion

    fireEvent.click(makePreferred[0]);
    await waitFor(() =>
      expect(setCriterionMandatory.mutate).toHaveBeenCalledWith({ id: 'c-1', is_mandatory: false }),
    );

    fireEvent.click(makeMandatory[0]);
    await waitFor(() =>
      expect(setCriterionMandatory.mutate).toHaveBeenCalledWith({ id: 'c-2', is_mandatory: true }),
    );
  });
});

