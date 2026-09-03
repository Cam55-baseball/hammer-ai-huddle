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
import { SessionReviewPlayer, type SessionNote } from "@/components/analyze/SessionReviewPlayer";
import { pickRecorderMime, repairRecording } from "@/lib/delaycam/recording";
import { renderAnnotatedCopy } from "@/lib/delaycam/burnIn";
import type { AnnotatedExportRequest } from "@/components/analyze/SessionReviewPlayer";


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

// Recorder codec choice and duration repair live in @/lib/delaycam/recording so
// the marked-up export produces files in exactly the same shape as a session.



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
  /** Lets the memory-cap timer stop the session without a declaration cycle. */
  const stopRef = useRef<(() => void) | null>(null);


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
  const [saving, setSaving] = useState<null | "club" | "annotated">(null);
  /** Set once the session has a `videos` row, so a marked-up copy can attach to it. */
  const savedVideoIdRef = useRef<string | null>(null);
  const [savedVideoId, setSavedVideoId] = useState<string | null>(null);
  /** Marked-up copy: rendered on the device, held here until the user saves it. */
  const annotatedBlobRef = useRef<Blob | null>(null);
  const annotatedUrlRef = useRef<string | null>(null);
  const [annotatedUrl, setAnnotatedUrl] = useState<string | null>(null);
  const [hasAnnotatedCopy, setHasAnnotatedCopy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const exportAbortRef = useRef<AbortController | null>(null);


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
  /**
   * Notes taken on the recorded session. They live here, not in the review
   * player, because the recording has no database row until it is saved to
   * Players Club — at which point these are written to `video_notes`.
   */
  const [notes, setNotes] = useState<SessionNote[]>([]);
  /** Mic stream kept open across voice notes so iOS doesn't re-prompt. */
  const noteMicRef = useRef<MediaStream | null>(null);


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

  /**
   * Microphone for voice notes. The camera stream is torn down at Stop, so we
   * open a mic-only stream once and hold it — the permission granted during
   * recording means iOS Safari doesn't prompt again.
   */
  const getNoteMicStream = useCallback(async (): Promise<MediaStream> => {
    const existing = noteMicRef.current;
    if (existing && existing.getAudioTracks().some((t) => t.readyState === "live")) return existing;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    noteMicRef.current = stream;
    return stream;
  }, []);

  useEffect(
    () => () => { noteMicRef.current?.getTracks().forEach((t) => t.stop()); },
    [],
  );




  const recordedFileName = useCallback((suffix = "") => {
    const mime = recordedBlobRef.current?.type || mimeRef.current || "video/webm";
    const ext = mime.includes("mp4") ? "mp4" : "webm";
    return `delaycam${suffix}-${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`;
  }, []);

  /**
   * Save any recorded blob to the device. iOS Safari ignores <a download>, and
   * almost all of our users are on phones, so the Web Share sheet ("Save Video"
   * / "Save to Files") is the primary path and the anchor download is the
   * desktop fallback. We only claim success when a path actually completed.
   */
  const shareOrDownload = useCallback(async (blob: Blob, name: string, label: string) => {
    const file = new File([blob], name, { type: blob.type || "video/webm" });
    const nav = navigator as any;
    if (typeof nav.canShare === "function" && nav.canShare({ files: [file] }) && typeof nav.share === "function") {
      try {
        await nav.share({ files: [file], title: label });
        toast.success("Saved from the share sheet.");
        return;
      } catch (e: any) {
        if (e?.name === "AbortError") return; // user cancelled — say nothing
        console.warn("[DelayCam] share failed, falling back to download", e);
      }
    }
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 15000);
      toast.success("Saved to your device.");
    } catch (e: any) {
      console.error("[DelayCam] save to device failed", e);
      toast.error(e?.message || "Couldn't save this video to your device.");
    }
  }, []);

  const saveClip = useCallback(async () => {
    const blob = recordedBlobRef.current;
    if (!blob || blob.size === 0) {
      toast.error("Nothing recorded yet — press Record session first.");
      return;
    }
    await shareOrDownload(blob, recordedFileName(), "DelayCam session");
  }, [recordedFileName, shareOrDownload]);

  /** Build a playable URL for the entire recorded session so the athlete can
   * watch it all back with the drawing tools. */
  const openSessionReview = useCallback(() => {
    const blob = recordedBlobRef.current;
    if (!blob || blob.size === 0) {
      toast.error("Nothing recorded yet — press Record session first.");
      return;
    }
    if (sessionUrlRef.current) URL.revokeObjectURL(sessionUrlRef.current);
    const url = URL.createObjectURL(blob);
    sessionUrlRef.current = url;
    setSessionUrl(url);
  }, []);

  /**
   * Upload one video file and create its `videos` row. Used for both the
   * recorded session ('original') and the marked-up copy ('annotated'), so the
   * copy lands with exactly the same handling as the session it came from.
   * Notes are only written for the original — the copy is the same session.
   */
  const uploadSessionVideo = useCallback(async (
    blob: Blob,
    opts: { variant: "original" | "annotated"; parentVideoId?: string | null; withNotes: boolean },
  ): Promise<{ videoId: string; failedNotes: string[] }> => {
    if (!user) throw new Error("Sign in to save clips to Players Club.");
    const mime = blob.type || mimeRef.current || "video/webm";
    const ext = mime.includes("mp4") ? "mp4" : "webm";
    const ts = Date.now();
    const kind = opts.variant === "annotated" ? "delaycam-marked" : "delaycam";
    const filePath = `${user.id}/${kind}/${ts}.${ext}`;
    const file = new File([blob], `${kind}-${ts}.${ext}`, { type: mime });

    // Phase 0 probe — required by the videos schema.
    let probed: Awaited<ReturnType<typeof probeVideoMetadata>>;
    try {
      probed = await probeVideoMetadata(file);
    } catch (probeErr: any) {
      console.error("[DelayCam] probe failed", probeErr);
      throw new Error(`Couldn't read the video: ${probeErr?.message || "unknown decode error"}`);
    }

    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(filePath, file, { contentType: mime, upsert: false });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from("videos").getPublicUrl(filePath);

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

    const { data: insertedVideo, error: insertError } = await supabase
      .from("videos")
      .insert([{
        user_id: user.id,
        sport: resolvedSport,
        module: resolvedModule,
        video_url: publicUrl,
        thumbnail_url: thumbnailUrl,
        status: "completed",
        library_title: opts.variant === "annotated"
          ? `DelayCam session — marked up — ${new Date().toLocaleString()}`
          : `DelayCam session — ${new Date().toLocaleString()}`,
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
        variant: opts.variant,
        parent_video_id: opts.parentVideoId ?? null,
        ...sideStamp,
      }] as never)
      .select("id")
      .single();
    if (insertError) throw insertError;

    const videoId = (insertedVideo as { id: string } | null)?.id ?? "";

    // Notes ride along with the original clip. Each one is reported
    // individually so a partial failure is never presented as a clean save.
    const failedNotes: string[] = [];
    if (opts.withNotes && videoId && notes.length > 0) {
      for (const note of notes) {
        const label = note.timestampSec != null
          ? `note at ${Math.floor(note.timestampSec / 60)}:${String(Math.floor(note.timestampSec % 60)).padStart(2, "0")}`
          : "session note";
        try {
          let audioUrl: string | null = null;
          if (note.kind === "voice" && note.audioBlob) {
            const aType = note.audioBlob.type || "audio/webm";
            const aExt = aType.includes("mp4") ? "m4a" : "webm";
            const aPath = `${user.id}/delaycam-notes/${videoId}/${note.id}.${aExt}`;
            const { error: aErr } = await supabase.storage
              .from("videos")
              .upload(aPath, note.audioBlob, { contentType: aType, upsert: false });
            if (aErr) throw aErr;
            audioUrl = supabase.storage.from("videos").getPublicUrl(aPath).data.publicUrl;
          }
          const { error: noteErr } = await supabase.from("video_notes").insert([{
            user_id: user.id,
            video_id: videoId,
            timestamp_sec: note.timestampSec,
            kind: note.kind,
            body: note.body,
            audio_url: audioUrl,
            duration_sec: note.durationSec,
          }] as never);
          if (noteErr) throw noteErr;
        } catch (noteFail: any) {
          console.error("[DelayCam] note save failed", note.id, noteFail);
          failedNotes.push(`${label} (${noteFail?.message || "unknown error"})`);
        }
      }
    }

    return { videoId, failedNotes };
  }, [
    activeSide, notes, resolvedModule, resolvedSport, shouldShowPicker, sideDiscipline, user,
  ]);

  /** Shared guard so both save buttons refuse for the same honest reasons. */
  const preflightSave = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast.error("Sign in to save clips to Players Club.");
      return false;
    }
    if (requiresSideConfirmation && !activeSide) {
      toast.error(
        sideDiscipline === "hit"
          ? "Confirm the batting side used in this clip before saving."
          : "Confirm the throwing hand used in this clip before saving.",
      );
      return false;
    }
    // Session preflight — surface a clear error instead of a silent RLS reject.
    const { data: sessionCheck } = await supabase.auth.getSession();
    const liveSession = sessionCheck?.session ?? null;
    if (!liveSession?.user?.id || liveSession.user.id !== user.id) {
      toast.error("Your session expired. Sign in again to save this clip.");
      return false;
    }
    return true;
  }, [activeSide, requiresSideConfirmation, sideDiscipline, user]);

  const saveToPlayersClub = useCallback(async () => {
    const blob = recordedBlobRef.current;
    if (!blob || blob.size === 0) {
      toast.error("Nothing to save yet — record a clip first.");
      return;
    }
    if (!(await preflightSave())) return;

    setSaving("club");
    const toastId = toast.loading("Saving to Players Club…");
    try {
      if (savedVideoIdRef.current) {
        toast.success("This session is already in Players Club.", { id: toastId });
        return;
      }
      const { videoId, failedNotes } = await uploadSessionVideo(blob, {
        variant: "original",
        withNotes: true,
      });
      savedVideoIdRef.current = videoId;
      setSavedVideoId(videoId);
      if (failedNotes.length > 0) {
        toast.error(
          `Video saved, but ${failedNotes.length} of ${notes.length} notes didn't save: ${failedNotes.join("; ")}`,
          { id: toastId, duration: 12000 },
        );
      } else {
        toast.success(
          notes.length > 0
            ? `Saved to Players Club with ${notes.length} note${notes.length === 1 ? "" : "s"}.`
            : "Saved to Players Club.",
          { id: toastId },
        );
      }
      fireDelayCamMoment();
    } catch (e: any) {
      console.error("[DelayCam] save to club failed", e);
      const reason = e?.message || e?.error_description || e?.error || "unknown error";
      toast.error(`Couldn't save to Players Club: ${reason}`, { id: toastId });
    } finally {
      setSaving(null);
    }
  }, [fireDelayCamMoment, notes, preflightSave, uploadSessionVideo]);

  /**
   * Render a copy of the session with the drawings burned into the picture.
   * This plays the whole session through in real time, so it takes as long as
   * the session does — hence the progress read-out and the cancel button.
   */
  const handleExportAnnotated = useCallback(async (req: AnnotatedExportRequest) => {
    if (!sessionUrlRef.current) {
      toast.error("Open the session review first.");
      return;
    }
    if (req.shapes.length === 0) {
      toast.error("Draw on the video first — there's nothing to burn in yet.");
      return;
    }
    const controller = new AbortController();
    exportAbortRef.current = controller;
    setExportProgress(0);
    setExporting(true);
    if (annotatedUrlRef.current) {
      URL.revokeObjectURL(annotatedUrlRef.current);
      annotatedUrlRef.current = null;
    }
    annotatedBlobRef.current = null;
    setHasAnnotatedCopy(false);

    try {
      const { blob } = await renderAnnotatedCopy({
        sourceUrl: sessionUrlRef.current,
        shapes: req.shapes,
        includeVideoSound: req.includeVideoSound,
        includeVoiceNotes: req.includeVoiceNotes,
        voiceNotes: notes
          .filter((n) => n.kind === "voice")
          .map((n) => ({ id: n.id, timestampSec: n.timestampSec, audioBlob: n.audioBlob ?? null })),
        onProgress: (f) => setExportProgress(f),
        signal: controller.signal,
      });
      annotatedBlobRef.current = blob;
      const url = URL.createObjectURL(blob);
      annotatedUrlRef.current = url;
      setAnnotatedUrl(url);
      setHasAnnotatedCopy(true);
      toast.success("Marked-up copy ready. You can save it to your device or Players Club.");
    } catch (e: any) {
      const msg = e?.message || "the marked-up copy couldn't be made";
      if (msg === "Export cancelled.") {
        toast.message("Export cancelled.");
      } else {
        console.error("[DelayCam] annotated export failed", e);
        toast.error(`Couldn't make the marked-up copy: ${msg}`);
      }
    } finally {
      exportAbortRef.current = null;
      setExporting(false);
    }
  }, [notes]);

  const cancelExport = useCallback(() => {
    exportAbortRef.current?.abort();
  }, []);

  const saveAnnotatedToDevice = useCallback(async () => {
    const blob = annotatedBlobRef.current;
    if (!blob || blob.size === 0) {
      toast.error("Make the marked-up copy first.");
      return;
    }
    await shareOrDownload(blob, recordedFileName("-marked"), "DelayCam session (marked up)");
  }, [recordedFileName, shareOrDownload]);

  /**
   * Put the marked-up copy in Players Club, attached to the same session entry.
   * If the session itself hasn't been saved yet we save it first, so the user
   * presses one button and doesn't have to remember an order.
   */
  const saveAnnotatedToPlayersClub = useCallback(async () => {
    const copy = annotatedBlobRef.current;
    if (!copy || copy.size === 0) {
      toast.error("Make the marked-up copy first.");
      return;
    }
    const original = recordedBlobRef.current;
    if (!original || original.size === 0) {
      toast.error("The original session is no longer in memory — record again.");
      return;
    }
    if (!(await preflightSave())) return;

    setSaving("annotated");
    const toastId = toast.loading("Saving the marked-up copy…");
    try {
      let parentId = savedVideoIdRef.current;
      if (!parentId) {
        toast.loading("Saving the session first…", { id: toastId });
        const first = await uploadSessionVideo(original, { variant: "original", withNotes: true });
        parentId = first.videoId;
        savedVideoIdRef.current = parentId;
        setSavedVideoId(parentId);
        if (first.failedNotes.length > 0) {
          toast.error(
            `Session saved, but ${first.failedNotes.length} note(s) didn't save: ${first.failedNotes.join("; ")}`,
            { duration: 12000 },
          );
        }
      }
      toast.loading("Uploading the marked-up copy…", { id: toastId });
      await uploadSessionVideo(copy, {
        variant: "annotated",
        parentVideoId: parentId,
        withNotes: false,
      });
      toast.success("Marked-up copy saved with this session in Players Club.", { id: toastId });
      fireDelayCamMoment();
    } catch (e: any) {
      console.error("[DelayCam] annotated save failed", e);
      toast.error(`Couldn't save the marked-up copy: ${e?.message || "unknown error"}`, { id: toastId });
    } finally {
      setSaving(null);
    }
  }, [fireDelayCamMoment, preflightSave, uploadSessionVideo]);





  const start = useCallback(async (nextMode: "streaming" | "recording", nextFacing?: Facing) => {
    setTransitioning(true);
    streamOnlyRef.current = nextMode === "streaming";
    setHasStoppedClip(false);
    recordedBytesRef.current = 0;
    setRecordedBytes(0);
    recordedBlobRef.current = null;
    // A fresh session invalidates any marked-up copy of the previous one.
    savedVideoIdRef.current = null;
    setSavedVideoId(null);
    annotatedBlobRef.current = null;
    if (annotatedUrlRef.current) {
      URL.revokeObjectURL(annotatedUrlRef.current);
      annotatedUrlRef.current = null;
    }
    setAnnotatedUrl(null);
    setHasAnnotatedCopy(false);
    setExportProgress(0);
    setAudioMissing(false);
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
      // Ask for the fastest frame rate the device can give us, plus sound so a
      // recorded session can actually be listened back to. If the mic is
      // denied or unavailable we still record video and say audio is missing.
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: highFpsVideoConstraints(useFacing),
          audio: true,
        });
      } catch (audioErr: any) {
        // Mic denied or missing must never cost the user their video.
        console.warn("[DelayCam] audio unavailable, continuing video-only", audioErr);

        stream = await navigator.mediaDevices.getUserMedia({
          video: highFpsVideoConstraints(useFacing),
          audio: false,
        });
      }
      if (stream.getAudioTracks().length === 0) setAudioMissing(true);
      streamRef.current = stream;
      // Now that permission has been granted the device list is labelled, so
      // refine what we know about how many cameras this phone really has.
      refreshDevices();
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
          chunksRef.current = [];
          recordStartRef.current = performance.now();
          rec.ondataavailable = (ev) => {
            if (!ev.data || ev.data.size === 0) return;
            chunksRef.current.push(ev.data);
            recordedBytesRef.current += ev.data.size;
            setRecordedBytes(recordedBytesRef.current);
          };
          rec.onerror = (ev: any) => {
            const msg = ev?.error?.message || "Recording failed on this device.";
            console.error("[DelayCam] recorder error", ev);
            setRecordError(msg);
            toast.error(`Recording stopped: ${msg}`);
          };

          // One un-sliced recording so the browser finalises a single complete
          // file on stop — spliced chunks produce an unseekable blob.
          rec.start();
          recordingStarted = true;

          // Safety cap, checked on a timer rather than per-chunk.
          if (capTimerRef.current != null) clearInterval(capTimerRef.current);
          capTimerRef.current = window.setInterval(() => {
            const elapsedSec = (performance.now() - recordStartRef.current) / 1000;
            const estBytes = recordedBytesRef.current;
            if (elapsedSec > MAX_SESSION_SEC || estBytes > MAX_SESSION_BYTES) {
              if (capTimerRef.current != null) { clearInterval(capTimerRef.current); capTimerRef.current = null; }
              toast.info(
                `Recording stopped at the ${Math.round(MAX_SESSION_SEC / 60)}-minute limit. Your session is ready to watch back.`,
              );
              stopRef.current?.();
            }
          }, 5000);
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
  }, [cleanup, facing, refreshDevices]);

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
    recordedBlobRef.current = null;
    // A fresh session invalidates any marked-up copy of the previous one.
    savedVideoIdRef.current = null;
    setSavedVideoId(null);
    annotatedBlobRef.current = null;
    if (annotatedUrlRef.current) {
      URL.revokeObjectURL(annotatedUrlRef.current);
      annotatedUrlRef.current = null;
    }
    setAnnotatedUrl(null);
    setHasAnnotatedCopy(false);
    setExportProgress(0);
    if (sessionUrlRef.current) {
      URL.revokeObjectURL(sessionUrlRef.current);
      sessionUrlRef.current = null;
    }
    setSessionUrl(null);
    // A new session means the previous session's notes no longer apply.
    setNotes((prev) => {
      prev.forEach((n) => { if (n.audioObjectUrl) URL.revokeObjectURL(n.audioObjectUrl); });
      return [];
    });
  }, [cleanup]);

  /** Stop the active session. If the user was recording, finalise the file,
   * repair its duration so it is seekable, and bring up the review player. */
  const stop = useCallback(() => {
    const wasRecording = mode === "recording";
    const durationMs = performance.now() - recordStartRef.current;

    const finish = async () => {
      const parts = wasRecording ? chunksRef.current.slice() : [];
      const mime = recorderRef.current?.mimeType || mimeRef.current || "video/webm";
      cleanup();
      setRunning(false);
      setMode("idle");
      if (!wasRecording || parts.length === 0) {
        setBufferedSec(0);
        setHasStoppedClip(false);
        return;
      }

      const raw = new Blob(parts, { type: mime });
      setRepairing(true);
      try {
        const fixed = await repairRecording(raw, mime, durationMs);
        recordedBlobRef.current = fixed;
        setHasStoppedClip(true);
        if (sessionUrlRef.current) URL.revokeObjectURL(sessionUrlRef.current);
        const url = URL.createObjectURL(fixed);
        sessionUrlRef.current = url;
        setSessionUrl(url);
      } catch (e: any) {
        console.error("[DelayCam] duration repair failed", e);
        recordedBlobRef.current = null;
        setHasStoppedClip(false);
        setRecordError(
          `This recording couldn't be made playable on this device${e?.message ? `: ${e.message}` : "."}`,
        );
        toast.error("This recording couldn't be made playable. Please record again.");
      } finally {
        setRepairing(false);
      }
    };

    const rec = recorderRef.current;
    if (wasRecording && rec && rec.state !== "inactive") {
      // Wait for the recorder's final chunk before building the file.
      rec.onstop = () => { void finish(); };
      try {
        rec.stop();
      } catch {
        void finish();
      }
      return;
    }
    void finish();
  }, [cleanup, mode]);

  useEffect(() => { stopRef.current = stop; }, [stop]);




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
            const canSave = hasStoppedClip && recordedBytes > 0 && !repairing && saving === null;
            const saveTip = canSave
              ? ""
              : repairing
                ? "Getting your session ready…"
                : recordError
                  ? "Recording failed, so there's nothing to save."
                  : mode === "streaming"
                    ? "Mirror only doesn't record. Press Record session to save."
                    : "Press Record session, then Stop, before saving."
            ;

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

      {repairing && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2 text-xs">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Getting your session ready to watch back…</span>
        </div>
      )}

      {audioMissing && (
        <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-2 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>No microphone available, so this session is recording video without sound.</span>
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
            <Button
              size="sm"
              onClick={swap}
              aria-label="Flip camera"
              className="absolute top-2 right-2 gap-1.5 shadow-md bg-background/90 text-foreground hover:bg-background"
            >
              <SwitchCamera className="h-4 w-4" /> Flip camera
            </Button>
            <Badge
              variant="secondary"
              className="absolute bottom-2 left-2 pointer-events-none bg-background/80 text-foreground"
            >
              {cameraLabel} camera{hasMulti ? "" : ""}
            </Badge>

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
          {sessionUrl && (
            <>
              <SessionReviewPlayer
                url={sessionUrl}
                notes={notes}
                onNotesChange={(updater) => setNotes(updater)}
                getMicStream={getNoteMicStream}
                onExportAnnotated={(req) => void handleExportAnnotated(req)}
                exporting={exporting}
              />

              {exporting && (
                <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Making a copy with your drawings in the picture. This plays the session
                    through once, so it takes about as long as the session itself.
                  </p>
                  <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.round(exportProgress * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {Math.round(exportProgress * 100)}%
                    </span>
                    <Button size="sm" variant="outline" onClick={cancelExport}>Cancel</Button>
                  </div>
                </div>
              )}

              {hasAnnotatedCopy && annotatedUrl && !exporting && (
                <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Your marked-up copy is ready — the drawings are now part of the picture, so it
                    plays anywhere. The original session is kept too.
                  </p>
                  <video
                    src={annotatedUrl}
                    controls
                    playsInline
                    className="w-full rounded-md bg-black"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => void saveAnnotatedToDevice()}>
                      Save copy to device
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => void saveAnnotatedToPlayersClub()}
                      disabled={saving !== null}
                    >
                      {saving === "annotated" ? "Saving…" : "Save copy to Players Club"}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {savedVideoId
                      ? "It will be attached to this session in Players Club."
                      : "Saving the copy also saves the original session, so they stay together."}
                  </p>
                </div>
              )}
            </>
          )}
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
