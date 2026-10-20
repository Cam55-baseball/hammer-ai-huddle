import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoyalTimingReminder } from './RoyalTimingReminder';

const state = vi.hoisted(() => ({
  enabled: true, subscribed: true, sport: 'softball',
  query: { data: [] as string[] | undefined, error: null as Error | null },
  options: {} as { enabled?: boolean; queryKey?: unknown[]; queryFn?: () => Promise<unknown> },
  eq: vi.fn(),
}));
vi.mock('@tanstack/react-query', () => ({ useQuery: (options: typeof state.options) => { state.options = options; return state.query; } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'test-player' } }) }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: () => ({ subscribed: state.subscribed, loading: false }) }));
vi.mock('@/hooks/useFeatureSwitches', () => ({ useFeatureSwitches: () => ({ loading: false, isEnabled: () => state.enabled }) }));
vi.mock('@/contexts/SportThemeContext', () => ({ useSportTheme: () => ({ sport: state.sport }) }));
vi.mock('@/hooks/usePitcherSchedule', () => ({ localIso: () => '2026-10-20' }));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ select: () => ({ eq: state.eq }) }) } }));

describe('Royal timing reminder adapter', () => {
  beforeEach(() => {
    state.enabled = true; state.subscribed = true; state.query = { data: [], error: null };
    state.eq.mockReset();
  });
  it('never reads on a day without the prescribed skill', () => {
    render(<RoyalTimingReminder skillToday={false} />);
    expect(state.options.enabled).toBe(false);
  });
  it('never reads behind an OFF switch or without subscription', () => {
    state.enabled = false;
    const view = render(<RoyalTimingReminder skillToday />);
    expect(state.options.enabled).toBe(false);
    state.enabled = true; state.subscribed = false; view.rerender(<RoyalTimingReminder skillToday />);
    expect(state.options.enabled).toBe(false);
  });
  it('reads only the signed-in player and selected sport', async () => {
    state.eq.mockReturnValueOnce({ eq: state.eq }).mockResolvedValueOnce({ data: [{ updated_at: null, created_at: '2026-10-01' }], error: null });
    render(<RoyalTimingReminder skillToday />);
    expect(state.options.queryKey).toEqual(['royal-timing-reminder', 'test-player', 'softball']);
    expect(await state.options.queryFn?.()).toEqual(['2026-10-01']);
    expect(state.eq.mock.calls).toEqual([['user_id', 'test-player'], ['sport', 'softball']]);
  });
  it('does not render a due card when history fails', () => {
    state.query = { data: undefined, error: new Error('unavailable') };
    const view = render(<RoyalTimingReminder skillToday />);
    expect(view.queryByRole('region', { name: 'Royal timing reminder' })).toBeNull();
    expect(view.queryByRole('alert')).not.toBeNull();
  });
});