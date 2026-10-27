import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { VideoPlayer } from './VideoPlayer';
afterEach(cleanup);
describe('shared library playback source identity', () => {
  it('clears a failed source when the viewer chooses a different saved video', () => {
    const view = render(<VideoPlayer videoUrl="https://example.org/old.mov" videoType="upload" title="Drill" />);
    const old = view.container.querySelector('video');
    if (!old) throw new Error('Missing initial player');
    fireEvent.error(old);
    expect(screen.getByTestId('video-load-failed')).toBeInTheDocument();
    view.rerender(<VideoPlayer videoUrl="https://example.org/new.mp4" videoType="upload" title="Drill" />);
    expect(screen.queryByTestId('video-load-failed')).not.toBeInTheDocument();
    expect(view.container.querySelector('video')?.getAttribute('src')).toBe('https://example.org/new.mp4');
  });
  it('uses the saved direct media URL even when its legacy type is external', () => {
    const view = render(<VideoPlayer videoUrl="https://example.org/drill.mp4?version=2" videoType="external" title="Drill" />);
    expect(view.container.querySelector('video')?.getAttribute('src')).toBe('https://example.org/drill.mp4?version=2');
    expect(view.container.querySelector('video')?.hasAttribute('playsinline')).toBe(true);
  });
});