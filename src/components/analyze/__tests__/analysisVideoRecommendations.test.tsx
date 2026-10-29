import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const state = vi.hoisted(() => ({ goals: [] as any[], faults: [] as any[], error: null as Error | null,
  save: vi.fn(), watched: vi.fn(), faultInput: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'athlete' } }) }));
vi.mock('@/hooks/useAnalysisGoalVideos', () => ({ useAnalysisGoalVideos: () => ({ suggestions: state.goals, error: state.error, isPending: false }) }));
vi.mock('@/hooks/useVideoSuggestions', () => ({ useVideoSuggestions: (input: unknown) => { state.faultInput(input); return { data: state.faults, isLoading: false }; }, trackVideoSuggestionShown: vi.fn().mockResolvedValue(null), trackVideoWatched: state.watched }));
vi.mock('@/hooks/useSeasonStatus', () => ({ useSeasonStatus: () => ({ resolvedPhase: null }) }));
vi.mock('@/hooks/useFoundationVideos', () => ({ useFoundationVideos: () => ({ results: [] }) }));
vi.mock('@/hooks/useVideoFaultFeedback', () => ({ useVideoFaultFeedback: () => ({ canRecord: true, toggleSave: state.save, isSaved: () => false, isLiked: () => false }) }));
vi.mock('@/components/video/VideoThumb', () => ({ VideoThumb: () => null }));
vi.mock('@/components/video-suggestions/InformationalVideos', () => ({ InformationalVideos: () => null }));
vi.mock('@/components/video/VideoLightbox', () => ({ VideoLightbox: ({ video }: any) => video ? <div role="dialog">{video.id} {video.video_url}</div> : null }));
import { AnalysisVideoRecommendations } from '../AnalysisVideoRecommendations';
const video = { id: 'canonical-video', title: 'Barrel instruction', video_url: 'https://example.test/current.mp4', thumbnail_url: null };
const open = () => render(<MemoryRouter><AnalysisVideoRecommendations analysis={{}} module="hitting" sport="baseball" /></MemoryRouter>);
describe('goal shelf stays independent of clip faults', () => {
  it('shows a clean-clip goal video and uses canonical playback/save with no fault attribution', () => {
    state.goals = [{ video, reasons: ['Your goal: Barrel control'] }]; state.faults = []; state.error = null;
    state.watched.mockResolvedValue(null);
    open();
    expect(screen.getByRole('region', { name: 'Videos for saved goals' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Watch' }));
    expect(screen.getByRole('dialog').textContent).toContain('canonical-video https://example.test/current.mp4');
    fireEvent.click(screen.getByRole('button', { name: 'Save Barrel instruction for later' }));
    expect(state.save).toHaveBeenCalledWith('canonical-video', expect.objectContaining({ faultTagKey: null, faultTagLayer: null }));
    expect(state.faultInput.mock.lastCall?.[0].correctionTags).toEqual([]);
  });
  it('keeps a real fault video available when the independent goal read fails', () => {
    state.goals = []; state.error = new Error('read failed');
    state.faults = [{ video, reasons: ['Clip finding'], relevance: 'correction', faultScope: ['early_shoulder_rotation'] }];
    render(<MemoryRouter><AnalysisVideoRecommendations analysis={{ violations_detected: { early_shoulder_rotation: true } }} module="hitting" sport="baseball" /></MemoryRouter>);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Barrel instruction')).toBeTruthy();
  });
});