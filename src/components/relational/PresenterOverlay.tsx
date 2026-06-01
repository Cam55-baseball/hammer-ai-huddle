/**
 * Presentation resilience — presenter assist overlay.
 *
 * Mounted only when the URL carries `?presenter=1`. Absent from production
 * surfaces by default. Touches no relational state, no projections, no
 * emit wrappers. Pure presentation choreography aid.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DEMO_CHOREO } from "@/lib/relational/copy";

interface Props {
  stepIdx: number; // -1 = intro
  onStep: (next: number) => void;
}

function fmtElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PresenterOverlay({ stepIdx, onStep }: Props) {
  const total = DEMO_CHOREO.steps.length;
  const startedRef = useRef<number | null>(null);
  const [, force] = useState(0);

  // Start the timer the first time we leave the intro.
  useEffect(() => {
    if (stepIdx >= 0 && startedRef.current == null) {
      startedRef.current = Date.now();
    }
  }, [stepIdx]);

  // 1Hz tick for the timing helper.
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Keyboard shortcuts.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;
      }
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        onStep(Math.min(total - 1, stepIdx + 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        onStep(Math.max(-1, stepIdx - 1));
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        startedRef.current = null;
        onStep(0);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        window.open("/relational?fallback=fixture", "_blank", "noopener");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stepIdx, total, onStep]);

  const label = useMemo(() => {
    if (stepIdx < 0) return DEMO_CHOREO.intro.title;
    return DEMO_CHOREO.steps[stepIdx]?.title ?? "—";
  }, [stepIdx]);

  const targetSec = stepIdx >= 0 ? DEMO_CHOREO.steps[stepIdx]?.seconds ?? 0 : 0;
  const elapsedMs = startedRef.current ? Date.now() - startedRef.current : 0;

  return (
    <div
      className="fixed bottom-3 right-3 z-50 rounded-lg border border-border bg-card/95 backdrop-blur shadow-lg p-3 w-72 space-y-2 text-foreground"
      role="region"
      aria-label="Presenter assist"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-muted-foreground">
          {stepIdx < 0 ? "intro" : `${stepIdx + 1}/${total}`}
        </span>
        <Badge variant="outline" className="text-[10px]">presenter</Badge>
      </div>
      <div className="text-sm font-medium truncate" title={label}>{label}</div>
      <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
        <span>elapsed {fmtElapsed(elapsedMs)}</span>
        <span>target ~{targetSec}s</span>
      </div>
      <div className="flex gap-1 flex-wrap">
        {DEMO_CHOREO.steps.map((s, i) => (
          <button
            key={s.id}
            onClick={() => onStep(i)}
            className={`text-[10px] h-6 w-6 rounded border ${
              i === stepIdx
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted text-muted-foreground border-border hover:bg-accent"
            }`}
            aria-label={`Jump to step ${i + 1}: ${s.title}`}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" className="flex-1" onClick={() => {
          startedRef.current = null;
          onStep(-1);
        }}>
          Reset
        </Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={() => {
          window.open("/relational?fallback=fixture", "_blank", "noopener");
        }}>
          Fallback
        </Button>
      </div>
      <div className="text-[10px] text-muted-foreground leading-tight">
        ← prev · → / space next · R reset · F fallback
      </div>
    </div>
  );
}
