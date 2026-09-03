/**
 * SessionReviewPlayer — watch a recorded DelayCam session back and draw on it.
 *
 * Self-review only: no metrics, no scoring, no analysis. Just playback with
 * speed control, frame stepping, and drawing tools (freehand, straight line,
 * and a three-point angle tool that reads out the degrees between two lines).
 *
 * Nothing here is measurement of the athlete — the angle read-out is the angle
 * between the lines the user drew on screen, which is what a coach draws on a
 * whiteboard. It is labelled as such.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Minus, Triangle, Eraser, Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";

type Tool = "pen" | "line" | "angle";
type Pt = { x: number; y: number };
type Shape =
  | { kind: "pen"; pts: Pt[]; color: string }
  | { kind: "line"; a: Pt; b: Pt; color: string }
  | { kind: "angle"; a: Pt; v: Pt; b: Pt; color: string };

const COLORS = ["#FF3B30", "#FFD60A", "#30D158", "#0A84FF", "#FFFFFF"];
const SPEEDS = [0.25, 0.5, 1];

function angleDeg(a: Pt, v: Pt, b: Pt): number {
  const a1 = Math.atan2(a.y - v.y, a.x - v.x);
  const a2 = Math.atan2(b.y - v.y, b.x - v.x);
  let d = Math.abs((a1 - a2) * (180 / Math.PI));
  if (d > 180) d = 360 - d;
  return d;
}

export function SessionReviewPlayer({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [draft, setDraft] = useState<Shape | null>(null);
  const [anglePts, setAnglePts] = useState<Pt[]>([]);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const drawingRef = useRef(false);

  // Keep the canvas pixel size matched to its displayed size.
  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current;
      const w = wrapRef.current;
      if (!c || !w) return;
      const r = w.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        c.width = Math.round(r.width);
        c.height = Math.round(r.height);
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [url]);

  const render = useCallback(() => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    const all = draft ? [...shapes, draft] : shapes;
    for (const s of all) {
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      if (s.kind === "pen") {
        ctx.beginPath();
        s.pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();
      } else if (s.kind === "line") {
        ctx.beginPath();
        ctx.moveTo(s.a.x, s.a.y);
        ctx.lineTo(s.b.x, s.b.y);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(s.a.x, s.a.y);
        ctx.lineTo(s.v.x, s.v.y);
        ctx.lineTo(s.b.x, s.b.y);
        ctx.stroke();
        const deg = angleDeg(s.a, s.v, s.b);
        ctx.font = "600 15px system-ui, sans-serif";
        const label = `${Math.round(deg)}°`;
        const tx = s.v.x + 10;
        const ty = s.v.y - 10;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(tx - 4, ty - 16, ctx.measureText(label).width + 8, 20);
        ctx.fillStyle = s.color;
        ctx.fillText(label, tx, ty);
      }
    }
    // In-progress angle points
    if (tool === "angle" && anglePts.length > 0) {
      ctx.fillStyle = color;
      for (const p of anglePts) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [shapes, draft, anglePts, tool, color]);

  useEffect(() => { render(); }, [render]);

  const pos = (e: React.PointerEvent): Pt => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onDown = (e: React.PointerEvent) => {
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
    if (!drawingRef.current || !draft) return;
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
    v.currentTime = Math.max(0, v.currentTime + dir * (1 / 30));
  };

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play().catch(() => {}); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed]);

  return (
    <div className="space-y-2">
      <div ref={wrapRef} className="relative w-full">
        <video
          ref={videoRef}
          src={url}
          playsInline
          controls
          className="w-full rounded-md bg-black"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none"
          style={{ cursor: "crosshair" }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={toggle} className="gap-1.5">
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {playing ? "Pause" : "Play"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => step(-1)} title="Back one frame">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => step(1)} title="Forward one frame">
          <ChevronRight className="h-4 w-4" />
        </Button>
        {SPEEDS.map((s) => (
          <Button key={s} size="sm" variant={speed === s ? "default" : "outline"} onClick={() => setSpeed(s)}>
            {s}x
          </Button>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        <Button size="sm" variant={tool === "pen" ? "default" : "outline"} onClick={() => { setTool("pen"); setAnglePts([]); }} className="gap-1.5">
          <Pencil className="h-4 w-4" /> Draw
        </Button>
        <Button size="sm" variant={tool === "line" ? "default" : "outline"} onClick={() => { setTool("line"); setAnglePts([]); }} className="gap-1.5">
          <Minus className="h-4 w-4" /> Line
        </Button>
        <Button size="sm" variant={tool === "angle" ? "default" : "outline"} onClick={() => setTool("angle")} className="gap-1.5">
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

      {tool === "angle" && (
        <Badge variant="secondary" className="text-[11px]">
          Tap three points: end of the first line, the corner, then end of the second line. The
          number shown is the angle between the lines you drew.
        </Badge>
      )}
    </div>
  );
}
