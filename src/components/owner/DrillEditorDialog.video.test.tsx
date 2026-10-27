import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const mocks = vi.hoisted(() => ({ insert: vi.fn(), update: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
vi.mock('@/hooks/useVideoLibrary', () => ({ useVideoLibrary: () => ({ videos: [{ id: 'v', title: 'Saved library drill', video_url: 'https://example.org/drill.mp4' }], loading: false, hasMore: false }) }));
vi.mock('@/components/video-library/VideoPlayer', () => ({ VideoPlayer: () => null }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  const chain: any = { select: () => chain, order: () => chain, eq: () => chain,
    single: async () => ({ data: { id: 'drill', name: 'Existing drill', video_url: 'https://example.org/old.mp4' }, error: null }),
    then: (resolve: any) => resolve({ data: [], error: null }),
    delete: () => chain,
    insert: (data: unknown) => { if (table === 'drills') mocks.insert(data); return chain; },
    update: (data: unknown) => { mocks.update(data); return chain; } };
  return chain;
} } }));
import { DrillEditorDialog } from './DrillEditorDialog';
function open(drillId: string | null = null) {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><DrillEditorDialog open onOpenChange={() => {}} drillId={drillId} onSaved={() => {}} /></QueryClientProvider>);
}
describe('legacy video save authority', () => {
  beforeEach(() => { cleanup(); vi.clearAllMocks(); });
  it('saves a library choice to the existing video URL without inventing a library identity column', async () => {
    open();
    fireEvent.change(screen.getByPlaceholderText('Quick Transfer Drill'), { target: { value: 'Test drill' } });
    fireEvent.click(screen.getByRole('button', { name: 'Saved library drill' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create Drill' }));
    await waitFor(() => expect(mocks.insert).toHaveBeenCalled());
    expect(mocks.insert.mock.calls[0][0]).toMatchObject({ name: 'Test drill', video_url: 'https://example.org/drill.mp4' });
    expect(mocks.insert.mock.calls[0][0]).not.toHaveProperty('library_video_id');
  });
  it('keeps a custom URL entered after selection as the saved video', async () => {
    open('existing');
    await waitFor(() => expect(screen.getByPlaceholderText('Quick Transfer Drill')).toHaveValue('Existing drill'));
    fireEvent.click(screen.getByRole('button', { name: 'Saved library drill' }));
    fireEvent.change(screen.getByLabelText('Video URL'), { target: { value: 'https://example.org/custom.mp4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update Drill' }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalled());
    expect(mocks.update.mock.calls[0][0]).toMatchObject({ video_url: 'https://example.org/custom.mp4' });
  });
});