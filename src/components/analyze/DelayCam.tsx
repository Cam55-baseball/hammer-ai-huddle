/**
 * DelayCam — live camera with adjustable 1–55s instant-replay delay.
 * Self-contained, client-only. No uploads, no backend.
 *
 * Delayed mirror is rendered via a canvas frame ring buffer captured from the
 * live <video> using requestVideoFrameCallback (with rAF fallback). This works
 * uniformly on iOS Safari, Android Chrome, and desktop — no MediaSource, no
 * <video src> swaps, no flicker.
 *
 * MediaRecorder runs in parallel to record the whole session for review and
 * saving. If it cannot be created or fails, we say so — we never present the
 * UI as recording when it is not.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Camera, CameraOff, SwitchCamera, Download, Play, AlertCircle, Timer,
  BookMarked, Loader2, Eye, Video, Maximize2, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { generateVideoThumbnail, uploadVideoThumbnail } from "@/lib/videoHelpers";
import { probeVideoMetadata } from "@/lib/biomech/probeVideoMetadata";
import { emitVideoMoment } from "@/lib/videoMoments/bus";
import { useSideContext } from "@/contexts/SideContext";
import {
  FPS_TARGET, highFpsVideoConstraints, readTrackFps, tryRaiseTrackFps, classifyFps,
} from "@/lib/capture/highFpsCapture";
import { toast } from "sonner";
import { SessionReviewPlayer } from "@/components/analyze/SessionReviewPlayer";
import fixWebmDuration from "fix-webm-duration";


type ClipModule = "hitting" | "pitching" | "throwing";
type ClipSport = "baseball" | "softball";

interface DelayCamProps {
  /** Discipline this DelayCam session is being run under. Determines the
   * `module` tag on any clip saved to Players Club. */
  module?: ClipModule;
  /** Sport this DelayCam session is being run under. Falls back to
   * localStorage 'selectedSport' then 'baseball'. */
  sport?: ClipSport;
}

const PRESETS = [3, 5, 10, 20, 30, 45];
const MIN_DELAY = 1;
const MAX_DELAY = 55;
const MAX_BUFFER_SEC = 55;
const MAX_FRAMES = MAX_BUFFER_SEC * 30 + 30; // safety cap
/** Full-session recording limits. The delayed mirror only ever needs 55s of
 * frames, but the recording itself keeps the whole session so it can be
 * watched back. These caps exist so a forgotten camera can't exhaust memory. */
const MAX_SESSION_SEC = 45 * 60;
const MAX_SESSION_BYTES = 900 * 1024 * 1024;

const MAX_FRAME_W = 1280;
const MAX_FRAME_H = 720;

type Facing = "user" | "environment";

type Frame = { bitmap: ImageBitmap; t: number };

function pickRecorderMime(): string {
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
async function forceSeekIndex(blob: Blob): Promise<void> {
  const url = URL.createObjectURL(blob);
  try {
    await new Promise<void>((resolve) => {
      const v = document.createElement("video");
      v.preload = "auto";
      v.muted = true;
      (v as any).playsInline = true;
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try { v.removeAttribute("src"); v.load(); } catch { /* ignore */ }
        resolve();
      };
      const timer = setTimeout(finish, 5000);
      v.addEventListener("loadedmetadata", () => {
        try { v.currentTime = 1e101; } catch { /* ignore */ }
      });
      v.addEventListener("durationchange", () => {
        if (v.duration !== Infinity && !Number.isNaN(v.duration) && v.duration > 0) {
          try { v.currentTime = 0; } catch { /* ignore */ }
        }
      });
      v.addEventListener("seeked", () => {
        if (v.currentTime === 0) finish();
      });
      v.addEventListener("error", finish);
      v.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Repair a recorded blob so it carries a real duration and is seekable. */
async function repairRecording(blob: Blob, mime: string, durationMs: number): Promise<Blob> {
  let out = blob;
  if (mime.includes("webm") && durationMs > 0) {
    try {
      out = await fixWebmDuration(blob, durationMs, { logger: false });
    } catch (e) {
      console.warn("[DelayCam] webm duration fix failed", e);
    }
  }
  await forceSeekIndex(out);
  return out;
}


export function DelayCam({ module: moduleProp, sport: sportProp }: DelayCamProps = {}) {
  const { user } = useOptionalAuth();
  const resolvedModule: ClipModule = moduleProp ?? "hitting";
  const fireDelayCamMoment = useCallback(() => {
    emitVideoMoment({
      kind: "delaycam_saved",
      skillDomain: resolvedModule,
      sport: (resolvedSport as any) ?? null,
      label: "Your clip",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedModule]);
  const resolvedSport: ClipSport =
    sportProp ??
    ((typeof window !== "undefined" && (localStorage.getItem("selectedSport") as ClipSport)) ||
      "baseball");
  const sideDiscipline: "hit" | "throw" = resolvedModule === "hitting" ? "hit" : "throw";
  const { selectedSide, shouldShowPicker } = useSideContext();
  const activeSide = selectedSide[sideDiscipline];
  const requiresSideConfirmation = shouldShowPicker(sideDiscipline);
  const liveRef = useRef<HTMLVideoElement>(null);
  const delayedCanvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef<number>(0);
  const capTimerRef = useRef<number | null>(null);
  /** The repaired, seekable recording from the last session. */
  const recordedBlobRef = useRef<Blob | null>(null);

  const framesRef = useRef<Frame[]>([]);
  const rvfcIdRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const drawRafRef = useRef<number | null>(null);
  const mimeRef = useRef<string>("video/webm");
  /** Frame rate the camera track reported after negotiation, persisted with
   * any clip saved from this session. */
  const capturedFpsRef = useRef<number | null>(null);

  const [running, setRunning] = useState(false);
  const [facing, setFacing] = useState<Facing>("environment");
  const [delay, setDelay] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [bufferedSec, setBufferedSec] = useState(0);
  const [hasMulti, setHasMulti] = useState(false);
  /** Object URL for the full recorded session, built on demand after Stop. */
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const sessionUrlRef = useRef<string | null>(null);
  const [saving, setSaving] = useState<null | "club">(null);

  /** "idle" before start; "recording" runs MediaRecorder buffer for
   * replay/save; "streaming" is delayed mirror only for long practice
   * sessions. */
  type Mode = "idle" | "streaming" | "recording";
  const [mode, setMode] = useState<Mode>("idle");
  /** True once a recording has stopped with a clip still buffered for
   * save/replay. Cleared when a new session starts. */
  const [hasStoppedClip, setHasStoppedClip] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [hidden, setHidden] = useState(false);
  const streamOnlyRef = useRef(false);
  const frameCounterRef = useRef(0);
  const recordedBytesRef = useRef(0);
  /** Bytes actually captured this session — drives whether save/review are
   * possible, instead of guessing from the mode. */
  const [recordedBytes, setRecordedBytes] = useState(0);
  /** Set when MediaRecorder can't be created or fails mid-session. */
  const [recordError, setRecordError] = useState<string | null>(null);
  /** True while the recording is being made seekable after Stop. */
  const [repairing, setRepairing] = useState(false);
  /** True when the mic was denied/unavailable so the session has no sound. */
  const [audioMissing, setAudioMissing] = useState(false);
  /** Which panel, if any, is expanded to fill the screen. */
  const [expanded, setExpanded] = useState<null | "live" | "delayed">(null);


  /** Whether this browser can record at all. Checked once so the Record
   * session button can be honestly disabled rather than failing on press. */
  const canRecord =
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof (window as any).MediaRecorder === "function";


  const delayRef = useRef(delay);
  useEffect(() => { delayRef.current = delay; }, [delay]);

  // Background tab handling — surface a "Paused (background)" hint so the
  // user knows why the mirror slows down. The browser already throttles
  // rAF/rVFC when hidden; we just make it visible in the UI.
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    setHidden(document.hidden);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  /** Refine the camera list. Before permission is granted iOS Safari reports
   * a single unlabelled videoinput, so this is only ever used to enrich the
   * label — the Flip button itself is always available. */
  const refreshDevices = useCallback(() => {
    navigator.mediaDevices?.enumerateDevices?.().then((d) => {
      setHasMulti(d.filter((x) => x.kind === "videoinput").length > 1);
    }).catch(() => {});
  }, []);

  useEffect(() => { refreshDevices(); }, [refreshDevices]);


  // ----- Frame ring buffer helpers -----

  const clearFrames = useCallback(() => {
    for (const f of framesRef.current) {
      try { f.bitmap.close(); } catch { /* ignore */ }
    }
    framesRef.current = [];
  }, []);

  const cleanup = useCallback(() => {
    if (rvfcIdRef.current != null && liveRef.current && "cancelVideoFrameCallback" in liveRef.current) {
      try { (liveRef.current as any).cancelVideoFrameCallback(rvfcIdRef.current); } catch {}
    }
    rvfcIdRef.current = null;
    if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = null;
    if (drawRafRef.current != null) cancelAnimationFrame(drawRafRef.current);
    drawRafRef.current = null;

    if (capTimerRef.current != null) { clearInterval(capTimerRef.current); capTimerRef.current = null; }
    try { recorderRef.current?.state !== "inactive" && recorderRef.current?.stop(); } catch {}
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    chunksRef.current = [];
    clearFrames();

    offscreenCanvasRef.current = null;

    if (liveRef.current) liveRef.current.srcObject = null;
    const c = delayedCanvasRef.current;
    if (c) {
      const ctx = c.getContext("2d");
      ctx?.clearRect(0, 0, c.width, c.height);
    }
  }, [clearFrames]);

  useEffect(() => cleanup, [cleanup]);

  /** Build a playable Blob from the whole session, in recorded order. The
   * recorder's first chunk carries the init segment, so concatenating every
   * chunk in order always decodes. */
  const buildDecodableBlob = useCallback((body: Blob[], fallbackMime?: string): Blob | null => {
    const mime = recorderRef.current?.mimeType || fallbackMime || mimeRef.current || "video/webm";
    if (body.length === 0) return null;
    const init = initChunkRef.current;
    const parts = init && body[0] !== init ? [init, ...body] : body;
    return new Blob(parts, { type: mime });
  }, []);

  const saveClip = useCallback(() => {
    const items = timedChunksRef.current;
    if (items.length === 0) {
      toast.error("Nothing recorded yet — press Record session first.");
      return;
    }
    const mime = recorderRef.current?.mimeType || mimeRef.current || "video/webm";
    const blob = buildDecodableBlob(items.map((x) => x.blob), mime);
    if (!blob || blob.size === 0) {
      toast.error("Couldn't build the file from this recording. Try recording again.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `delaycam-${new Date().toISOString().replace(/[:.]/g, "-")}.${mime.includes("mp4") ? "mp4" : "webm"}`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("Saved to your device.");
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  }, [buildDecodableBlob]);

  /** Build a playable URL for the entire recorded session so the athlete can
   * watch it all back with the drawing tools. */
  const openSessionReview = useCallback(() => {
    const items = timedChunksRef.current;
    if (items.length === 0) {
      toast.error("Nothing recorded yet — press Record session first.");
      return;
    }
    const mime = recorderRef.current?.mimeType || mimeRef.current || "video/webm";
    const blob = buildDecodableBlob(items.map((x) => x.blob), mime);
    if (!blob || blob.size === 0) {
      toast.error("Couldn't open this recording. Try recording again.");
      return;
    }
    if (sessionUrlRef.current) URL.revokeObjectURL(sessionUrlRef.current);
    const url = URL.createObjectURL(blob);
    sessionUrlRef.current = url;
    setSessionUrl(url);
  }, [buildDecodableBlob]);


  const saveToPlayersClub = useCallback(async () => {
    if (!user) {
      toast.error("Sign in to save clips to Players Club.");
      return;
    }
    if (requiresSideConfirmation && !activeSide) {
      toast.error(
        sideDiscipline === "hit"
          ? "Confirm the batting side used in this clip before saving."
          : "Confirm the throwing hand used in this clip before saving.",
      );
      return;
    }
    const items = timedChunksRef.current;
    if (items.length === 0) {
      toast.error("Nothing to save yet — record a clip first.");
      return;
    }
    const mime = recorderRef.current?.mimeType || mimeRef.current || "video/webm";
    const blob = buildDecodableBlob(items.map((x) => x.blob), mime);
    if (!blob) {
      toast.error("Couldn't build the clip. Try recording again.");
      return;
    }

    setSaving("club");
    const toastId = toast.loading("Saving to Players Club…");

    try {
      // Session preflight — surface a clear error instead of a silent RLS reject.
      const { data: sessionCheck } = await supabase.auth.getSession();
      const liveSession = sessionCheck?.session ?? null;
      if (!liveSession?.user?.id || liveSession.user.id !== user.id) {
        toast.error("Your session expired. Sign in again to save this clip.", { id: toastId });
        setSaving(null);
        return;
      }

      const ext = mime.includes("mp4") ? "mp4" : "webm";
      const ts = Date.now();
      const filePath = `${user.id}/delaycam/${ts}.${ext}`;
      const file = new File([blob], `delaycam-${ts}.${ext}`, { type: mime });

      // Phase 0 probe — required by the videos schema.
      let probed: Awaited<ReturnType<typeof probeVideoMetadata>>;
      try {
        probed = await probeVideoMetadata(file);
      } catch (probeErr) {
        console.error("[DelayCam] probe failed", probeErr);
        toast.error("Couldn't read the recorded clip. Try recording again.", { id: toastId });
        setSaving(null);
        return;
      }

      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(filePath, file, { contentType: mime, upsert: false });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("videos")
        .getPublicUrl(filePath);

      // Thumbnail generation is best-effort — never block the save.
      let thumbnailUrl: string | null = null;
      try {
        const thumbBlob = await generateVideoThumbnail(file, 0.1);
        thumbnailUrl = await uploadVideoThumbnail(thumbBlob, user.id, filePath);
      } catch (thumbErr) {
        console.warn("[DelayCam] thumbnail generation failed", thumbErr);
      }

      const sideStamp = shouldShowPicker(sideDiscipline)
        ? sideDiscipline === "hit"
          ? { batting_side: activeSide }
          : { throwing_hand: activeSide }
        : {};

      const { error: insertError } = await supabase
        .from("videos")
        .insert([{
          user_id: user.id,
          sport: resolvedSport,
          module: resolvedModule,
          video_url: publicUrl,
          thumbnail_url: thumbnailUrl,
          status: "completed",
          library_title: `DelayCam session — ${new Date().toLocaleString()}`,
          saved_to_library: true,
          sha256_hex: probed.sha256_hex,
          fps_true: probed.fps_true,
          duration_sec: probed.duration_sec,
          width: probed.width,
          height: probed.height,
          orientation: probed.orientation,
          capture_source: "delaycam",
          requested_fps: FPS_TARGET,
          achieved_fps: capturedFpsRef.current ?? probed.fps_true,
          capture_fps_tier: classifyFps(capturedFpsRef.current ?? probed.fps_true),
          capture_fps_source: capturedFpsRef.current != null ? "track_settings" : "file_probe",
          ...sideStamp,
        }] as never);
      if (insertError) throw insertError;

      toast.success("Saved to Players Club.", { id: toastId });
      fireDelayCamMoment();
    } catch (e: any) {
      console.error("[DelayCam] save to club failed", e);
      toast.error(e?.message || "Couldn't save this clip. Please try again.", { id: toastId });
    } finally {
      setSaving(null);
    }
  }, [
    activeSide,
    buildDecodableBlob,
    fireDelayCamMoment,
    requiresSideConfirmation,
    resolvedModule,
    resolvedSport,
    shouldShowPicker,
    sideDiscipline,
    user,
  ]);



  const start = useCallback(async (nextMode: "streaming" | "recording", nextFacing?: Facing) => {
    setTransitioning(true);
    streamOnlyRef.current = nextMode === "streaming";
    setHasStoppedClip(false);
    recordedBytesRef.current = 0;
    setRecordedBytes(0);
    if (sessionUrlRef.current) {
      URL.revokeObjectURL(sessionUrlRef.current);
      sessionUrlRef.current = null;
    }
    setSessionUrl(null);

    setError(null);
    setRecordError(null);
    cleanup();
    const useFacing = nextFacing ?? facing;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // Ask for the fastest frame rate the device can give us. Motion blur
        // at 30fps is what destroys ball tracking, so we request high fps here
        // too and record whatever the camera actually delivered.
        video: highFpsVideoConstraints(useFacing),
        audio: false,
      });
      streamRef.current = stream;
      {
        const negotiated = readTrackFps(stream);
        if (!negotiated.settingsFps || negotiated.settingsFps < 60) {
          await tryRaiseTrackFps(stream);
        }
        const after = readTrackFps(stream);
        capturedFpsRef.current = after.settingsFps ?? negotiated.settingsFps ?? null;
      }
      const lv = liveRef.current;
      if (!lv) throw new Error("Live video element not mounted");
      lv.srcObject = stream;
      lv.muted = true;
      lv.playsInline = true;
      await lv.play().catch(() => {});

      // Wait for real dimensions before sizing canvases.
      await new Promise<void>((resolve) => {
        if (lv.videoWidth > 0 && lv.videoHeight > 0) return resolve();
        const on = () => { lv.removeEventListener("loadedmetadata", on); resolve(); };
        lv.addEventListener("loadedmetadata", on, { once: true });
      });

      // Compute capture size (letter-cap to 720p while preserving aspect).
      const vw = lv.videoWidth || 1280;
      const vh = lv.videoHeight || 720;
      const scale = Math.min(1, MAX_FRAME_W / vw, MAX_FRAME_H / vh);
      const cw = Math.max(2, Math.round(vw * scale));
      const ch = Math.max(2, Math.round(vh * scale));

      const off = document.createElement("canvas");
      off.width = cw;
      off.height = ch;
      offscreenCanvasRef.current = off;
      const dc = delayedCanvasRef.current;
      if (dc) { dc.width = cw; dc.height = ch; }

      // ----- Frame capture loop -----
      const captureFrame = async () => {
        const src = liveRef.current;
        const canvas = offscreenCanvasRef.current;
        if (!src || !canvas) return;
        // In stream-only mode, decimate to ~15 fps by processing every other
        // frame. This roughly halves CPU / memory bitmap churn during
        // hours-long practice sessions.
        frameCounterRef.current += 1;
        if (streamOnlyRef.current && frameCounterRef.current % 2 === 0) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        try {
          ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
          const bitmap = await createImageBitmap(canvas);
          const now = performance.now();
          framesRef.current.push({ bitmap, t: now });

          // Evict by time. In stream-only mode we only need the current delay
          // window plus a small margin, not the full 55s.
          const windowSec = streamOnlyRef.current
            ? Math.min(MAX_BUFFER_SEC, delayRef.current + 5)
            : MAX_BUFFER_SEC;
          const cutoff = now - windowSec * 1000;
          while (framesRef.current.length > 0 && framesRef.current[0].t < cutoff) {
            const dropped = framesRef.current.shift();
            try { dropped?.bitmap.close(); } catch {}
          }
          // Evict by count (safety).
          while (framesRef.current.length > MAX_FRAMES) {
            const dropped = framesRef.current.shift();
            try { dropped?.bitmap.close(); } catch {}
          }
          const first = framesRef.current[0];
          const last = framesRef.current[framesRef.current.length - 1];
          if (first && last) setBufferedSec((last.t - first.t) / 1000);
        } catch { /* ignore transient draw errors */ }
      };


      const hasRVFC = "requestVideoFrameCallback" in HTMLVideoElement.prototype;
      if (hasRVFC) {
        const step = () => {
          void captureFrame();
          rvfcIdRef.current = (lv as any).requestVideoFrameCallback(step);
        };
        rvfcIdRef.current = (lv as any).requestVideoFrameCallback(step);
      } else {
        const step = () => {
          void captureFrame();
          rafIdRef.current = requestAnimationFrame(step);
        };
        rafIdRef.current = requestAnimationFrame(step);
      }

      // ----- Delayed render loop -----
      const renderDelayed = () => {
        const c = delayedCanvasRef.current;
        if (!c) { drawRafRef.current = requestAnimationFrame(renderDelayed); return; }
        const ctx = c.getContext("2d");
        const frames = framesRef.current;
        if (ctx && frames.length > 0) {
          const targetT = performance.now() - delayRef.current * 1000;
          // Pick the newest frame whose t <= targetT; if none, use the oldest.
          let pick: Frame | null = null;
          for (let i = frames.length - 1; i >= 0; i--) {
            if (frames[i].t <= targetT) { pick = frames[i]; break; }
          }
          if (!pick) pick = frames[0];
          try {
            ctx.drawImage(pick.bitmap, 0, 0, c.width, c.height);
          } catch { /* ignore */ }

          // Overlay "filling buffer" hint until we have enough range.
          const first = frames[0];
          const last = frames[frames.length - 1];
          const have = (last.t - first.t) / 1000;
          if (have < delayRef.current) {
            ctx.fillStyle = "rgba(0,0,0,0.55)";
            ctx.fillRect(0, c.height - 40, c.width, 40);
            ctx.fillStyle = "#fff";
            ctx.font = "600 14px system-ui, sans-serif";
            ctx.textBaseline = "middle";
            ctx.fillText(
              `Filling buffer… ${have.toFixed(1)}s / ${delayRef.current}s`,
              12,
              c.height - 20,
            );
          }
        }
        drawRafRef.current = requestAnimationFrame(renderDelayed);
      };
      drawRafRef.current = requestAnimationFrame(renderDelayed);

      // ----- MediaRecorder — records the whole session for review and saving.
      // Skipped entirely in mirror-only mode so long sessions don't accumulate
      // any encoded video in memory.
      const mime = pickRecorderMime();
      mimeRef.current = mime;
      let recordingStarted = false;
      if (!streamOnlyRef.current) {
        try {
          const rec = new MediaRecorder(stream, { mimeType: mime });
          recorderRef.current = rec;
          rec.ondataavailable = (ev) => {
            if (!ev.data || ev.data.size === 0) return;
            const now = performance.now();
            if (!initChunkRef.current) initChunkRef.current = ev.data;
            timedChunksRef.current.push({ blob: ev.data, t: now });
            // Record the WHOLE session — the athlete watches it all back, so
            // nothing is evicted. The only limit is a memory safety cap; when
            // it is hit we stop cleanly and say so rather than silently
            // dropping the front of the session.
            recordedBytesRef.current += ev.data.size;
            setRecordedBytes(recordedBytesRef.current);
            const first = timedChunksRef.current[0];
            const elapsedSec = first ? (now - first.t) / 1000 : 0;
            if (
              recordedBytesRef.current > MAX_SESSION_BYTES ||
              elapsedSec > MAX_SESSION_SEC
            ) {
              try { rec.state !== "inactive" && rec.stop(); } catch { /* noop */ }
              toast.info(
                `Recording stopped at the ${Math.round(MAX_SESSION_SEC / 60)}-minute limit. Your session is ready to watch back.`,
              );
            }
          };
          rec.onerror = (ev: any) => {
            const msg = ev?.error?.message || "Recording failed on this device.";
            console.error("[DelayCam] recorder error", ev);
            setRecordError(msg);
            toast.error(`Recording stopped: ${msg}`);
          };

          rec.start(250);
          recordingStarted = true;
        } catch (recErr: any) {
          // Never pretend to be recording. Tell the user plainly.
          const msg = recErr?.message || "This browser can't record video.";
          console.error("[DelayCam] recorder could not start", recErr);
          recorderRef.current = null;
          setRecordError(msg);
          toast.error(`Couldn't start recording: ${msg}`);
        }
      }

      setRunning(true);
      // If recording was requested but the recorder never started, run as the
      // mirror only — the badge and banner say so.
      setMode(nextMode === "recording" && !recordingStarted ? "streaming" : nextMode);
      setTransitioning(false);

    } catch (e: any) {
      const name = e?.name || "";
      if (name === "NotAllowedError") setError("Camera permission denied. Enable it in your browser settings.");
      else if (name === "NotFoundError") setError("No camera found on this device.");
      else if (name === "NotReadableError") setError("Camera is already in use by another app.");
      else setError(e?.message || "Could not start the camera.");
      cleanup();
      setRunning(false);
      setMode("idle");
      setTransitioning(false);
    }
  }, [cleanup, facing]);

  /** Full teardown that also clears any buffered clip. Used when the user
   * starts a fresh session or unmounts. */
  const fullReset = useCallback(() => {
    cleanup();
    setRunning(false);
    setMode("idle");
    setBufferedSec(0);
    setHasStoppedClip(false);
    setRecordError(null);
    recordedBytesRef.current = 0;
    setRecordedBytes(0);
    if (sessionUrlRef.current) {
      URL.revokeObjectURL(sessionUrlRef.current);
      sessionUrlRef.current = null;
    }
    setSessionUrl(null);
  }, [cleanup]);

  /** Stop the active session. If the user was recording, preserve the
   * buffered clip so save-to-device / save-to-club / replay still work.
   * Streaming has no clip to preserve, so it fully resets. */
  const stop = useCallback(() => {
    const wasRecording = mode === "recording";

    const finish = () => {
      const preservedChunks = wasRecording ? timedChunksRef.current : [];
      const preservedInit = wasRecording ? initChunkRef.current : null;
      const mime = recorderRef.current?.mimeType || mimeRef.current || "video/webm";
      cleanup();
      setRunning(false);
      setMode("idle");
      if (wasRecording && preservedChunks.length > 0) {
        // Restore the buffer that cleanup() cleared so save/review still work.
        timedChunksRef.current = preservedChunks;
        initChunkRef.current = preservedInit;
        setHasStoppedClip(true);
        // Bring the session review up on its own — the user shouldn't have to
        // hunt for a button to see what they just recorded.
        const blob = buildDecodableBlob(preservedChunks.map((x) => x.blob), mime);
        if (blob && blob.size > 0) {
          if (sessionUrlRef.current) URL.revokeObjectURL(sessionUrlRef.current);
          const url = URL.createObjectURL(blob);
          sessionUrlRef.current = url;
          setSessionUrl(url);
        }
      } else {
        setBufferedSec(0);
        setHasStoppedClip(false);
      }
    };

    const rec = recorderRef.current;
    if (wasRecording && rec && rec.state !== "inactive") {
      // Wait for the recorder's final chunk before building the file.
      rec.onstop = () => finish();
      try {
        rec.stop();
      } catch {
        finish();
      }
      return;
    }
    finish();
  }, [buildDecodableBlob, cleanup, mode]);


  const swap = useCallback(async () => {
    const next: Facing = facing === "user" ? "environment" : "user";
    setFacing(next);
    if (running && (mode === "streaming" || mode === "recording")) {
      await start(mode, next);
    }
  }, [facing, running, mode, start]);


  const liveExpanded = expanded === "live";
  const delayedExpanded = expanded === "delayed";

  /** Expand one panel to fill the screen. Implemented as a full-viewport
   * overlay because iOS Safari does not support requestFullscreen on
   * arbitrary elements (a <canvas> in particular) — the real Fullscreen API
   * is only used as an enhancement where it exists. The camera stream and the
   * delayed frame buffer keep running: only CSS changes. */
  const toggleExpanded = useCallback((which: "live" | "delayed") => {
    setExpanded((cur) => {
      const next = cur === which ? null : which;
      try {
        if (next && document.fullscreenEnabled && !document.fullscreenElement) {
          void document.documentElement.requestFullscreen?.().catch(() => {});
        } else if (!next && document.fullscreenElement) {
          void document.exitFullscreen?.().catch(() => {});
        }
      } catch { /* enhancement only */ }
      return next;
    });
  }, []);

  // Esc and hardware/browser back close the expanded view.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(null);
    };
    const onPop = () => setExpanded(null);
    window.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onPop);
    try { window.history.pushState({ delaycamExpanded: true }, ""); } catch { /* ignore */ }
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPop);
    };
  }, [expanded]);

  const cameraLabel = facing === "user" ? "Front" : "Rear";

  return (
    <Card className="p-4 space-y-4 border-2 border-dashed border-red-500">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary" /> DelayCam — watch yourself back
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Live camera that plays back 1–55 seconds behind. Record the whole session, then watch it
            all back and draw on it. No scores, no report card.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {running ? (
            <Button size="sm" variant="destructive" onClick={stop} disabled={transitioning} className="gap-1.5">
              <CameraOff className="h-4 w-4" /> Stop
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                onClick={() => { fullReset(); void start("recording"); }}
                disabled={transitioning || !canRecord}
                className="gap-1.5"
                title={canRecord
                  ? "Record the whole session so you can watch it back, draw on it, and save it."
                  : "This browser can't record video, so there'd be nothing to watch back. Use Mirror only instead."}
              >
                <Video className="h-4 w-4" /> Record session
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { fullReset(); void start("streaming"); }}
                disabled={transitioning}
                className="gap-1.5"
                title="Delayed mirror only — nothing is recorded or saved. Best for hours-long practice."
              >
                <Eye className="h-4 w-4" /> Mirror only
              </Button>
            </>
          )}
          {running && mode === "streaming" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => { void start("recording"); }}
              disabled={transitioning}
              className="gap-1.5"
              title="Start recording this session so you can watch it back and save it."
            >
              <Video className="h-4 w-4" /> Start recording
            </Button>
          )}
          {running && mode === "recording" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => { void start("streaming"); }}
              disabled={transitioning}
              className="gap-1.5"
              title="Switch to mirror only for long sessions. What you have recorded so far is discarded."
            >
              <Eye className="h-4 w-4" /> Switch to mirror only
            </Button>
          )}
          {(() => {
            // Enable off actual recorded bytes, never off the mode alone.
            const canSave = recordedBytes > 0 && saving === null;
            const saveTip = canSave
              ? ""
              : recordError
                ? "Recording failed, so there's nothing to save."
                : mode === "streaming"
                  ? "Mirror only doesn't record. Press Record session to save."
                  : "Press Record session to capture before saving.";
            return (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={saveClip}
                  disabled={!canSave}
                  className="gap-1.5"
                  title={saveTip || "Download this session to your phone or computer"}
                >
                  <Download className="h-4 w-4" /> Save to device
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void saveToPlayersClub()}
                  disabled={!canSave || !user}
                  className="gap-1.5"
                  title={saveTip || "Save this session to your Players Club library"}
                >
                  {saving === "club" ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookMarked className="h-4 w-4" />}
                  Save to Players Club
                </Button>
              </>
            );
          })()}

        </div>
      </div>


      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {recordError && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Not recording — {recordError} The delayed mirror still works, but nothing is being
            saved from this session.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className={liveExpanded ? "fixed inset-0 z-[120] bg-black flex flex-col" : "space-y-1"}>
          <div
            className={
              liveExpanded
                ? "text-[10px] uppercase tracking-wide text-white/70 px-3 pt-3"
                : "text-[10px] uppercase tracking-wide text-muted-foreground"
            }
          >
            Live
          </div>
          <div className={liveExpanded ? "relative flex-1 min-h-0" : "relative"}>
            <video
              ref={liveRef}
              muted
              playsInline
              autoPlay
              className={
                liveExpanded
                  ? "w-full h-full object-contain bg-black"
                  : "w-full aspect-video rounded-md bg-muted object-cover"
              }
            />
            <Button
              size="icon"
              variant="secondary"
              aria-label={liveExpanded ? "Close full screen live view" : "Expand live view to full screen"}
              onClick={() => toggleExpanded("live")}
              className="absolute top-2 left-2 h-11 w-11 shadow-md bg-background/90 text-foreground hover:bg-background"
            >
              {liveExpanded ? <X className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </Button>
            {hasMulti && (
              <>
                <Button
                  size="sm"
                  onClick={swap}
                  className="absolute top-2 right-2 gap-1.5 shadow-md bg-background/90 text-foreground hover:bg-background"
                >
                  <SwitchCamera className="h-4 w-4" /> Flip camera
                </Button>
                <Badge
                  variant="secondary"
                  className="absolute bottom-2 left-2 pointer-events-none bg-background/80 text-foreground"
                >
                  {cameraLabel} camera
                </Badge>
              </>
            )}
            {liveExpanded && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => toggleExpanded("live")}
                className="absolute bottom-3 right-3 gap-1.5"
              >
                <X className="h-4 w-4" /> Close
              </Button>
            )}
          </div>
        </div>
        <div className={delayedExpanded ? "fixed inset-0 z-[120] bg-black flex flex-col" : "space-y-1"}>
          <div
            className={
              delayedExpanded
                ? "text-[10px] uppercase tracking-wide text-white/70 px-3 pt-3"
                : "text-[10px] uppercase tracking-wide text-muted-foreground"
            }
          >
            Delayed ({delay}s behind)
          </div>
          <div className={delayedExpanded ? "relative flex-1 min-h-0" : "relative"}>
            <canvas
              ref={delayedCanvasRef}
              className={
                delayedExpanded
                  ? "w-full h-full object-contain bg-black"
                  : "w-full aspect-video rounded-md bg-muted object-cover"
              }
            />
            <Button
              size="icon"
              variant="secondary"
              aria-label={
                delayedExpanded ? "Close full screen delayed view" : "Expand delayed view to full screen"
              }
              onClick={() => toggleExpanded("delayed")}
              className="absolute top-2 left-2 h-11 w-11 shadow-md bg-background/90 text-foreground hover:bg-background"
            >
              {delayedExpanded ? <X className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </Button>
            {delayedExpanded && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => toggleExpanded("delayed")}
                className="absolute bottom-3 right-3 gap-1.5"
              >
                <X className="h-4 w-4" /> Close
              </Button>
            )}
          </div>
        </div>
      </div>


      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Playback delay</span>
          <span className="tabular-nums text-muted-foreground">{delay}s</span>
        </div>
        <Slider
          value={[delay]}
          min={MIN_DELAY}
          max={MAX_DELAY}
          step={1}
          onValueChange={(v) => setDelay(v[0] ?? MIN_DELAY)}
        />
        <div className="flex flex-wrap gap-1.5 pt-1">
          {PRESETS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setDelay(s)}
              className={
                "text-[11px] px-2.5 py-1 rounded-full border transition-colors " +
                (delay === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground hover:bg-muted border-border")
              }
            >
              {s}s
            </button>
          ))}
        </div>
      </div>




      {hasStoppedClip && (
        <div className="space-y-2 rounded-md border p-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <div className="text-sm font-medium">Watch the whole session back</div>
              <p className="text-xs text-muted-foreground">
                Play it, slow it down, step frame by frame, and draw lines or angles on top to
                critique yourself. Nothing here is scored or sent anywhere.
              </p>
            </div>
            {!sessionUrl && (
              <Button size="sm" onClick={openSessionReview} className="gap-1.5">
                <Play className="h-4 w-4" /> Open session review
              </Button>
            )}
          </div>
          {sessionUrl && <SessionReviewPlayer url={sessionUrl} />}
        </div>
      )}

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">

        <Badge variant={running || hasStoppedClip ? "default" : "outline"} className="text-[10px]">
          {running
            ? hidden
              ? "Paused (background)"
              : mode === "streaming"
                ? "Streaming"
                : "Recording"
            : hasStoppedClip
              ? "Stopped — clip ready"
              : "Idle"}
        </Badge>
        <span>Delay {delay}s</span>
        <span>·</span>
        <span>Buffer {bufferedSec.toFixed(1)}s</span>
        <span>·</span>
        <span>Camera: {facing === "user" ? "Front" : "Rear"}</span>
        {mode === "streaming" && running && (
          <>
            <span>·</span>
            <span>Long-session mode</span>
          </>
        )}
      </div>
    </Card>
  );
}

export default DelayCam;
