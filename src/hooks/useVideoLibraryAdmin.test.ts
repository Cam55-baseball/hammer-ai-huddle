import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ prepare: vi.fn(), upload: vi.fn(), insert: vi.fn(), rpc: vi.fn(), toast: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));
vi.mock('@/lib/upload/prepareLibraryVideo', () => ({ prepareLibraryVideo: mocks.prepare }));
vi.mock('@/data/videoLimits', () => ({ validateVideoFile: () => ({ valid: true }), VIDEO_LIMITS: {} }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  storage: { from: () => ({ upload: mocks.upload, getPublicUrl: (path: string) => ({ data: { publicUrl: `https://example.org/${path}` } }) }) },
  from: () => ({ insert: (payload: unknown) => { mocks.insert(payload); return { select: () => ({ single: async () => ({ data: { id: 'saved' }, error: null }) }) }; } }),
  rpc: mocks.rpc,
} }));
import { useVideoLibraryAdmin } from './useVideoLibraryAdmin';
afterEach(() => { cleanup(); vi.resetAllMocks(); });
describe('library upload and replacement share playable asset preparation', () => {
  it('stores the converted MP4 rather than the original MOV for new uploads', async () => {
    const original = new File(['source'], 'source.mov', { type: 'video/quicktime' });
    const prepared = new File(['playable'], 'source.mp4', { type: 'video/mp4' });
    mocks.prepare.mockResolvedValue(prepared); mocks.upload.mockResolvedValue({ error: null });
    const { result } = renderHook(useVideoLibraryAdmin);
    await act(async () => { await result.current.uploadVideo({ title: 'Teaching', tags: [], sport: ['baseball'], videoFile: original, videoType: 'upload' }); });
    expect(mocks.prepare).toHaveBeenCalledWith(original);
    expect(mocks.upload).toHaveBeenCalledWith(expect.stringMatching(/\.mp4$/), prepared, { upsert: false, contentType: 'video/mp4' });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ video_url: expect.stringMatching(/\.mp4$/) }));
  });
  it('keeps the existing version untouched when preparation fails', async () => {
    mocks.prepare.mockRejectedValue(new Error('Unreadable original'));
    const { result } = renderHook(useVideoLibraryAdmin);
    await act(async () => { expect(await result.current.replaceVideoFile('saved', new File(['source'], 'source.mov'))).toBeNull(); });
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('records the prepared file size through the existing replacement authority', async () => {
    const prepared = new File(['playable'], 'source.mp4', { type: 'video/mp4' });
    mocks.prepare.mockResolvedValue(prepared); mocks.upload.mockResolvedValue({ error: null }); mocks.rpc.mockResolvedValue({ data: {}, error: null });
    const { result } = renderHook(useVideoLibraryAdmin);
    await act(async () => { await result.current.replaceVideoFile('saved', new File(['old'], 'source.mov')); });
    expect(mocks.rpc).toHaveBeenCalledWith('replace_video_version', expect.objectContaining({ p_video_id: 'saved', p_file_size: prepared.size, p_new_url: expect.stringMatching(/\.mp4$/) }));
  });
});