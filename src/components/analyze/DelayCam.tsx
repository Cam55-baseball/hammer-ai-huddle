/**
 * DelayCam — live camera with adjustable 1–55s instant-replay delay.
 * Self-contained, client-only. No uploads, no backend.
 *
 * Delayed mirror is rendered via a canvas frame ring buffer captured from the
 * live <video> using requestVideoFrameCallback (with rAF fallback). This works
 * uniformly on iOS Safari, Android Chrome, and desktop — no MediaSource, no
 * <video src> swaps, no flicker.
 *
 * MediaRecorder runs in parallel purely to power Replay Last Ns and Save clip.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Camera, CameraOff, SwitchCamera, Download, Play, AlertCircle, Timer,
} from "lucide-react";

const PRESETS = [3, 5, 10, 20, 30, 45];
const MIN_DELAY = 1;
const MAX_DELAY = 55;
const MAX_BUFFER_SEC = 55;
const MAX_FRAMES = MAX_BUFFER_SEC * 30 + 30; // safety cap
const MAX_FRAME_W = 1280;
const MAX_FRAME_H = 720;

const REPLAY_DURATIONS = [3, 5, 10, 15];

type Facing = "user" | "environment";

type TimedBlob = { blob: Blob; t: number };
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

export function DelayCam() {
  const liveRef = useRef<HTMLVideoElement>(null);
  const delayedCanvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const replayRef = useRef<HTMLVideoElement>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timedChunksRef = useRef<TimedBlob[]>([]);
  const initChunkRef = useRef<Blob | null>(null);
  const framesRef = useRef<Frame[]>([]);
  const rvfcIdRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const drawRafRef = useRef<number | null>(null);
  const replayUrlRef = useRef<string | null>(null);
  const mimeRef = useRef<string>("video/webm");

  const [running, setRunning] = useState(false);
  const [facing, setFacing] = useState<Facing>("environment");
  const [delay, setDelay] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [bufferedSec, setBufferedSec] = useState(0);
  const [hasMulti, setHasMulti] = useState(false);
  const [replayDuration, setReplayDuration] = useState(5);
  const [replayUrl, setReplayUrl] = useState<string | null>(null);

  const delayRef = useRef(delay);
  useEffect(() => { delayRef.current = delay; }, [delay]);

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices?.().then((d) => {
      setHasMulti(d.filter((x) => x.kind === "videoinput").length > 1);
    }).catch(() => {});
  }, []);

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

    try { recorderRef.current?.state !== "inactive" && recorderRef.current?.stop(); } catch {}
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    timedChunksRef.current = [];
    initChunkRef.current = null;
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

  // Build a decodable Blob by ensuring the recorder's first init segment is always first.
  const buildDecodableBlob = useCallback((body: Blob[], fallbackMime?: string): Blob | null => {
    const init = initChunkRef.current;
    const mime = recorderRef.current?.mimeType || fallbackMime || mimeRef.current || "video/webm";
    if (!init) return body.length ? new Blob(body, { type: mime }) : null;
    const parts = body[0] === init ? body : [init, ...body];
    return new Blob(parts, { type: mime });
  }, []);

  const replayLastN = useCallback((n: number) => {
    const items = timedChunksRef.current;
    if (items.length === 0) return;
    const now = items[items.length - 1].t;
    const cutoff = now - n * 1000;
    const selected = items.filter((x) => x.t >= cutoff).map((x) => x.blob);
    if (selected.length === 0) return;
    const blob = buildDecodableBlob(selected);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setReplayUrl(url);
    if (replayUrlRef.current) URL.revokeObjectURL(replayUrlRef.current);
    replayUrlRef.current = url;
    setTimeout(() => {
      const rv = replayRef.current;
      if (rv) {
        rv.currentTime = 0;
        rv.play().catch(() => {});
      }
    }, 0);
  }, [buildDecodableBlob]);

  const saveClip = useCallback(() => {
    const items = timedChunksRef.current;
    if (items.length === 0) return;
    const mime = recorderRef.current?.mimeType || mimeRef.current || "video/webm";
    const blob = buildDecodableBlob(items.map((x) => x.blob), mime);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `delaycam-${new Date().toISOString().replace(/[:.]/g, "-")}.${mime.includes("mp4") ? "mp4" : "webm"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, [buildDecodableBlob]);

  const start = useCallback(async (nextFacing?: Facing) => {
    setError(null);
    setReplayUrl(null);
    cleanup();
    const useFacing = nextFacing ?? facing;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: useFacing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
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
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        try {
          ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
          const bitmap = await createImageBitmap(canvas);
          const now = performance.now();
          framesRef.current.push({ bitmap, t: now });

          // Evict by time.
          const cutoff = now - MAX_BUFFER_SEC * 1000;
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

      // ----- MediaRecorder (for Replay Last Ns / Save clip only) -----
      const mime = pickRecorderMime();
      mimeRef.current = mime;
      try {
        const rec = new MediaRecorder(stream, { mimeType: mime });
        recorderRef.current = rec;
        rec.ondataavailable = (ev) => {
          if (!ev.data || ev.data.size === 0) return;
          const now = performance.now();
          if (!initChunkRef.current) initChunkRef.current = ev.data;
          timedChunksRef.current.push({ blob: ev.data, t: now });
          const cutoff = now - MAX_BUFFER_SEC * 1000;
          while (timedChunksRef.current.length > 2 && timedChunksRef.current[1]?.t < cutoff) {
            timedChunksRef.current.splice(1, 1);
          }
        };
        rec.start(250);
      } catch {
        // Recording is optional; the delayed mirror still works.
      }

      setRunning(true);
    } catch (e: any) {
      const name = e?.name || "";
      if (name === "NotAllowedError") setError("Camera permission denied. Enable it in your browser settings.");
      else if (name === "NotFoundError") setError("No camera found on this device.");
      else if (name === "NotReadableError") setError("Camera is already in use by another app.");
      else setError(e?.message || "Could not start the camera.");
      cleanup();
      setRunning(false);
    }
  }, [cleanup, facing]);

  const stop = useCallback(() => {
    cleanup();
    setRunning(false);
    setBufferedSec(0);
    if (replayUrlRef.current) {
      URL.revokeObjectURL(replayUrlRef.current);
      replayUrlRef.current = null;
    }
    setReplayUrl(null);
  }, [cleanup]);

  const swap = useCallback(async () => {
    const next: Facing = facing === "user" ? "environment" : "user";
    setFacing(next);
    if (running) await start(next);
  }, [facing, running, start]);

  const cameraLabel = facing === "user" ? "Front" : "Rear";

  return (
    <Card className="p-4 space-y-4 border-2 border-dashed border-red-500">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary" /> DelayCam — Instant Replay
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Live camera with adjustable 1–55s playback delay for self-review.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {running ? (
            <Button size="sm" variant="destructive" onClick={stop} className="gap-1.5">
              <CameraOff className="h-4 w-4" /> Stop
            </Button>
          ) : (
            <Button size="sm" onClick={() => start()} className="gap-1.5">
              <Camera className="h-4 w-4" /> Start
            </Button>
          )}
          {hasMulti && (
            <Button size="sm" variant="outline" onClick={swap} disabled={!running} className="gap-1.5">
              <SwitchCamera className="h-4 w-4" /> Flip
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={saveClip} disabled={!running || timedChunksRef.current.length === 0} className="gap-1.5">
            <Download className="h-4 w-4" /> Save clip
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Live</div>
          <video
            ref={liveRef}
            muted
            playsInline
            autoPlay
            className="w-full aspect-video rounded-md bg-muted object-cover"
          />
        </div>
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Delayed ({delay}s behind)
          </div>
          <canvas
            ref={delayedCanvasRef}
            className="w-full aspect-video rounded-md bg-muted object-cover"
          />
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

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Instant replay</span>
          <span className="tabular-nums text-muted-foreground">Last {replayDuration}s</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {REPLAY_DURATIONS.map((n) => (
            <Button
              key={n}
              size="sm"
              variant={replayDuration === n ? "default" : "outline"}
              disabled={!running || bufferedSec < n + delay}
              onClick={() => {
                setReplayDuration(n);
                replayLastN(n);
              }}
              className="gap-1.5"
            >
              <Play className="h-3.5 w-3.5" /> Replay {n}s
            </Button>
          ))}
        </div>
        {replayUrl && (
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Replay clip</div>
            <video
              ref={replayRef}
              src={replayUrl}
              muted
              playsInline
              controls
              autoPlay
              onError={() => {
                setError("Replay clip couldn't decode. Try pressing Start again and wait until the buffer is ready.");
                if (replayUrlRef.current) {
                  URL.revokeObjectURL(replayUrlRef.current);
                  replayUrlRef.current = null;
                }
                setReplayUrl(null);
              }}
              className="w-full aspect-video rounded-md bg-muted object-cover"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
        <Badge variant={running ? "default" : "outline"} className="text-[10px]">
          {running ? "Recording" : "Idle"}
        </Badge>
        <span>Delay {delay}s</span>
        <span>·</span>
        <span>Buffer {bufferedSec.toFixed(1)}s</span>
        <span>·</span>
        <span>Camera: {facing === "user" ? "Front" : "Rear"}</span>
      </div>
    </Card>
  );
}

export default DelayCam;
