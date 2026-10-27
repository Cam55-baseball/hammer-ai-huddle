import { describe, expect, it } from 'vitest';
import { libraryConversionArgs } from './prepareLibraryVideo';
describe('teaching video conversion preserves sound and frame timing', () => {
  it('keeps optional sound and passthrough timing when this browser requires WebM', () => {
    const args = libraryConversionArgs('source.mov', 'library.webm', true);
    expect(args).toContain('libvpx');
    expect(args).toContain('libopus');
    expect(args).toContain('0:a?');
    expect(args).toContain('passthrough');
    expect(args).not.toContain('-an');
    expect(args).not.toContain('-r');
  });
  it('maps original video and optional audio into H264/AAC MP4 without resampling or trimming', () => {
    const args = libraryConversionArgs('source.mov', 'library.mp4');
    expect(args).toEqual(['-i', 'source.mov', '-map', '0:v:0', '-map', '0:a?', '-c:v', 'libx264',
      '-preset', 'ultrafast', '-crf', '18', '-pix_fmt', 'yuv420p', '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2',
      '-fps_mode', 'passthrough', '-c:a', 'aac', '-movflags', '+faststart', 'library.mp4']);
    expect(args).not.toContain('-an');
    expect(args).not.toContain('-r');
    expect(args).not.toContain('-t');
  });
});