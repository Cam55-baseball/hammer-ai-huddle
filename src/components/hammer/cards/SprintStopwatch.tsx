/**
 * SprintStopwatch — Round 8 Step 2b (screen only; never changes the plan).
 * Self or partner timing, optional step count → average stride length.
 * Times are kept on this device per card (keyed by card id) until logging (2d) saves them.
 */
import { useEffect, useRef, useState } from "react";
import { Play, Square, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface SprintRun { seconds: number; by: "self" | "partner"; steps: number | null }

/** Average stride in feet = distance ÷ steps. */
export function strideFeet(distanceFeet: number | null | undefined, steps: number | null | undefined) {
  if (!distanceFeet || !steps || steps <= 0) return null;
  return Math.round((distanceFeet / steps) * 10) / 10;
}

const key = (id: string) => `hm_sprint_runs:${id}`;

export function SprintStopwatch({ cardId, distanceFeet }: { cardId: string; distanceFeet?: number | null }) {
  const [by, setBy] = useState<"self" | "partner">("partner");
  const [t0, setT0] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [steps, setSteps] = useState("");
  const [runs, setRuns] = useState<SprintRun[]>(() => {
    try { return JSON.parse(localStorage.getItem(key(cardId)) ?? "[]"); } catch { return []; }
  });
  const raf = useRef(0);

  useEffect(() => {
    if (t0 == null) return;
    const tick = () => { setNow(performance.now()); raf.current = requestAnimationFrame(tick); };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [t0]);

  const stop = () => {
    if (t0 == null) return;
    const seconds = Math.round((performance.now() - t0) / 10) / 100;
    const n = parseInt(steps, 10);
    const next = [...runs, { seconds, by, steps: Number.isFinite(n) && n > 0 ? n : null }];
    setRuns(next);
    setT0(null);
    setSteps("");
    try { localStorage.setItem(key(cardId), JSON.stringify(next)); } catch { /* full */ }
  };

  const best = runs.length ? Math.min(...runs.map((r) => r.seconds)) : null;

  return (
    <div data-sprint-stopwatch className="space-y-1.5 rounded-md border border-border bg-muted/40 p-2 text-xs">
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">Timed by:</span>
        <Button size="sm" variant={by === "partner" ? "default" : "outline"} className="h-7 px-2" onClick={() => setBy("partner")}><Users className="mr-1 h-3 w-3" />Partner</Button>
        <Button size="sm" variant={by === "self" ? "default" : "outline"} className="h-7 px-2" onClick={() => setBy("self")}><User className="mr-1 h-3 w-3" />Me</Button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Sprint time:</span>
        <span className="font-mono text-base font-semibold text-foreground">{t0 == null ? "0.00" : ((now - t0) / 1000).toFixed(2)}s</span>
        {t0 == null ? (
          <Button size="sm" className="ml-auto h-8" onClick={() => { setNow(performance.now()); setT0(performance.now()); }}><Play className="mr-1 h-3 w-3" />Go</Button>
        ) : (
          <Button size="sm" variant="destructive" className="ml-auto h-8" onClick={stop}><Square className="mr-1 h-3 w-3" />Stop</Button>
        )}
      </div>
      <label className="flex items-center gap-2">
        <span className="text-muted-foreground">Steps taken (optional):</span>
        <Input inputMode="numeric" pattern="[0-9]*" value={steps} onChange={(e) => setSteps(e.target.value.replace(/\D/g, ""))} className="h-7 w-16 text-xs" />
      </label>
      {runs.length > 0 && (
        <ul className="space-y-0.5">
          {runs.map((r, i) => {
            const s = strideFeet(distanceFeet, r.steps);
            return (
              <li key={i} className="text-foreground">
                Rep {i + 1} time: {r.seconds.toFixed(2)}s ({r.by === "partner" ? "partner" : "self"}-timed)
                {r.steps ? ` · steps: ${r.steps}` : ""}{s ? ` · stride: ${s} ft` : ""}
                {r.seconds === best && runs.length > 1 ? " · best today" : ""}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
