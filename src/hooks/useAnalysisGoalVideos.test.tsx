import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const state = vi.hoisted(() => ({
  goals: { userId: 'athlete-a' as string | null, matches: [] as any[], isPending: false, error: null as Error | null, goalError: null as Error | null },
  profile: { profile: { position: 'SS' }, loading: false, error: null as Error | null },
  library: { data: [] as any[], isPending: false, error: null as Error | null },
  query: vi.fn(),
}));
vi.mock('./useAnalysisGoalDrills', () => ({ useAnalysisGoalDrills: () => state.goals }));
vi.mock('./useUserProfile', () => ({ useUserProfile: () => state.profile }));
vi.mock('@tanstack/react-query', () => ({ useQuery: (options: unknown) => { state.query(options); return state.library; } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));
import { useAnalysisGoalVideos } from './useAnalysisGoalVideos';

beforeEach(() => {
  vi.clearAllMocks();
  state.goals = { userId: 'athlete-a', matches: [{ drill: { libraryVideoId: 'video-a' }, reasons: ['Your goal: Barrel control'] }], isPending: false, error: null, goalError: null };
  state.profile = { profile: { position: 'SS' }, loading: false, error: null };
  state.library = { data: [{ id: 'video-a', title: 'Instruction', video_url: 'https://example.test/video.mp4', sport: ['baseball'], skill_domains: ['hitting'] }], isPending: false, error: null };
});

describe('goal videos require successful eligibility reads', () => {
  it('resolves a current successful attached video', () => {
    const { result } = renderHook(() => useAnalysisGoalVideos('hitting', 'baseball'));
    expect(result.current.suggestions.map(pick => pick.video.id)).toEqual(['video-a']);
  });
  it.each(['profile', 'library', 'goals'] as const)('withholds cached picks after a %s read error', source => {
    const error = new Error(`${source} unavailable`);
    state[source].error = error;
    const { result } = renderHook(() => useAnalysisGoalVideos('hitting', 'baseball'));
    expect(result.current.error).toBe(error);
    expect(result.current.suggestions).toEqual([]);
  });
  it('withholds picks while the profile is pending', () => {
    state.profile.loading = true;
    const { result } = renderHook(() => useAnalysisGoalVideos('hitting', 'baseball'));
    expect(result.current.isPending).toBe(true);
    expect(result.current.suggestions).toEqual([]);
  });
  it('keys accounts independently and withholds prior cached picks when signed out', () => {
    const hook = renderHook(() => useAnalysisGoalVideos('hitting', 'baseball'));
    state.goals.userId = 'athlete-b'; state.goals.matches = []; hook.rerender();
    expect(state.query.mock.lastCall?.[0].queryKey[1]).toBe('athlete-b');
    expect(hook.result.current.suggestions).toEqual([]);
    state.goals.userId = null;
    state.goals.matches = [{ drill: { libraryVideoId: 'video-a' }, reasons: [] }]; hook.rerender();
    expect(state.query.mock.lastCall?.[0].enabled).toBe(false);
    expect(hook.result.current.suggestions).toEqual([]);
  });
});