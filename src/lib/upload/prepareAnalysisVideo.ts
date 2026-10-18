import coreWasmURL from "@ffmpeg/core/wasm?url";
import coreURL from "@ffmpeg/core?url";
import converterWorkerURL from "@ffmpeg/ffmpeg/worker?worker&url";

/** Decode an actual frame, not just a header or canPlayType claim. */
export async function canDecodeAnalysisVideo(file: File): Promise<boolean> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true; video.playsInline = true; video.preload = "auto";
  try {
    return await new Promise<boolean>((resolve) => {
      const finish = (ok: boolean) => {
        clearTimeout(timer); video.onloadeddata = null; video.onerror = null; resolve(ok);
      };
      const timer = setTimeout(() => finish(false), 8_000);
      video.onloadeddata = () => finish(video.videoWidth > 0 && video.videoHeight > 0);
      video.onerror = () => finish(false);
      video.src = url; video.load();
    });
  } finally {
    video.removeAttribute("src"); video.load(); URL.revokeObjectURL(url);
  }
}

/** Preserve timing: no resampling, interpolation, trimming or assumed FPS. */
export function analysisConversionArgs(input: string, output: string): string[] {
  return ["-i", input, "-map", "0:v:0", "-an", "-c:v", "libx264",
    "-preset", "ultrafast", "-crf", "18", "-pix_fmt", "yuv420p",
    "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2", "-fps_mode", "passthrough",
    "-movflags", "+faststart", output];
}

/** Private single-thread conversion; the original is never mutated. */
export async function prepareAnalysisVideo(original: File, onProgress: (progress: number) => void = () => {}): Promise<File> {
  if (await canDecodeAnalysisVideo(original)) return original;
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const converter = new FFmpeg();
  const input = "source" + (original.name.match(/\.[a-z0-9]+$/i)?.[0] ?? ".video");
  try {
    onProgress(0);
    converter.on("progress", ({ progress }) => onProgress(Math.max(0, Math.min(99, Math.round(progress * 100)))));
    await converter.load({
      classWorkerURL: converterWorkerURL,
      coreURL: new URL(coreURL, window.location.origin).href,
      wasmURL: new URL(coreWasmURL, window.location.origin).href,
    });
    await converter.writeFile(input, new Uint8Array(await original.arrayBuffer()));
    const code = await converter.exec(analysisConversionArgs(input, "analysis.mp4"), 180_000);
    if (code !== 0) throw new Error("Video conversion did not finish. Your original clip is unchanged.");
    const bytes = await converter.readFile("analysis.mp4");
    if (typeof bytes === "string") throw new Error("Video conversion returned no video.");
    const compatible = new File([new Uint8Array(bytes)], original.name.replace(/\.[^.]+$/, "") + ".mp4", {
      type: "video/mp4", lastModified: original.lastModified,
    });
    if (!await canDecodeAnalysisVideo(compatible)) throw new Error("This clip could not be read after conversion. Your original is unchanged.");
    onProgress(100);
    return compatible;
  } finally { converter.terminate(); }
}
