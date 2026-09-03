/**
 * SessionReviewPlayer — watch a recorded DelayCam session back and draw on it.
 *
 * Self-review only: no metrics, no scoring, no analysis. Just playback with
 * speed control, frame stepping, a scrubber, and drawing tools (freehand,
 * straight line, and a three-point angle tool that reads out the degrees
 * between two lines).
 *
 * Nothing here is measurement of the athlete — the angle read-out is the angle
 * between the lines the user drew on screen, which is what a coach draws on a
 * whiteboard. It is labelled as such.
 *
 * Two things matter for phones: (1) drawing is an explicit mode, so the video's
 * own controls are reachable when it's off, and (2) full screen is a plain
 * full-viewport overlay, because iOS Safari will not fullscreen a canvas
 * overlay. Shapes are stored in normalised 0–1 coordinates so they stay put
 * and stay aligned when the view changes size.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pencil, Minus, Triangle, Eraser, Play, Pause, ChevronLeft, ChevronRight,
  Maximize2, X,
} from "lucide-react";

type Tool = "pen" | "line" | "angle";
/** Normalised 0–1 coordinates, so shapes survive any resize. */
type Pt = { x: number; y: number };
type Shape =
  | { kind: "pen"; pts: Pt[]; color: string }
  | { kind: "line"; a: Pt; b: Pt; color: string }
  | { kind: "angle"; a: Pt; v: Pt; b: Pt; color: string };

const COLORS = ["#FF3B30", "#FFD60A", "#30D158", "#0A84FF", "#FFFFFF"];
const SPEEDS = [0.25, 0.5, 1];

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

export function SessionReviewPlayer({ url }: { url: string }) {
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

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed, url]);

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
            const v = videoRef.current;
            if (!v) return;
            const t = Number(e.target.value);
            v.currentTime = t;
            setCurrent(t);
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
        controls={!drawMode}
        className={expanded ? "h-full w-full bg-black object-contain" : "w-full rounded-md bg-black"}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          if (Number.isFinite(v.duration)) setDuration(v.duration);
          v.playbackRate = speed;
          sizeCanvas();
        }}
        onDurationChange={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onSeeked={(e) => setCurrent(e.currentTarget.currentTime)}
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
        <div className="space-y-2 bg-background p-3">{controls}</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {stage}
      {controls}
    </div>
  );
}
