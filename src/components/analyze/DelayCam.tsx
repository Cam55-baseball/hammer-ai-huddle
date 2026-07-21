/**
 * DelayCam — live camera with adjustable 1–55s instant-replay delay.
 * Self-contained, client-only. No uploads, no backend.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Camera, CameraOff, SwitchCamera, Download, AlertCircle, Timer,
} from "lucide-react";

const PRESETS = [3, 5, 10, 20, 30, 45];
const MIN_DELAY = 1;
const MAX_DELAY = 55;

type Facing = "user" | "environment";

function pickMime(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "video/webm";
}

export function DelayCam() {
  const liveRef = useRef<HTMLVideoElement>(null);
  const delayedRef = useRef<HTMLVideoElement>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const queueRef = useRef<ArrayBuffer[]>([]);
  const chunksRef = useRef<Blob[]>([]);
  const startTsRef = useRef<number>(0);
  const driftIntervalRef = useRef<number | null>(null);

  const [running, setRunning] = useState(false);
  const [facing, setFacing] = useState<Facing>("environment");
  const [delay, setDelay] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [bufferedSec, setBufferedSec] = useState(0);
  const [hasMulti, setHasMulti] = useState(false);

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
    chunksRef.current = [];
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (liveRef.current) liveRef.current.srcObject = null;
    if (delayedRef.current) { delayedRef.current.removeAttribute("src"); delayedRef.current.load(); }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async (nextFacing?: Facing) => {
    setError(null);
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

      const mime = pickMime();
      const ms = new MediaSource();
      mediaSourceRef.current = ms;
      const url = URL.createObjectURL(ms);
      objectUrlRef.current = url;
      if (delayedRef.current) delayedRef.current.src = url;

      ms.addEventListener("sourceopen", () => {
        try {
          const sb = ms.addSourceBuffer(mime);
          sb.mode = "sequence";
          sb.addEventListener("updateend", flushQueue);
          sourceBufferRef.current = sb;
        } catch (e: any) {
          setError(`Delayed playback unsupported in this browser (${mime}).`);
        }
      });

      const rec = new MediaRecorder(stream, { mimeType: mime });
      recorderRef.current = rec;
      startTsRef.current = 0;
      rec.ondataavailable = async (ev) => {
        if (!ev.data || ev.data.size === 0) return;
        if (startTsRef.current === 0) startTsRef.current = performance.now();
        chunksRef.current.push(ev.data);
        const buf = await ev.data.arrayBuffer();
        queueRef.current.push(buf);
        flushQueue();
      };
      rec.start(250);

      // Drift + buffer tracker: keep delayed video exactly `delay` behind live.
      driftIntervalRef.current = window.setInterval(() => {
        const dv = delayedRef.current;
        const sb = sourceBufferRef.current;
        if (!dv || !sb || startTsRef.current === 0) return;
        const elapsed = (performance.now() - startTsRef.current) / 1000;
        const target = Math.max(0, elapsed - delayRef.current);
        // Buffered range info
        try {
          if (sb.buffered.length > 0) {
            const end = sb.buffered.end(sb.buffered.length - 1);
            const start = sb.buffered.start(0);
            setBufferedSec(Math.max(0, end - start));
            const clamped = Math.min(Math.max(target, start), end - 0.05);
            if (dv.paused && elapsed >= delayRef.current && clamped > 0) {
              try { dv.currentTime = clamped; } catch {}
              dv.play().catch(() => {});
            } else if (!dv.paused && Math.abs(dv.currentTime - clamped) > 0.6) {
              try { dv.currentTime = clamped; } catch {}
            }
          }
        } catch {}
      }, 250) as unknown as number;

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

  const stop = useCallback(() => { cleanup(); setRunning(false); setBufferedSec(0); }, [cleanup]);

  const swap = useCallback(async () => {
    const next: Facing = facing === "user" ? "environment" : "user";
    setFacing(next);
    if (running) await start(next);
  }, [facing, running, start]);

  const saveClip = useCallback(() => {
    if (chunksRef.current.length === 0) return;
    const mime = recorderRef.current?.mimeType || "video/webm";
    const blob = new Blob(chunksRef.current, { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `delaycam-${new Date().toISOString().replace(/[:.]/g, "-")}.${mime.includes("mp4") ? "mp4" : "webm"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, []);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary" /> DelayCam — Instant Replay
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Live camera with adjustable 1–55s playback delay for self-review.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button size="sm" variant="outline" onClick={saveClip} disabled={chunksRef.current.length === 0} className="gap-1.5">
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

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
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
