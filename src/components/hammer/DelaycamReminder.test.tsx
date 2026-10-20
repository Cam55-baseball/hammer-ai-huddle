import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DelaycamReminder } from './DelaycamReminder';

const state = vi.hoisted(() => ({
  enabled: true, modules: ['softball_5tool'],
  query: { data: [] as string[] | undefined, error: null as Error | null },
  mechanics: { data: false as boolean | undefined, error: null as Error | null },
  options: {} as { enabled?: boolean; queryKey?: unknown[]; queryFn?: () => Promise<unknown> },
  mechanicsOptions: {} as { enabled?: boolean; queryKey?: unknown[]; queryFn?: () => Promise<unknown> },
  eq: vi.fn(), not: vi.fn(), reportEq: vi.fn(), findingEq: vi.fn(), limit: vi.fn(), in: vi.fn(),
}));
vi.mock('@tanstack/react-query', () => ({ useQuery: (options: typeof state.options) => {
  if (options.queryKey?.[0] === 'delaycam-mechanics') { state.mechanicsOptions = options; return state.mechanics; }
  state.options = options; return state.query;
} }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'test-player' } }) }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: () => ({ modules: state.modules, loading: false }) }));
vi.mock('@/hooks/useFeatureSwitches', () => ({ useFeatureSwitches: () => ({ loading: false, isEnabled: () => state.enabled }) }));
vi.mock('@/contexts/SportThemeContext', () => ({ useSportTheme: () => ({ sport: 'softball' }) }));
vi.mock('@/hooks/usePitcherSchedule', () => ({ localIso: () => '2026-10-20' }));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => ({ select: () => ({
  eq: table === 'videos' ? state.reportEq : table === 'analysis_fault_findings' ? state.findingEq : state.eq,
}) }) } }));

describe('Delaycam canonical reminder eligibility', () => {
  beforeEach(() => {
    state.enabled = true; state.modules = ['softball_5tool']; state.query = { data: [], error: null };
    state.mechanics = { data: false, error: null };
    state.eq.mockReset().mockReturnValue({ eq: state.eq, not: state.not });
    state.not.mockReset().mockResolvedValue({ data: [{ ended_at: '2026-10-10' }], error: null });
    state.reportEq.mockReset().mockReturnValue({ eq: state.reportEq, order: () => ({ limit: state.limit }) });
    state.findingEq.mockReset().mockReturnValue({ eq: state.findingEq, in: state.in });
    state.limit.mockReset().mockResolvedValue({ data: [1,2,3,4,5].map(n => ({ id: `clip-${n}`, sport: 'softball', module: 'hitting', created_at: `2026-10-${10+n}` })), error: null });
    state.in.mockReset().mockResolvedValue({ data: [1,2,3].map(n => ({ video_id: `clip-${n}`, sport: 'softball', skill_domain: 'hitting', fault_key: 'early_shoulder_rotation', correction_key: 'keep_hands_back', movement_key: null })), error: null });
  });
  it('does not read on an off day or behind the OFF switch', () => {
    const view = render(<DelaycamReminder skillToday={false} offSeason={false} />);
    expect(state.options.enabled).toBe(false);
    state.enabled = false; view.rerender(<DelaycamReminder skillToday offSeason />);
    expect(state.options.enabled).toBe(false);
  });
  it('another sport or pitching-only access cannot unlock hitting reminders', () => {
    state.modules = ['baseball_5tool'];
    const view = render(<DelaycamReminder skillToday offSeason />);
    expect(state.options.enabled).toBe(false);
    state.modules = ['softball_pitcher']; view.rerender(<DelaycamReminder skillToday offSeason />);
    expect(state.options.enabled).toBe(false);
  });
  it('reads this player, this sport and hitting, using the recording date', async () => {
    render(<DelaycamReminder skillToday offSeason />);
    expect(state.options.enabled).toBe(true);
    expect(await state.options.queryFn?.()).toEqual(['2026-10-10']);
    expect(state.eq.mock.calls).toEqual([['user_id', 'test-player'], ['sport', 'softball'], ['module', 'hitting']]);
    expect(state.not.mock.calls).toEqual([['ended_at', 'is', null]]);
  });
  it('history failure cannot count as missing completion', () => {
    state.query = { data: undefined, error: new Error('unavailable') };
    const view = render(<DelaycamReminder skillToday offSeason />);
    expect(view.queryByRole('region', { name: 'Delaycam reminder' })).toBeNull();
    expect(view.queryByRole('alert')).not.toBeNull();
  });
  it('same-day completion suppresses the prompt', () => {
    state.query.data = ['2026-10-20T10:00:00Z'];
    const view = render(<DelaycamReminder skillToday offSeason />);
    expect(view.queryByRole('region', { name: 'Delaycam reminder' })).toBeNull();
  });
  it('reads distinct completed hitting reports and exact sport-scoped mechanical findings', async () => {
    render(<DelaycamReminder skillToday offSeason={false} />);
    expect(await state.mechanicsOptions.queryFn?.()).toBe(true);
    expect(state.reportEq.mock.calls).toEqual([['user_id', 'test-player'], ['sport', 'softball'], ['module', 'hitting'], ['status', 'completed']]);
    expect(state.limit).toHaveBeenCalledWith(5);
    expect(state.findingEq.mock.calls).toEqual([['user_id', 'test-player'], ['sport', 'softball'], ['skill_domain', 'hitting']]);
    expect(state.in).toHaveBeenCalledWith('video_id', ['clip-1','clip-2','clip-3','clip-4','clip-5']);
  });
  it('repeated mechanics can make an in-season reminder due after one recent use', () => {
    state.query.data = ['2026-10-18'];
    const view = render(<DelaycamReminder skillToday offSeason={false} />);
    expect(view.queryByRole('region', { name: 'Delaycam reminder' })).toBeNull();
    state.mechanics.data = true;
    view.rerender(<DelaycamReminder skillToday offSeason={false} />);
    expect(view.queryByRole('region', { name: 'Delaycam reminder' })).not.toBeNull();
  });
  it('unknown or failed analysis history cannot invent normal cadence', () => {
    state.mechanics.data = undefined;
    const view = render(<DelaycamReminder skillToday offSeason={false} />);
    expect(view.queryByRole('region', { name: 'Delaycam reminder' })).toBeNull();
    state.mechanics.error = new Error('unavailable');
    view.rerender(<DelaycamReminder skillToday offSeason={false} />);
    expect(view.queryByRole('alert')).not.toBeNull();
    expect(view.queryByRole('region', { name: 'Delaycam reminder' })).toBeNull();
  });
});