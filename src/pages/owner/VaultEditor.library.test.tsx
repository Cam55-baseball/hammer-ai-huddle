import { render, fireEvent, screen, cleanup, act } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import VaultEditor from './VaultEditor';

const invoke = vi.hoisted(() => vi.fn(async () => ({ data: {}, error: null })));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke }, from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [] }) }) }) }) }) }) } }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({}), useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock('@/hooks/useVideoLibrary', () => ({ useVideoLibrary: () => ({ videos: [{ id: 'v1', title: 'Owner demo', video_url: 'https://example.org/demo.mp4' }], loading: false, hasMore: false, loadMore: vi.fn() }) }));
vi.mock('@/components/hammer/cards/ExerciseVideo', () => ({ ExerciseVideo: () => null }));
afterEach(cleanup);
it('library choice uses the existing Vault video field in the actual draft save', async () => {
  render(<VaultEditor isNew slug="" base={{ name: 'Test', category: null, sport_scope: null, min_age_years: null, season_eligibility: null, equipment: [], default_sets: 2, default_reps: 5, dosage_unit: null }} baseHowTo="One rep is a controlled reach." onClose={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Owner demo' }));
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save draft' })));
  expect(invoke).toHaveBeenCalledWith('exercise-vault', expect.objectContaining({ body: expect.objectContaining({ action: 'save_draft', payload: expect.objectContaining({ video_url: 'https://example.org/demo.mp4', default_sets: 2, default_reps: 5 }) }) }));
});