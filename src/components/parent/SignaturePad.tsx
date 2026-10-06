import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/** Finger-drawn signature. Reports a PNG data URL, or null when cleared. */
export function SignaturePad({ onChange }: { onChange: (png: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const strokes = useRef(0);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const c = ref.current!;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.clientWidth * ratio;
    c.height = c.clientHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = getComputedStyle(c).color;
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    ref.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = ref.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = ref.current!.getContext("2d")!;
    const p = pos(e);
    ctx.lineTo(p.x, p.y); ctx.stroke();
    strokes.current += 1;
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (strokes.current > 8) { setEmpty(false); onChange(ref.current!.toDataURL("image/png")); }
  };
  const clear = () => {
    const c = ref.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    strokes.current = 0; setEmpty(true); onChange(null);
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={ref}
        aria-label="Signature box — sign with your finger"
        className="h-40 w-full touch-none rounded-xl border-2 border-dashed border-border bg-card text-foreground"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{empty ? "Sign with your finger" : "Signed"}</span>
        <Button type="button" variant="ghost" size="sm" onClick={clear}>Clear</Button>
      </div>
    </div>
  );
}
