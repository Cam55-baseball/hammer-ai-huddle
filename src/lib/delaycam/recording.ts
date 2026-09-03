/**
 * Recorder helpers shared by the DelayCam session recorder and the marked-up
 * export. Behaviour is unchanged from where these lived before — they were
 * lifted out so the export picks codecs and repairs duration exactly the same
 * way the session recording does, instead of a second copy that can drift.
 */
import fixWebmDuration from "fix-webm-duration";

/**
 * The first container the device can actually record. iOS Safari records mp4;
 * everything else generally lands on webm.
 */
export function pickRecorderMime(): string {
  const candidates = [
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return "video/webm";
}

/**
 * Force the browser to index a freshly recorded blob so it becomes seekable.
 * MediaRecorder output has no duration/cue data: loading it, seeking far past
 * the end and waiting for durationchange/seeked makes the browser build the
 * index, after which scrubbing and frame stepping work.
 */
export async function forceSeekIndex(blob: Blob): Promise<{ ok: boolean; reason?: string }> {
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise<{ ok: boolean; reason?: string }>((resolve) => {
      const v = document.createElement("video");
      v.preload = "auto";
      v.muted = true;
      (v as any).playsInline = true;
      let settled = false;
      const finish = (ok: boolean, reason?: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try { v.removeAttribute("src"); v.load(); } catch { /* ignore */ }
        resolve({ ok, reason });
      };
      // A slow phone can take a while to index a long session; a timeout is
      // not proof of failure, so we let it through rather than lying either way.
      const timer = setTimeout(() => finish(true, "indexing timed out"), 15000);
      v.addEventListener("loadedmetadata", () => {
        try { v.currentTime = 1e101; } catch { /* ignore */ }
      });
      v.addEventListener("durationchange", () => {
        if (v.duration !== Infinity && !Number.isNaN(v.duration) && v.duration > 0) {
          try { v.currentTime = 0; } catch { /* ignore */ }
        }
      });
      v.addEventListener("seeked", () => {
        if (v.currentTime === 0) finish(true);
      });
      v.addEventListener("error", () => finish(false, "the browser could not decode it"));
      v.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Repair a recorded blob so it carries a real duration and is seekable.
 * Throws if the result genuinely cannot be decoded — we never hand the user a
 * dead player and call it a session.
 */
export async function repairRecording(blob: Blob, mime: string, durationMs: number): Promise<Blob> {
  let out = blob;
  if (mime.includes("webm") && durationMs > 0) {
    try {
      out = await fixWebmDuration(blob, durationMs, { logger: false });
    } catch (e) {
      console.warn("[DelayCam] webm duration fix failed", e);
    }
  }
  const indexed = await forceSeekIndex(out);
  if (!indexed.ok) throw new Error(indexed.reason || "the recording could not be indexed");
  return out;
}
