import coreWasmURL from '@ffmpeg/core/wasm?url';
import coreURL from '@ffmpeg/core?url';
import converterWorkerURL from '@ffmpeg/ffmpeg/worker?worker&url';
import { canDecodeAnalysisVideo } from './prepareAnalysisVideo';

/** Teaching clips keep sound and timing; unlike analysis, audio is not discarded. */
export function libraryConversionArgs(input: string, output: string, webm = false): string[] {
  if (webm) return ['-i', input, '-map', '0:v:0', '-map', '0:a?', '-c:v', 'libvpx',
    '-deadline', 'realtime', '-cpu-used', '8', '-crf', '10', '-b:v', '4M',
    '-pix_fmt', 'yuv420p', '-fps_mode', 'passthrough', '-c:a', 'libopus', output];
  return ['-i', input, '-map', '0:v:0', '-map', '0:a?', '-c:v', 'libx264',
    '-preset', 'ultrafast', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-fps_mode', 'passthrough',
    '-c:a', 'aac', '-movflags', '+faststart', output];
}

/** Convert non-MP4 uploads privately before saving any library URL. */
export async function prepareLibraryVideo(original: File): Promise<File> {
  if (/\.mp4$/i.test(original.name) && await canDecodeAnalysisVideo(original)) return original;
  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  const converter = new FFmpeg();
  const input = 'source' + (original.name.match(/\.[a-z0-9]+$/i)?.[0] ?? '.video');
  const webm = !document.createElement('video').canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"');
  const output = webm ? 'library.webm' : 'library.mp4';
  try {
    await converter.load({ classWorkerURL: converterWorkerURL,
      coreURL: new URL(coreURL, window.location.origin).href,
      wasmURL: new URL(coreWasmURL, window.location.origin).href });
    await converter.writeFile(input, new Uint8Array(await original.arrayBuffer()));
    const code = await converter.exec(libraryConversionArgs(input, output, webm), 180_000);
    if (code !== 0) throw new Error('This video could not be prepared for playback. Your original is unchanged.');
    const bytes = await converter.readFile(output);
    if (typeof bytes === 'string') throw new Error('No playable video was returned. Your original is unchanged.');
    const file = new File([new Uint8Array(bytes)], original.name.replace(/\.[^.]+$/, '') + (webm ? '.webm' : '.mp4'),
      { type: webm ? 'video/webm' : 'video/mp4', lastModified: original.lastModified });
    if (!await canDecodeAnalysisVideo(file)) throw new Error('The prepared video could not play. Nothing has been saved.');
    return file;
  } finally { converter.terminate(); }
}