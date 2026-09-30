import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PLATE_POINTS_IN, solveFieldCamera, type P2, type PnPResult } from "@/lib/biomech/camera/fieldPnP";

const STEPS = ["front-left corner", "front-right corner", "right side corner", "back point", "left side corner"];

/** One-tap fallback when the plate corners are not detected automatically. */
export function TapPlateCorners({ frameUrl, width, height, onSolved }: {
  frameUrl: string; width: number; height: number; onSolved: (r: PnPResult, taps: P2[]) => void;
}) {
  const [taps, setTaps] = useState<P2[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const tap = (e: React.PointerEvent) => {
    if (taps.length >= 5 || !ref.current) return;
    const b = ref.current.getBoundingClientRect();
    const next = [...taps, { x: ((e.clientX - b.left) / b.width) * width, y: ((e.clientY - b.top) / b.height) * height }];
    setTaps(next);
    if (next.length === 5) {
      const r = solveFieldCamera([...PLATE_POINTS_IN], next, { imageWidth: width, imageHeight: height });
      setMsg(r.ok ? "Got it — camera position found." : "Those taps don't match the plate's shape. Please try again, a little more carefully.");
      onSolved(r, next);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {taps.length < 5 ? `Tap the plate's ${STEPS[taps.length]}` : msg}
      </p>
      <div ref={ref} onPointerDown={tap} className="relative w-full cursor-crosshair overflow-hidden rounded-md border border-border" style={{ aspectRatio: `${width} / ${height}` }}>
        <img src={frameUrl} alt="Frame showing home plate" className="h-full w-full object-contain" draggable={false} />
        {taps.map((p, i) => (
          <span key={i} className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-background"
            style={{ left: `${(p.x / width) * 100}%`, top: `${(p.y / height) * 100}%` }} />
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={() => { setTaps([]); setMsg(null); }}>Start over</Button>
    </div>
  );
}
