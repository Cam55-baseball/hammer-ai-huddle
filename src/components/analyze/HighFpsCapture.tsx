/**
 * HighFpsCapture — in-app recording that explicitly asks the device camera for
 * the highest frame rate it can deliver (ideal 120fps, usable floor 60fps).
 *
 * Why: ball tracking fails on 30fps footage. The detector is fine — motion
 * blur between frames is what loses the ball once it leaves the hand. Asking
 * the camera directly (instead of accepting whatever file the athlete already
 * has) is the fix, and it's what in-app-capture competitors do.
 *
 * The athlete never picks a frame rate. We ask, we measure what actually came
 * back, we say so honestly BEFORE they record, and we store the achieved rate
 * with the video so downstream analysis can scope its claims.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Camera, CameraOff, SwitchCamera, Video, Square, Download, BookMarked,
  Sparkles, Loader2, AlertCircle, Gauge, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { generateVideoThumbnail, uploadVideoThumbnail } from "@/lib/videoHelpers";
import { probeVideoMetadata } from "@/lib/biomech/probeVideoMetadata";
import { extractKeyFramesDeterministic } from "@/lib/frameExtraction";
import { emitVideoMoment } from "@/lib/videoMoments/bus";
import { useSideContext } from "@/contexts/SideContext";
import { toast } from "sonner";
import {
  analysisScopeForFps,
  describeCaptureFps,
  highFpsVideoConstraints,
  readTrackFps,
  tryRaiseTrackFps,
  type CameraFpsCapability,
  FPS_TARGET,
} from "@/lib/capture/highFpsCapture";

type ClipModule = "hitting" | "pitching" | "throwing";
type ClipSport = "baseball" | "softball";
type Facing = "user" | "environment";

interface HighFpsCaptureProps {
  module?: ClipModule;
  sport?: ClipSport;
}

const MAX_RECORD_SEC = 30;

function pickRecorderMime(): string {
  const candidates = [
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return "video/webm";
}

export function HighFpsCapture({ module: moduleProp, sport: sportProp }: HighFpsCaptureProps = {}) {
  const { user } = useOptionalAuth();
  const resolvedModule: ClipModule = moduleProp ?? "hitting";
  const resolvedSport: ClipSport =
    sportProp ??
    ((typeof window !== "undefined" && (localStorage.getItem("selectedSport") as ClipSport)) ||
      "baseball");
  const sideDiscipline: "hit" | "throw" = resolvedModule === "hitting" ? "hit" : "throw";
  const { selectedSide, shouldShowPicker } = useSideContext();
  const activeSide = selectedSide[sideDiscipline];
  const requiresSideConfirmation = shouldShowPicker(sideDiscipline);

  const liveRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeRef = useRef<string>("video/webm");
  const clipUrlRef = useRef<string | null>(null);
  const recordStartRef = useRef<number>(0);
  const recordFramesRef = useRef<number>(0);
  const rvfcIdRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);

  const [facing, setFacing] = useState<Facing>("environment");
  const [starting, setStarting] = useState(false);
  const [live, setLive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cap, setCap] = useState<CameraFpsCapability | null>(null);
  const [clip, setClip] = useState<{ blob: Blob; achievedFps: number | null } | null>(null);
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState<null | "club" | "analyze">(null);

  const teardown = useCallback(() => {
    if (rvfcIdRef.current != null) {
      try { (liveRef.current as any)?.cancelVideoFrameCallback?.(rvfcIdRef.current); } catch { /* noop */ }
      rvfcIdRef.current = null;
    }
    if (stopTimerRef.current != null) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    try { recorderRef.current?.state !== "inactive" && recorderRef.current?.stop(); } catch { /* noop */ }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => { try { t.stop(); } catch { /* noop */ } });
    streamRef.current = null;
    if (liveRef.current) liveRef.current.srcObject = null;
  }, []);

  useEffect(() => () => {
    teardown();
    if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current);
  }, [teardown]);

  /** Turn on the camera at the highest rate the device will give us, then
   * measure what it actually delivered and report it plainly. */
  const startCamera = useCallback(async (nextFacing?: Facing) => {
    setStarting(true);
    setError(null);
    setCap(null);
    teardown();
    const useFacing = nextFacing ?? facing;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: highFpsVideoConstraints(useFacing),
        audio: false,
      });
      streamRef.current = stream;

      // Some cameras negotiate 30fps first and only honour 60/120 on a
      // second application of the constraint.
      const first = readTrackFps(stream);
      if (!first.settingsFps || first.settingsFps < 60) {
        await tryRaiseTrackFps(stream);
      }

      const lv = liveRef.current;
      if (!lv) throw new Error("Camera view isn't ready yet.");
      lv.srcObject = stream;
      lv.muted = true;
      lv.playsInline = true;
      await lv.play().catch(() => {});
      await new Promise<void>((resolve) => {
        if (lv.videoWidth > 0) return resolve();
        lv.addEventListener("loadedmetadata", () => resolve(), { once: true });
      });

      const capability = await describeCaptureFps(stream, lv);
      setCap(capability);
      setLive(true);
    } catch (e: any) {
      const name = e?.name || "";
      setError(
        name === "NotAllowedError"
          ? "Camera permission was denied. Turn it on for this site in your browser settings, then try again."
          : name === "NotFoundError"
            ? "No camera found on this device."
            : name === "NotReadableError"
              ? "Your camera is already being used by another app. Close it and try again."
              : e?.message || "Couldn't turn on the camera.",
      );
      teardown();
      setLive(false);
    } finally {
      setStarting(false);
    }
  }, [facing, teardown]);

  const stopCamera = useCallback(() => {
    teardown();
    setLive(false);
    setRecording(false);
    setCap(null);
  }, [teardown]);

  const swapCamera = useCallback(async () => {
    const next: Facing = facing === "user" ? "environment" : "user";
    setFacing(next);
    if (live) await startCamera(next);
  }, [facing, live, startCamera]);

  const finishRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state === "inactive") return;
    try { rec.stop(); } catch { /* noop */ }
  }, []);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    const lv = liveRef.current;
    if (!stream || !lv) return;
    if (clipUrlRef.current) {
      URL.revokeObjectURL(clipUrlRef.current);
      clipUrlRef.current = null;
      setClipUrl(null);
    }
    setClip(null);
    chunksRef.current = [];
    recordFramesRef.current = 0;
    recordStartRef.current = performance.now();
    setElapsed(0);

    // Count every decoded frame for the duration of the recording — this is
    // the achieved frame rate we persist, not a number we assumed.
    const anyEl = lv as any;
    if (typeof anyEl.requestVideoFrameCallback === "function") {
      const tick = () => {
        recordFramesRef.current += 1;
        setElapsed((performance.now() - recordStartRef.current) / 1000);
        rvfcIdRef.current = anyEl.requestVideoFrameCallback(tick);
      };
      rvfcIdRef.current = anyEl.requestVideoFrameCallback(tick);
    }

    const mime = pickRecorderMime();
    mimeRef.current = mime;
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 });
    } catch {
      rec = new MediaRecorder(stream);
    }
    recorderRef.current = rec;
    rec.ondataavailable = (ev) => { if (ev.data?.size) chunksRef.current.push(ev.data); };
    rec.onstop = () => {
      if (rvfcIdRef.current != null) {
        try { anyEl.cancelVideoFrameCallback?.(rvfcIdRef.current); } catch { /* noop */ }
        rvfcIdRef.current = null;
      }
      const secs = (performance.now() - recordStartRef.current) / 1000;
      const measured = secs > 0.4 && recordFramesRef.current > 4
        ? recordFramesRef.current / secs
        : cap?.effectiveFps ?? null;
      const blob = new Blob(chunksRef.current, { type: mimeRef.current });
      const url = URL.createObjectURL(blob);
      clipUrlRef.current = url;
      setClipUrl(url);
      setClip({ blob, achievedFps: measured });
      setRecording(false);
    };
    rec.start(200);
    setRecording(true);
    stopTimerRef.current = window.setTimeout(finishRecording, MAX_RECORD_SEC * 1000);
  }, [cap, finishRecording]);

  const downloadClip = useCallback(() => {
    if (!clip) return;
    const ext = mimeRef.current.includes("mp4") ? "mp4" : "webm";
    const a = document.createElement("a");
    a.href = clipUrlRef.current!;
    a.download = `hammer-capture-${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [clip]);

  const save = useCallback(async (opts: { analyze: boolean }) => {
    if (!user) { toast.error("Sign in to save this clip."); return; }
    if (!clip) { toast.error("Record a clip first."); return; }
    if (requiresSideConfirmation && !activeSide) {
      toast.error(
        sideDiscipline === "hit"
          ? "Confirm the batting side used in this clip before saving."
          : "Confirm the throwing hand used in this clip before saving.",
      );
      return;
    }

    setSaving(opts.analyze ? "analyze" : "club");
    const toastId = toast.loading(opts.analyze ? "Saving & analyzing…" : "Saving to Players Club…");
    try {
      const { data: sessionCheck } = await supabase.auth.getSession();
      if (sessionCheck?.session?.user?.id !== user.id) {
        toast.error("Your session expired. Sign in again to save this clip.", { id: toastId });
        setSaving(null);
        return;
      }

      const mime = mimeRef.current;
      const ext = mime.includes("mp4") ? "mp4" : "webm";
      const ts = Date.now();
      const file = new File([clip.blob], `capture-${ts}.${ext}`, { type: mime });
      const filePath = `${user.id}/capture/${ts}.${ext}`;

      let probed: Awaited<ReturnType<typeof probeVideoMetadata>>;
      try {
        probed = await probeVideoMetadata(file);
      } catch {
        toast.error("Couldn't read the recorded clip. Record it again.", { id: toastId });
        setSaving(null);
        return;
      }

      // Achieved fps: the live count wins (WebM containers frequently report a
      // wrong nominal rate); the file probe is the fallback.
      const achievedFps = clip.achievedFps ?? probed.fps_true;
      const fpsSource: string = clip.achievedFps != null ? "measured" : "file_probe";
      const scope = analysisScopeForFps(achievedFps);

      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(filePath, file, { contentType: mime, upsert: false });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("videos").getPublicUrl(filePath);

      let thumbnailUrl: string | null = null;
      try {
        const thumbBlob = await generateVideoThumbnail(file, 0.1);
        thumbnailUrl = await uploadVideoThumbnail(thumbBlob, user.id, filePath);
      } catch { /* thumbnails are best-effort */ }

      const sideStamp = requiresSideConfirmation
        ? sideDiscipline === "hit" ? { batting_side: activeSide } : { throwing_hand: activeSide }
        : {};

      const { data: videoRow, error: insertError } = await supabase
        .from("videos")
        .insert([{
          user_id: user.id,
          sport: resolvedSport,
          module: resolvedModule,
          video_url: publicUrl,
          thumbnail_url: thumbnailUrl,
          status: opts.analyze ? "processing" : "completed",
          library_title: `In-app capture — ${new Date().toLocaleString()}`,
          saved_to_library: true,
          sha256_hex: probed.sha256_hex,
          fps_true: probed.fps_true,
          duration_sec: probed.duration_sec,
          width: probed.width,
          height: probed.height,
          orientation: probed.orientation,
          capture_source: "in_app_capture",
          requested_fps: FPS_TARGET,
          achieved_fps: achievedFps,
          capture_fps_tier: cap?.tier ?? null,
          capture_fps_source: fpsSource,
          ...sideStamp,
        }] as never)
        .select("id")
        .single();
      if (insertError) throw insertError;

      emitVideoMoment({
        kind: "delaycam_saved",
        skillDomain: resolvedModule,
        sport: resolvedSport as any,
        label: "Your clip",
      });

      if (!opts.analyze) {
        toast.success(`Saved to Players Club. ${scope.note}`, { id: toastId });
        setSaving(null);
        return;
      }

      toast.loading("Extracting frames…", { id: toastId });
      const extraction = await extractKeyFramesDeterministic({
        videoFile: file,
        fps_true: probed.fps_true,
        duration_sec: probed.duration_sec,
        landingTime: null,
      });
      if (extraction.frames.length < 3) throw new Error("not_enough_frames");

      toast.loading("Hammer is analyzing your clip…", { id: toastId });
      const { error: fnError } = await supabase.functions.invoke("analyze-video", {
        body: {
          videoId: (videoRow as { id: string }).id,
          module: resolvedModule,
          sport: resolvedSport,
          userId: user.id,
          frames: extraction.frames.map((f) => f.dataUrl),
          frameExtractions: extraction.frames.map((f) => ({
            frame_index: f.frame_index,
            timestamp_seconds: f.timestamp_seconds,
            sha256_hex: f.sha256_hex,
            width: f.width,
            height: f.height,
          })),
          captureFps: achievedFps,
          ballTrackingEligible: scope.ballTracking,
        },
      });
      if (fnError) throw fnError;
      toast.success(`Analysis complete. ${scope.note}`, { id: toastId });
    } catch (e: any) {
      console.error("[HighFpsCapture] save failed", e);
      toast.error(
        e?.message === "not_enough_frames"
          ? "Saved, but the clip was too short to analyze."
          : "Couldn't finish saving this clip. Try again.",
        { id: toastId },
      );
    } finally {
      setSaving(null);
    }
  }, [activeSide, cap, clip, requiresSideConfirmation, resolvedModule, resolvedSport, sideDiscipline, user]);

  const tierBadge = (() => {
    if (!cap) return null;
    const label = cap.effectiveFps ? `${Math.round(cap.effectiveFps)} fps` : "fps unknown";
    const cls =
      cap.tier === "elite" || cap.tier === "good"
        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    return <Badge variant="outline" className={cls}><Gauge className="h-3 w-3 mr-1" />{label}</Badge>;
  })();

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" /> Record in the app
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            We ask your camera for the fastest recording it can do — you just press record.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {tierBadge}
          {!live ? (
            <Button size="sm" onClick={() => void startCamera()} disabled={starting} className="gap-1.5">
              {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {starting ? "Checking your camera…" : "Turn on camera"}
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => void swapCamera()} className="gap-1.5">
                <SwitchCamera className="h-4 w-4" /> Flip
              </Button>
              <Button size="sm" variant="destructive" onClick={stopCamera} className="gap-1.5">
                <CameraOff className="h-4 w-4" /> Turn off
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Honest, pre-record capability read. */}
      {cap && (
        <div
          className={`flex items-start gap-2 rounded-md border p-2.5 text-xs ${
            cap.tier === "elite" || cap.tier === "good"
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-amber-500/40 bg-amber-500/5"
          }`}
        >
          {cap.tier === "elite" || cap.tier === "good" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
          )}
          <span className="leading-snug">{cap.message}</span>
        </div>
      )}

      <div className="relative">
        <video
          ref={liveRef}
          muted
          playsInline
          autoPlay
          className="w-full aspect-video rounded-md bg-muted object-cover"
        />
        {recording && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            {elapsed.toFixed(1)}s
          </div>
        )}
      </div>

      {live && (
        <div className="flex items-center gap-2 flex-wrap">
          {!recording ? (
            <Button size="sm" onClick={startRecording} className="gap-1.5">
              <Video className="h-4 w-4" /> Record
            </Button>
          ) : (
            <Button size="sm" variant="destructive" onClick={finishRecording} className="gap-1.5">
              <Square className="h-4 w-4" /> Stop
            </Button>
          )}
          <span className="text-[11px] text-muted-foreground">
            Recording stops automatically after {MAX_RECORD_SEC}s.
          </span>
        </div>
      )}

      {clip && (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs font-semibold">Your clip</div>
            {clip.achievedFps != null && (
              <Badge variant="outline" className="text-[10px]">
                Recorded at {Math.round(clip.achievedFps)} fps
              </Badge>
            )}
          </div>
          {clipUrl && (
            <video src={clipUrl} controls playsInline className="w-full rounded-md bg-black max-h-64" />
          )}
          <p className="text-[11px] text-muted-foreground">
            {analysisScopeForFps(clip.achievedFps).note}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={downloadClip} className="gap-1.5">
              <Download className="h-4 w-4" /> Save to device
            </Button>
            <Button
              size="sm" variant="outline" disabled={!user || saving !== null}
              onClick={() => void save({ analyze: false })} className="gap-1.5"
            >
              {saving === "club" ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookMarked className="h-4 w-4" />}
              Save to Players Club
            </Button>
            <Button
              size="sm" disabled={!user || saving !== null}
              onClick={() => void save({ analyze: true })} className="gap-1.5"
            >
              {saving === "analyze" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Save & Analyze
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
