/**
 * Burn DelayCam markup into a copy of the recorded session.
 *
 * This runs entirely on the device: the source video is played through once at
 * normal speed while each frame is drawn to an offscreen canvas with the
 * drawings on top, and the canvas is recorded. That means it takes as long as
 * the session does — the caller shows progress and offers a cancel.
 *
 * Audio is mixed with Web Audio so the two sound switches in the review player
 * are respected at the moment of export:
 *   - Video sound on  → the session's own audio is mixed in
 *   - Voice notes on  → each voice note plays at the time it is pinned to
 * All four combinations are valid, including a deliberately silent file.
 *
 * iOS Safari is the target: codecs are picked exactly the way the session
 * recorder picks them, and anything the device genuinely cannot do throws with
 * a real message rather than writing an empty file.
 */
import { drawShapes, type Shape } from "@/lib/delaycam/annotationRender";
import { pickRecorderMime, repairRecording } from "@/lib/delaycam/recording";

/** A voice note to schedule into the exported soundtrack. */
export interface BurnInVoiceNote {
  id: string;
  /** Where the note is pinned. Null (a whole-session note) plays at the start. */
  timestampSec: number | null;
  /** Local audio for the note; notes without audio are skipped. */
  audioBlob: Blob | null;
}

export interface BurnInOptions {
  /** Object URL of the recorded session. */
  sourceUrl: string;
  shapes: Shape[];
  voiceNotes: BurnInVoiceNote[];
  includeVideoSound: boolean;
  includeVoiceNotes: boolean;
  /** 0–1 through the session. */
  onProgress?: (fraction: number, elapsedSec: number, totalSec: number) => void;
  /** Aborting stops the render and rejects with an AbortError-style message. */
  signal?: AbortSignal;
}

export interface BurnInResult {
  blob: Blob;
  mime: string;
  durationSec: number;
}

const CAPTURE_FPS = 30;

function waitForMetadata(v: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    if (v.readyState >= 1 && v.videoWidth > 0) return resolve();
    const ok = () => { cleanup(); resolve(); };
    const bad = () => { cleanup(); reject(new Error("the recorded session could not be decoded on this device")); };
    const cleanup = () => {
      v.removeEventListener("loadedmetadata", ok);
      v.removeEventListener("error", bad);
    };
    v.addEventListener("loadedmetadata", ok);
    v.addEventListener("error", bad);
  });
}

/**
 * Render a copy of the session with the drawings baked into the picture.
 * Throws with a plain-language reason if the device can't do it.
 */
export async function renderAnnotatedCopy(opts: BurnInOptions): Promise<BurnInResult> {
  const {
    sourceUrl, shapes, voiceNotes, includeVideoSound, includeVoiceNotes, onProgress, signal,
  } = opts;

  if (typeof MediaRecorder === "undefined") {
    throw new Error("this browser can't record video, so a marked-up copy can't be made here");
  }
  if (shapes.length === 0) {
    throw new Error("there are no drawings on this session yet");
  }

  const video = document.createElement("video");
  video.src = sourceUrl;
  video.preload = "auto";
  video.playsInline = true;
  (video as any).webkitPlaysInline = true;
  // Muting the element would also silence the Web Audio tap on some browsers,
  // so when the session's own sound is wanted we leave it unmuted and route it
  // through the audio graph only — it never reaches the speakers.
  video.muted = !includeVideoSound;

  await waitForMetadata(video);

  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) throw new Error("the recorded session has no picture size this device can read");

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("this device couldn't open a drawing surface for the export");
  if (typeof (canvas as any).captureStream !== "function") {
    throw new Error("this browser can't record from a canvas, so a marked-up copy can't be made here");
  }

  const canvasStream: MediaStream = (canvas as any).captureStream(CAPTURE_FPS);
  const videoTracks = canvasStream.getVideoTracks();
  if (videoTracks.length === 0) {
    throw new Error("this browser produced no video track for the export");
  }

  // ---- Audio graph -------------------------------------------------------
  const AudioCtor: typeof AudioContext | undefined =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  let actx: AudioContext | null = null;
  let dest: MediaStreamAudioDestinationNode | null = null;
  const scheduled: AudioBufferSourceNode[] = [];
  const wantsAudio =
    (includeVideoSound || (includeVoiceNotes && voiceNotes.some((n) => n.audioBlob))) && !!AudioCtor;

  if (wantsAudio && AudioCtor) {
    try {
      actx = new AudioCtor();
      dest = actx.createMediaStreamDestination();
      if (includeVideoSound) {
        // Routing the element into the graph takes its audio away from the
        // speakers, which is what we want during a background render.
        const srcNode = actx.createMediaElementSource(video);
        srcNode.connect(dest);
      }
      if (includeVoiceNotes) {
        for (const n of voiceNotes) {
          if (!n.audioBlob) continue;
          try {
            const buf = await actx.decodeAudioData(await n.audioBlob.arrayBuffer());
            const node = actx.createBufferSource();
            node.buffer = buf;
            node.connect(dest);
            scheduled.push(node);
            (node as any).__startAt = Math.max(0, n.timestampSec ?? 0);
          } catch (e) {
            // One unreadable note must not cost the whole export.
            console.warn("[DelayCam] voice note could not be decoded for export", n.id, e);
          }
        }
      }
    } catch (e) {
      console.warn("[DelayCam] audio mixing unavailable, exporting without sound", e);
      actx = null;
      dest = null;
    }
  }

  const outStream = new MediaStream([
    ...videoTracks,
    ...(dest ? dest.stream.getAudioTracks() : []),
  ]);

  const mime = pickRecorderMime();
  let rec: MediaRecorder;
  try {
    rec = new MediaRecorder(outStream, { mimeType: mime });
  } catch {
    try {
      rec = new MediaRecorder(outStream);
    } catch (e: any) {
      throw new Error(
        `this device couldn't start a recorder for the marked-up copy (${e?.message || "unsupported"})`,
      );
    }
  }

  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };

  const total = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;

  let rafId: number | null = null;
  let vfcId: number | null = null;
  let finished = false;
  let failure: Error | null = null;

  const stopEverything = () => {
    if (rafId != null) cancelAnimationFrame(rafId);
    if (vfcId != null && (video as any).cancelVideoFrameCallback) {
      try { (video as any).cancelVideoFrameCallback(vfcId); } catch { /* ignore */ }
    }
    rafId = null;
    vfcId = null;
    try { video.pause(); } catch { /* ignore */ }
    scheduled.forEach((n) => { try { n.stop(); } catch { /* ignore */ } });
    videoTracks.forEach((t) => t.stop());
    dest?.stream.getAudioTracks().forEach((t) => t.stop());
  };

  const drawFrame = () => {
    ctx.drawImage(video, 0, 0, w, h);
    // Scale strokes/labels up to the recording's own size so the burned-in
    // markup reads the same as it did on the review screen.
    drawShapes(ctx, shapes, w, h, Math.max(1, Math.min(w, h) / 480));
    if (total > 0) onProgress?.(Math.min(1, video.currentTime / total), video.currentTime, total);
  };

  const startedAt = Date.now();

  const blob = await new Promise<Blob>((resolve, reject) => {
    const bail = (err: Error) => {
      if (finished) return;
      finished = true;
      failure = err;
      try { if (rec.state !== "inactive") rec.stop(); } catch { /* ignore */ }
      stopEverything();
      reject(err);
    };

    rec.onerror = () => bail(new Error("the recorder failed part way through the export"));

    rec.onstop = () => {
      stopEverything();
      if (failure) return;
      const out = new Blob(chunks, { type: rec.mimeType || mime });
      if (out.size === 0) {
        reject(new Error("the export produced an empty file on this device"));
        return;
      }
      resolve(out);
    };

    const onAbort = () => bail(new Error("Export cancelled."));
    signal?.addEventListener("abort", onAbort, { once: true });

    video.onended = () => {
      if (finished) return;
      finished = true;
      // A short tail so the recorder flushes the final frames.
      setTimeout(() => { try { if (rec.state !== "inactive") rec.stop(); } catch { /* ignore */ } }, 200);
    };
    video.onerror = () => bail(new Error("playback of the session failed during the export"));

    const pump = () => {
      if (finished) return;
      drawFrame();
      if ((video as any).requestVideoFrameCallback) {
        vfcId = (video as any).requestVideoFrameCallback(() => pump());
      } else {
        rafId = requestAnimationFrame(pump);
      }
    };

    const begin = async () => {
      try {
        video.currentTime = 0;
        if (actx && actx.state === "suspended") await actx.resume();
        // Draw one frame before recording so the file never starts blank.
        drawFrame();
        rec.start();
        await video.play();
        if (actx) {
          const base = actx.currentTime;
          scheduled.forEach((n) => {
            const at = (n as any).__startAt as number;
            try { n.start(base + at); } catch { /* ignore */ }
          });
        }
        pump();
      } catch (e: any) {
        bail(new Error(`the export couldn't start: ${e?.message || "unknown error"}`));
      }
    };

    void begin();
  }).finally(() => {
    if (actx) { void actx.close().catch(() => {}); }
  });

  const durationMs = total > 0 ? total * 1000 : Date.now() - startedAt;
  const repaired = await repairRecording(blob, rec.mimeType || mime, durationMs);
  return { blob: repaired, mime: rec.mimeType || mime, durationSec: durationMs / 1000 };
}
