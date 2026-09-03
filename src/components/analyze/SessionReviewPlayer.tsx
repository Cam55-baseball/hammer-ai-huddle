/**
 * SessionReviewPlayer — watch a recorded DelayCam session back, draw on it, and
 * leave notes on it.
 *
 * Self-review only: no metrics, no scoring, no analysis. Just playback with
 * speed control, frame stepping, a scrubber, drawing tools (freehand, straight
 * line, and a three-point angle tool that reads out the degrees between two
 * lines), and a notes layer.
 *
 * Nothing here is measurement of the athlete — the angle read-out is the angle
 * between the lines the user drew on screen, which is what a coach draws on a
 * whiteboard. It is labelled as such.
 *
 * Notes live in the parent's state (DelayCam) because the recording has no
 * database row until the user saves it to Players Club. This component never
 * touches the network — it just edits the list it is handed.
 *
 * Two things matter for phones: (1) drawing is an explicit mode, so the video's
 * own controls are reachable when it's off, and (2) full screen is a plain
 * full-viewport overlay, because iOS Safari will not fullscreen a canvas
 * overlay. Shapes are stored in normalised 0–1 coordinates so they stay put
 * and stay aligned when the view changes size.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Pencil, Minus, Triangle, Eraser, Play, Pause, ChevronLeft, ChevronRight,
  Maximize2, X, Mic, Square, Trash2, Volume2, VolumeX, MessageSquare,
} from "lucide-react";

type Tool = "pen" | "line" | "angle";
/** Normalised 0–1 coordinates, so shapes survive any resize. */
type Pt = { x: number; y: number };
type Shape =
  | { kind: "pen"; pts: Pt[]; color: string }
  | { kind: "line"; a: Pt; b: Pt; color: string }
  | { kind: "angle"; a: Pt; v: Pt; b: Pt; color: string };

/**
 * A note held in local state. `timestampSec === null` means it is about the
 * whole session rather than a moment. Voice notes carry the recorded blob
 * until the session is saved, at which point the parent uploads it.
 */
export interface SessionNote {
  id: string;
  timestampSec: number | null;
  kind: "text" | "voice";
  body: string | null;
  audioBlob: Blob | null;
  /** Local object URL for playback before the note is uploaded. */
  audioObjectUrl: string | null;
  durationSec: number | null;
  createdAt: number;
}

const COLORS = ["#FF3B30", "#FFD60A", "#30D158", "#0A84FF", "#FFFFFF"];
const SPEEDS = [0.25, 0.5, 1];
/** How long a pinned note stays on screen as a caption once it fires. */
const CAPTION_HOLD_SEC = 4;

function angleDeg(a: Pt, v: Pt, b: Pt, aspect: number): number {
  // Compare in display space so the read-out matches what the user sees.
  const a1 = Math.atan2((a.y - v.y) / aspect, a.x - v.x);
  const a2 = Math.atan2((b.y - v.y) / aspect, b.x - v.x);
  let d = Math.abs((a1 - a2) * (180 / Math.PI));
  if (d > 180) d = 360 - d;
  return d;
}

function fmt(t: number): string {
  if (!Number.isFinite(t) || t < 0) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface SessionReviewPlayerProps {
  url: string;
  notes: SessionNote[];
  onNotesChange: (updater: (prev: SessionNote[]) => SessionNote[]) => void;
  /**
   * Hands back a microphone stream. DelayCam passes one that reuses the
   * permission already granted during recording, so iOS doesn't re-prompt.
   */
  getMicStream?: () => Promise<MediaStream>;
}

export function SessionReviewPlayer({
  url,
  notes,
  onNotesChange,
  getMicStream,
}: SessionReviewPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<Tool>("pen");
  const [drawMode, setDrawMode] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [draft, setDraft] = useState<Shape | null>(null);
  const [anglePts, setAnglePts] = useState<Pt[]>([]);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  /** CSS pixel size of the drawing surface — drives normalised mapping. */
  const [box, setBox] = useState({ w: 0, h: 0 });
  const drawingRef = useRef(false);

  // ---- Sound: two independent switches, all four combinations valid. ----
  const [videoSound, setVideoSound] = useState(true);
  const [voiceNotesSound, setVoiceNotesSound] = useState(true);

  // ---- Notes ----
  const [draftText, setDraftText] = useState("");
  const [draftSessionText, setDraftSessionText] = useState("");
  const [recordingFor, setRecordingFor] = useState<null | "moment" | "session">(null);
  const [recordSecs, setRecordSecs] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [caption, setCaption] = useState<{ id: string; text: string } | null>(null);
  const [playingNoteId, setPlayingNoteId] = useState<string | null>(null);

  const micRecRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micChunksRef = useRef<BlobPart[]>([]);
  const micStartedAtRef = useRef(0);
  const micPinRef = useRef<number | null>(null);
  const noteAudioRef = useRef<HTMLAudioElement | null>(null);
  /** Notes already fired on this forward pass, so they don't repeat. */
  const firedRef = useRef<Set<string>>(new Set());
  const lastTimeRef = useRef(0);
  const captionTimerRef = useRef<number | null>(null);

  const timedNotes = useMemo(
    () =>
      notes
        .filter((n) => n.timestampSec != null)
        .sort((a, b) => (a.timestampSec ?? 0) - (b.timestampSec ?? 0)),
    [notes],
  );
  const sessionNotes = useMemo(
    () => notes.filter((n) => n.timestampSec == null).sort((a, b) => a.createdAt - b.createdAt),
    [notes],
  );

  /**
   * Keep the canvas sized to the wrapper. Measuring only on mount is what made
   * the tools dead: before metadata arrives the wrapper is 0px tall, so the
   * canvas was 0x0. ResizeObserver plus loadedmetadata fixes that, and the
   * device pixel ratio keeps strokes sharp.
   */
  const sizeCanvas = useCallback(() => {
    const c = canvasRef.current;
    const w = wrapRef.current;
    if (!c || !w) return;
    const r = w.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    c.width = Math.round(r.width * dpr);
    c.height = Math.round(r.height * dpr);
    c.style.width = `${r.width}px`;
    c.style.height = `${r.height}px`;
    setBox({ w: r.width, h: r.height });
  }, []);

  useEffect(() => {
    sizeCanvas();
    const w = wrapRef.current;
    if (!w) return;
    const ro = new ResizeObserver(() => sizeCanvas());
    ro.observe(w);
    window.addEventListener("orientationchange", sizeCanvas);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", sizeCanvas);
    };
  }, [sizeCanvas, expanded, url]);

  const render = useCallback(() => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx || box.w === 0 || box.h === 0) return;
    const dpr = c.width / box.w;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, box.w, box.h);
    const X = (p: Pt) => p.x * box.w;
    const Y = (p: Pt) => p.y * box.h;
    const aspect = box.h / box.w || 1;
    const all = draft ? [...shapes, draft] : shapes;
    for (const s of all) {
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      if (s.kind === "pen") {
        ctx.beginPath();
        s.pts.forEach((p, i) => (i === 0 ? ctx.moveTo(X(p), Y(p)) : ctx.lineTo(X(p), Y(p))));
        ctx.stroke();
      } else if (s.kind === "line") {
        ctx.beginPath();
        ctx.moveTo(X(s.a), Y(s.a));
        ctx.lineTo(X(s.b), Y(s.b));
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(X(s.a), Y(s.a));
        ctx.lineTo(X(s.v), Y(s.v));
        ctx.lineTo(X(s.b), Y(s.b));
        ctx.stroke();
        const deg = angleDeg(s.a, s.v, s.b, aspect);
        ctx.font = "600 15px system-ui, sans-serif";
        const label = `${Math.round(deg)}°`;
        const tx = X(s.v) + 10;
        const ty = Y(s.v) - 10;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(tx - 4, ty - 16, ctx.measureText(label).width + 8, 20);
        ctx.fillStyle = s.color;
        ctx.fillText(label, tx, ty);
      }
    }
    if (tool === "angle" && anglePts.length > 0) {
      ctx.fillStyle = color;
      for (const p of anglePts) {
        ctx.beginPath();
        ctx.arc(X(p), Y(p), 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [shapes, draft, anglePts, tool, color, box]);

  useEffect(() => { render(); }, [render]);

  const pos = (e: React.PointerEvent): Pt => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: r.width ? (e.clientX - r.left) / r.width : 0,
      y: r.height ? (e.clientY - r.top) / r.height : 0,
    };
  };

  const onDown = (e: React.PointerEvent) => {
    if (!drawMode) return;
    const p = pos(e);
    if (tool === "angle") {
      const next = [...anglePts, p];
      if (next.length === 3) {
        setShapes((s) => [...s, { kind: "angle", a: next[0], v: next[1], b: next[2], color }]);
        setAnglePts([]);
      } else {
        setAnglePts(next);
      }
      return;
    }
    drawingRef.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDraft(tool === "pen" ? { kind: "pen", pts: [p], color } : { kind: "line", a: p, b: p, color });
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drawMode || !drawingRef.current || !draft) return;
    const p = pos(e);
    setDraft((d) =>
      !d ? d : d.kind === "pen" ? { ...d, pts: [...d.pts, p] } : d.kind === "line" ? { ...d, b: p } : d,
    );
  };

  const onUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (draft) setShapes((s) => [...s, draft]);
    setDraft(null);
  };

  const step = (dir: 1 | -1) => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    setPlaying(false);
    const next = Math.max(0, Math.min((duration || v.duration || 0), v.currentTime + dir * (1 / 30)));
    v.currentTime = next;
  };

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play().catch(() => {}); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const seekTo = (t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, t);
    setCurrent(Math.max(0, t));
  };

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed, url]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = !videoSound;
  }, [videoSound, url]);

  // Esc / hardware back closes full screen.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    const onPop = () => setExpanded(false);
    window.addEventListener("keydown", onKey);
    window.history.pushState({ reviewFullscreen: true }, "");
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPop);
    };
  }, [expanded]);

  // ---- Voice note playback ----
  const stopNoteAudio = useCallback(() => {
    const a = noteAudioRef.current;
    if (a) { a.pause(); a.currentTime = 0; }
    setPlayingNoteId(null);
  }, []);

  const playNote = useCallback((note: SessionNote) => {
    if (!note.audioObjectUrl) return;
    let a = noteAudioRef.current;
    if (!a) {
      a = new Audio();
      a.onended = () => setPlayingNoteId(null);
      noteAudioRef.current = a;
    }
    a.src = note.audioObjectUrl;
    a.currentTime = 0;
    a.play().then(() => setPlayingNoteId(note.id)).catch(() => setPlayingNoteId(null));
  }, []);

  useEffect(() => () => { noteAudioRef.current?.pause(); }, []);

  // ---- Fire pinned notes as playback passes them ----
  const showCaption = useCallback((id: string, text: string) => {
    setCaption({ id, text });
    if (captionTimerRef.current) window.clearTimeout(captionTimerRef.current);
    captionTimerRef.current = window.setTimeout(() => setCaption(null), CAPTION_HOLD_SEC * 1000);
  }, []);

  const handleTime = useCallback((t: number) => {
    const prev = lastTimeRef.current;
    lastTimeRef.current = t;
    setCurrent(t);
    // Scrubbing backwards (or any jump back) re-arms every note past the point.
    if (t < prev - 0.3) {
      for (const n of timedNotes) {
        if ((n.timestampSec ?? 0) >= t) firedRef.current.delete(n.id);
      }
      return;
    }
    if (t - prev > 1.5) return; // a forward jump shouldn't machine-gun notes
    for (const n of timedNotes) {
      const ts = n.timestampSec ?? 0;
      if (ts > prev && ts <= t && !firedRef.current.has(n.id)) {
        firedRef.current.add(n.id);
        if (n.kind === "text" && n.body) showCaption(n.id, n.body);
        else if (n.kind === "voice") {
          showCaption(n.id, "Voice note");
          if (voiceNotesSound) playNote(n);
        }
      }
    }
  }, [timedNotes, voiceNotesSound, playNote, showCaption]);

  // ---- Voice note recording ----
  const startVoiceNote = useCallback(async (scope: "moment" | "session") => {
    setMicError(null);
    try {
      const stream = getMicStream
        ? await getMicStream()
        : await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      micChunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) micChunksRef.current.push(e.data); };
      rec.onerror = () => setMicError("The voice note recording failed. Try again.");
      rec.onstop = () => {
        const blob = new Blob(micChunksRef.current, { type: rec.mimeType || mime || "audio/webm" });
        micChunksRef.current = [];
        if (blob.size === 0) {
          setMicError("Nothing was recorded — no audio came through the microphone.");
          return;
        }
        const secs = Math.max(0.1, (Date.now() - micStartedAtRef.current) / 1000);
        const note: SessionNote = {
          id: newId(),
          timestampSec: micPinRef.current,
          kind: "voice",
          body: null,
          audioBlob: blob,
          audioObjectUrl: URL.createObjectURL(blob),
          durationSec: Number(secs.toFixed(2)),
          createdAt: Date.now(),
        };
        onNotesChange((prev) => [...prev, note]);
      };
      micPinRef.current = scope === "moment" ? Number((videoRef.current?.currentTime ?? current).toFixed(2)) : null;
      micStartedAtRef.current = Date.now();
      rec.start();
      micRecRef.current = rec;
      setRecordingFor(scope);
      setRecordSecs(0);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "unknown error";
      setMicError(`Couldn't use the microphone: ${msg}`);
    }
  }, [getMicStream, current, onNotesChange]);

  const stopVoiceNote = useCallback(() => {
    const rec = micRecRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    micRecRef.current = null;
    // Only stop tracks we opened ourselves; a stream handed to us is the
    // parent's to manage.
    if (!getMicStream) micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    setRecordingFor(null);
  }, [getMicStream]);

  useEffect(() => {
    if (!recordingFor) return;
    const id = window.setInterval(() => setRecordSecs((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [recordingFor]);

  useEffect(() => () => { micRecRef.current?.stop(); }, []);

  const addTextNote = (scope: "moment" | "session") => {
    const text = (scope === "moment" ? draftText : draftSessionText).trim();
    if (!text) return;
    const note: SessionNote = {
      id: newId(),
      timestampSec: scope === "moment"
        ? Number((videoRef.current?.currentTime ?? current).toFixed(2))
        : null,
      kind: "text",
      body: text,
      audioBlob: null,
      audioObjectUrl: null,
      durationSec: null,
      createdAt: Date.now(),
    };
    onNotesChange((prev) => [...prev, note]);
    if (scope === "moment") setDraftText(""); else setDraftSessionText("");
  };

  const deleteNote = (note: SessionNote) => {
    if (playingNoteId === note.id) stopNoteAudio();
    if (note.audioObjectUrl) URL.revokeObjectURL(note.audioObjectUrl);
    firedRef.current.delete(note.id);
    onNotesChange((prev) => prev.filter((n) => n.id !== note.id));
  };

  const soundBar = (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant={videoSound ? "default" : "outline"}
        onClick={() => setVideoSound((v) => !v)}
        className="gap-1.5"
        aria-pressed={videoSound}
      >
        {videoSound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        Video sound {videoSound ? "on" : "off"}
      </Button>
      <Button
        size="sm"
        variant={voiceNotesSound ? "default" : "outline"}
        onClick={() => { setVoiceNotesSound((v) => { if (v) stopNoteAudio(); return !v; }); }}
        className="gap-1.5"
        aria-pressed={voiceNotesSound}
      >
        {voiceNotesSound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        Voice notes {voiceNotesSound ? "on" : "off"}
      </Button>
    </div>
  );

  const noteRow = (n: SessionNote) => (
    <div key={n.id} className="flex items-start gap-2 rounded-md border p-2 text-xs">
      {n.timestampSec != null ? (
        <button
          type="button"
          onClick={() => seekTo(n.timestampSec!)}
          className="min-h-[32px] shrink-0 rounded bg-muted px-2 font-medium tabular-nums hover:bg-muted/70"
          aria-label={`Jump to ${fmt(n.timestampSec)}`}
        >
          {fmt(n.timestampSec)}
        </button>
      ) : (
        <span className="shrink-0 rounded bg-muted px-2 py-1 text-[10px] text-muted-foreground">
          Whole session
        </span>
      )}
      <div className="min-w-0 flex-1">
        {n.kind === "text" ? (
          <span className="break-words">{n.body}</span>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            onClick={() => (playingNoteId === n.id ? stopNoteAudio() : playNote(n))}
          >
            {playingNoteId === n.id ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            Voice note{n.durationSec ? ` · ${Math.round(n.durationSec)}s` : ""}
          </Button>
        )}
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 shrink-0"
        aria-label="Delete this note"
        onClick={() => deleteNote(n)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  const notesPanel = (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <MessageSquare className="h-4 w-4" /> Notes
      </div>

      {/* Pinned to a moment */}
      <div className="space-y-2">
        <Textarea
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          placeholder="What did you see at this moment?"
          rows={2}
          className="text-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => addTextNote("moment")} disabled={!draftText.trim()}>
            Add note at {fmt(current)}
          </Button>
          {recordingFor === "moment" ? (
            <Button size="sm" variant="destructive" onClick={stopVoiceNote} className="gap-1.5">
              <Square className="h-4 w-4" /> Stop recording · {recordSecs}s
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void startVoiceNote("moment")}
              disabled={recordingFor !== null}
              className="gap-1.5"
            >
              <Mic className="h-4 w-4" /> Record voice note at {fmt(current)}
            </Button>
          )}
        </div>
      </div>

      {/* Whole session */}
      <div className="space-y-2 border-t pt-3">
        <div className="text-xs font-medium text-muted-foreground">
          Notes about the whole session
        </div>
        <Textarea
          value={draftSessionText}
          onChange={(e) => setDraftSessionText(e.target.value)}
          placeholder="Anything about the session as a whole"
          rows={2}
          className="text-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => addTextNote("session")}
            disabled={!draftSessionText.trim()}
          >
            Add session note
          </Button>
          {recordingFor === "session" ? (
            <Button size="sm" variant="destructive" onClick={stopVoiceNote} className="gap-1.5">
              <Square className="h-4 w-4" /> Stop recording · {recordSecs}s
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void startVoiceNote("session")}
              disabled={recordingFor !== null}
              className="gap-1.5"
            >
              <Mic className="h-4 w-4" /> Record session voice note
            </Button>
          )}
        </div>
      </div>

      {recordingFor && (
        <Badge variant="destructive" className="gap-1.5 text-[11px]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
          Recording a voice note{recordingFor === "moment" ? ` pinned at ${fmt(micPinRef.current ?? 0)}` : ""}
        </Badge>
      )}
      {micError && <p className="text-[11px] text-destructive">{micError}</p>}

      {notes.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          No notes yet. Notes are saved with the session when you save it to Players Club.
        </p>
      ) : (
        <div className="space-y-1.5">
          {timedNotes.map(noteRow)}
          {sessionNotes.map(noteRow)}
        </div>
      )}
    </div>
  );

  const controls = (
    <>
      <div className="flex items-center gap-2">
        <span className="text-[11px] tabular-nums text-muted-foreground">{fmt(current)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={Math.min(current, duration || 0)}
          onChange={(e) => {
            const t = Number(e.target.value);
            seekTo(t);
            lastTimeRef.current = t;
          }}
          aria-label="Scrub through the session"
          className="h-2 flex-1 cursor-pointer accent-primary"
        />
        <span className="text-[11px] tabular-nums text-muted-foreground">{fmt(duration)}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={toggle} className="gap-1.5">
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {playing ? "Pause" : "Play"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => step(-1)} aria-label="Back one frame" title="Back one frame">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => step(1)} aria-label="Forward one frame" title="Forward one frame">
          <ChevronRight className="h-4 w-4" />
        </Button>
        {SPEEDS.map((s) => (
          <Button key={s} size="sm" variant={speed === s ? "default" : "outline"} onClick={() => setSpeed(s)}>
            {s}x
          </Button>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        <Button
          size="sm"
          variant={drawMode ? "default" : "outline"}
          onClick={() => { setDrawMode((d) => !d); setAnglePts([]); }}
          className="gap-1.5"
          title={drawMode ? "Turn drawing off to use the video controls" : "Turn drawing on to mark up the frame"}
        >
          <Pencil className="h-4 w-4" /> {drawMode ? "Draw on" : "Draw off"}
        </Button>
        <Button size="sm" variant={drawMode && tool === "pen" ? "default" : "outline"} onClick={() => { setTool("pen"); setDrawMode(true); setAnglePts([]); }} className="gap-1.5">
          <Pencil className="h-4 w-4" /> Pen
        </Button>
        <Button size="sm" variant={drawMode && tool === "line" ? "default" : "outline"} onClick={() => { setTool("line"); setDrawMode(true); setAnglePts([]); }} className="gap-1.5">
          <Minus className="h-4 w-4" /> Line
        </Button>
        <Button size="sm" variant={drawMode && tool === "angle" ? "default" : "outline"} onClick={() => { setTool("angle"); setDrawMode(true); }} className="gap-1.5">
          <Triangle className="h-4 w-4" /> Angle
        </Button>
        <Button size="sm" variant="outline" onClick={() => { setShapes([]); setDraft(null); setAnglePts([]); }} className="gap-1.5">
          <Eraser className="h-4 w-4" /> Clear
        </Button>
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Pen colour ${c}`}
              onClick={() => setColor(c)}
              className={"h-5 w-5 rounded-full border-2 " + (color === c ? "border-foreground" : "border-transparent")}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {soundBar}

      {drawMode && tool === "angle" && (
        <Badge variant="secondary" className="text-[11px]">
          Tap three points: end of the first line, the corner, then end of the second line. The
          number shown is the angle between the lines you drew.
        </Badge>
      )}
      {!drawMode && (
        <p className="text-[11px] text-muted-foreground">
          Drawing is off, so the video's own controls work. Turn Draw on to mark up the frame.
        </p>
      )}
    </>
  );

  const stage = (
    <div ref={wrapRef} className={expanded ? "relative flex-1 min-h-0" : "relative w-full"}>
      <video
        ref={videoRef}
        src={url}
        playsInline
        muted={!videoSound}
        controls={!drawMode}
        className={expanded ? "h-full w-full bg-black object-contain" : "w-full rounded-md bg-black"}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          if (Number.isFinite(v.duration)) setDuration(v.duration);
          v.playbackRate = speed;
          v.muted = !videoSound;
          sizeCanvas();
        }}
        onDurationChange={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
        }}
        onTimeUpdate={(e) => handleTime(e.currentTarget.currentTime)}
        onSeeked={(e) => {
          const t = e.currentTarget.currentTime;
          lastTimeRef.current = t;
          setCurrent(t);
          for (const n of timedNotes) {
            if ((n.timestampSec ?? 0) >= t) firedRef.current.delete(n.id);
          }
        }}
      />
      <canvas
        ref={canvasRef}
        className={
          "absolute inset-0 h-full w-full touch-none " +
          (drawMode ? "" : "pointer-events-none")
        }
        style={{ cursor: drawMode ? "crosshair" : "default" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      />
      {caption && (
        <div className="pointer-events-none absolute inset-x-2 bottom-14 rounded-md bg-black/70 p-2 text-center text-sm text-white">
          {caption.text}
        </div>
      )}
      {drawMode && (
        <Badge className="absolute top-2 left-2 pointer-events-none">Drawing</Badge>
      )}
      <Button
        size="icon"
        variant="secondary"
        aria-label={expanded ? "Close full screen review" : "Expand review to full screen"}
        onClick={() => setExpanded((v) => !v)}
        className="absolute top-2 right-2 h-11 w-11 shadow-md bg-background/90 text-foreground hover:bg-background"
      >
        {expanded ? <X className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
      </Button>
    </div>
  );

  if (expanded) {
    return (
      <div className="fixed inset-0 z-[130] flex flex-col bg-black">
        {stage}
        <div className="max-h-[55vh] space-y-2 overflow-y-auto bg-background p-3">
          {controls}
          {notesPanel}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {stage}
      {controls}
      {notesPanel}
    </div>
  );
}
