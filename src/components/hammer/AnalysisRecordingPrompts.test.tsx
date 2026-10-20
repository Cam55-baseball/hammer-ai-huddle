import { fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalysisRecordingPrompts } from './AnalysisRecordingPrompts';
const state = vi.hoisted(() => ({
  modules: ['softball_5tool'], loading: false, enabled: true,
  options: {} as { enabled?: boolean; queryKey?: unknown[] }, navigate: vi.fn(),
}));
vi.mock('@tanstack/react-query', () => ({ useQuery: (options: typeof state.options) => { state.options = options; return { data: {}, isLoading: false }; } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'test-player' } }) }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: () => ({ modules: state.modules, loading: state.loading }) }));
vi.mock('@/hooks/useFeatureSwitches', () => ({ useFeatureSwitches: () => ({ loading: false, isEnabled: () => state.enabled }) }));
vi.mock('@/contexts/SportThemeContext', () => ({ useSportTheme: () => ({ sport: 'softball' }) }));
vi.mock('@/hooks/usePitcherSchedule', () => ({ localIso: () => '2026-10-20' }));
vi.mock('react-router-dom', () => ({ useNavigate: () => state.navigate }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
describe('analysis adapter goal and entitlement wiring', () => {
  beforeEach(() => { state.modules = ['softball_5tool']; state.loading = false; state.enabled = true; state.navigate.mockReset(); });
  it('goal order selects the matching real module destination', () => {
    const view = render(<AnalysisRecordingPrompts prescribed={['hitting', 'throwing']} goalOrder={['throwing', 'hitting']} />);
    fireEvent.click(view.getByRole('button'));
    expect(state.navigate).toHaveBeenLastCalledWith('/analyze/throwing?sport=softball');
    view.rerender(<AnalysisRecordingPrompts prescribed={['hitting', 'throwing']} goalOrder={['hitting', 'throwing']} />);
    fireEvent.click(view.getByRole('button'));
    expect(state.navigate).toHaveBeenLastCalledWith('/analyze/hitting?sport=softball');
  });
  it('never reads without a prescribed included skill', () => {
    render(<AnalysisRecordingPrompts prescribed={['pitching']} />);
    expect(state.options.enabled).toBe(false);
  });
  it('waits for subscription and OFF switch never reads', () => {
    state.loading = true;
    const view = render(<AnalysisRecordingPrompts prescribed={['hitting']} />);
    expect(state.options.enabled).toBe(false);
    state.loading = false; state.enabled = false; view.rerender(<AnalysisRecordingPrompts prescribed={['hitting']} />);
    expect(state.options.enabled).toBe(false);
  });
  it('another sport cannot unlock a reminder', () => {
    state.modules = ['baseball_5tool'];
    render(<AnalysisRecordingPrompts prescribed={['hitting']} />);
    expect(state.options.enabled).toBe(false);
    expect(state.options.queryKey).toEqual(['analysis-recording-prompts', 'test-player', 'softball', '']);
  });
});