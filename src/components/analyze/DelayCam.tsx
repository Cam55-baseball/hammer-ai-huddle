/**
 * DelayCam — live camera with adjustable 1–55s instant-replay delay.
 * Self-contained, client-only. No uploads, no backend.
 *
 * Two playback paths:
 *  - MSE path: MediaSource / ManagedMediaSource + SourceBuffer for continuous
 *    delayed playback. We keep a ring buffer of the last 55s of recorded
 *    chunks and feed them into the MediaSource, then drive the delayed video
 *    to `liveEdge - delay`.
 *  - Fallback: iOS Safari (no MediaSource) — rebuild a Blob URL from a trailing
 *    window every ~500ms and swap it into the delayed <video>. Also supports a
 *    "Replay last Ns" playback of the buffered segment.
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

const REPLAY_DURATIONS = [3, 5, 10, 15];

type Facing = "user" | "environment";

type TimedBlob = { blob: Blob; t: number };

function getMSE(): typeof MediaSource | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return (w.MediaSource as typeof MediaSource | undefined)
    ?? (w.ManagedMediaSource as typeof MediaSource | undefined)
    ?? null;
}

function pickMime(mse: typeof MediaSource | null): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4",
  ];
  for (const c of candidates) {
    const recOk = typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c);
    if (!recOk) continue;
    if (!mse) return c; // fallback mode doesn't need MSE support
    try {
      if (mse.isTypeSupported?.(c)) return c;
    } catch { /* ignore */ }
  }
  // If nothing matched both, at least return something the recorder accepts.
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "video/webm";
}

export function DelayCam() {
  const liveRef = useRef<HTMLVideoElement>(null);
  const delayedRef = useRef<HTMLVideoElement>(null);
  const replayRef = useRef<HTMLVideoElement>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const fallbackUrlRef = useRef<string | null>(null);
  const replayUrlRef = useRef<string | null>(null);
  const queueRef = useRef<ArrayBuffer[]>([]);
  const timedChunksRef = useRef<TimedBlob[]>([]);
  const initChunkRef = useRef<Blob | null>(null);
  const startTsRef = useRef<number>(0);
  const driftIntervalRef = useRef<number | null>(null);
  const fallbackIntervalRef = useRef<number | null>(null);
  const modeRef = useRef<"mse" | "blob">("mse");
  const mimeRef = useRef<string>("video/webm");

  const [running, setRunning] = useState(false);
  const [facing, setFacing] = useState<Facing>("environment");
  const [delay, setDelay] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [bufferedSec, setBufferedSec] = useState(0);
  const [hasMulti, setHasMulti] = useState(false);
  const [mode, setMode] = useState<"mse" | "blob">("mse");
  const [replayDuration, setReplayDuration] = useState(5);
  const [replayUrl, setReplayUrl] = useState<string | null>(null);

  const delayRef = useRef(delay);
  useEffect(() => { delayRef.current = delay; }, [delay]);

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices?.().then((d) => {
      setHasMulti(d.filter((x) => x.kind === "videoinput").length > 1);
    }).catch(() => {});
  }, []);

  const flushQueue = useCallback(() => {
    const sb = sourceBufferRef.current;
    if (!sb || sb.updating) return;
    const next = queueRef.current.shift();
    if (next) {
      try { sb.appendBuffer(next); } catch { /* ignore quota / state */ }
    }
  }, []);

  const cleanup = useCallback(() => {
    if (driftIntervalRef.current != null) {
      window.clearInterval(driftIntervalRef.current);
      driftIntervalRef.current = null;
    }
    if (fallbackIntervalRef.current != null) {
      window.clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
    try { recorderRef.current?.state !== "inactive" && recorderRef.current?.stop(); } catch {}
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    try {
      if (mediaSourceRef.current && mediaSourceRef.current.readyState === "open") {
        mediaSourceRef.current.endOfStream();
      }
    } catch {}
    mediaSourceRef.current = null;
    sourceBufferRef.current = null;
    queueRef.current = [];
    timedChunksRef.current = [];
    initChunkRef.current = null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (fallbackUrlRef.current) {
      URL.revokeObjectURL(fallbackUrlRef.current);
      fallbackUrlRef.current = null;
    }
    if (liveRef.current) liveRef.current.srcObject = null;
    if (delayedRef.current) { delayedRef.current.removeAttribute("src"); delayedRef.current.load(); }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  // Build a decodable Blob by ensuring the recorder's first init segment is always first.
  const buildDecodableBlob = useCallback((body: Blob[], fallbackMime?: string): Blob | null => {
    const init = initChunkRef.current;
    const mime = recorderRef.current?.mimeType || fallbackMime || mimeRef.current || "video/webm";
    if (!init) return body.length ? new Blob(body, { type: mime }) : null;
    const parts = body[0] === init ? body : [init, ...body];
    return new Blob(parts, { type: mime });
  }, []);

  // Replay: export the last N seconds of the ring buffer into a standalone video.
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
    // Autoplay the replay in the dedicated replay player.
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
    const blob = new Blob(items.map((x) => x.blob), { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `delaycam-${new Date().toISOString().replace(/[:.]/g, "-")}.${mime.includes("mp4") ? "mp4" : "webm"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, []);

  const start = useCallback(async (nextFacing?: Facing) => {
    setError(null);
    setReplayUrl(null);
    cleanup();
    const useFacing = nextFacing ?? facing;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: useFacing } },
        audio: false,
      });
      streamRef.current = stream;
      if (liveRef.current) {
        liveRef.current.srcObject = stream;
        await liveRef.current.play().catch(() => {});
      }

      const MSE = getMSE();
      const mime = pickMime(MSE);
      mimeRef.current = mime;
      const mseOk = !!MSE && (() => {
        try { return MSE.isTypeSupported?.(mime) ?? false; } catch { return false; }
      })();

      modeRef.current = mseOk ? "mse" : "blob";
      setMode(modeRef.current);

      if (mseOk && MSE) {
        const ms = new MSE();
        mediaSourceRef.current = ms;
        const dv = delayedRef.current;
        const isManaged = (window as any).ManagedMediaSource && ms instanceof (window as any).ManagedMediaSource;
        if (dv) {
          if (isManaged && "srcObject" in HTMLMediaElement.prototype) {
            try { (dv as any).srcObject = ms; }
            catch {
              const url = URL.createObjectURL(ms as any);
              objectUrlRef.current = url;
              dv.src = url;
            }
          } else {
            const url = URL.createObjectURL(ms as any);
            objectUrlRef.current = url;
            dv.src = url;
          }
        }

        ms.addEventListener("sourceopen", () => {
          try {
            const sb = ms.addSourceBuffer(mime);
            sb.mode = "sequence";
            sb.addEventListener("updateend", flushQueue);
            sourceBufferRef.current = sb;
            flushQueue();
          } catch {
            modeRef.current = "blob";
            setMode("blob");
          }
        });
      }

      const rec = new MediaRecorder(stream, { mimeType: mime });
      recorderRef.current = rec;
      startTsRef.current = 0;
      rec.ondataavailable = async (ev) => {
        if (!ev.data || ev.data.size === 0) return;
        const now = performance.now();
        if (startTsRef.current === 0) startTsRef.current = now;
        timedChunksRef.current.push({ blob: ev.data, t: now });

        // Trim ring buffer to the configured max window.
        const cutoff = now - MAX_BUFFER_SEC * 1000;
        while (timedChunksRef.current.length > 2 && timedChunksRef.current[0].t < cutoff) {
          timedChunksRef.current.shift();
        }

        if (modeRef.current === "mse") {
          const buf = await ev.data.arrayBuffer();
          queueRef.current.push(buf);
          flushQueue();
        }
      };
      rec.start(250);

      if (modeRef.current === "mse") {
        // Drift tracker: keep delayed video exactly `delay` behind live edge.
        driftIntervalRef.current = window.setInterval(() => {
          const dv = delayedRef.current;
          const sb = sourceBufferRef.current;
          if (!dv || !sb || startTsRef.current === 0) return;
          const elapsed = (performance.now() - startTsRef.current) / 1000;
          const target = Math.max(0, elapsed - delayRef.current);
          try {
            if (sb.buffered.length > 0) {
              const end = sb.buffered.end(sb.buffered.length - 1);
              const startB = sb.buffered.start(0);
              setBufferedSec(Math.max(0, end - startB));
              const clamped = Math.min(Math.max(target, startB), end - 0.05);
              if (dv.paused && elapsed >= delayRef.current && clamped > 0) {
                try { dv.currentTime = clamped; } catch {}
                dv.play().catch(() => {});
              } else if (!dv.paused && Math.abs(dv.currentTime - clamped) > 0.6) {
                try { dv.currentTime = clamped; } catch {}
              }
            }
          } catch {}
        }, 250) as unknown as number;
      } else {
        // Blob-URL fallback: rebuild trailing window and swap src every ~500ms.
        fallbackIntervalRef.current = window.setInterval(() => {
          const dv = delayedRef.current;
          if (!dv) return;
          const now = performance.now();
          const delayMs = delayRef.current * 1000;
          const items = timedChunksRef.current;
          if (items.length < 2) return;
          const ageOldest = now - items[0].t;
          setBufferedSec(Math.min(MAX_BUFFER_SEC, ageOldest / 1000));
          if (ageOldest < delayMs) return; // not enough buffered yet

          const eligible = items.filter((x) => now - x.t >= delayMs).map((x) => x.blob);
          if (eligible.length === 0) return;
          try {
            const blob = new Blob(eligible, { type: mimeRef.current });
            const url = URL.createObjectURL(blob);
            const prev = fallbackUrlRef.current;
            fallbackUrlRef.current = url;
            dv.src = url;
            dv.play().catch(() => {});
            if (prev) setTimeout(() => URL.revokeObjectURL(prev), 1000);
          } catch { /* ignore */ }
        }, 500) as unknown as number;
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
  }, [cleanup, facing, flushQueue]);

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
          <video
            ref={delayedRef}
            muted
            playsInline
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
              disabled={!running}
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
        {running && mode === "blob" && (
          <>
            <span>·</span>
            <span>Fallback mode</span>
          </>
        )}
      </div>
    </Card>
  );
}

export default DelayCam;
