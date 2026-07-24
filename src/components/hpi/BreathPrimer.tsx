import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Wind, Pause, Play, RotateCcw } from "lucide-react";

/**
 * BreathPrimer — inline breath-timer widget for the Human Performance card.
 * Parses a primer string like:
 *   "Nasal in 4 · out 6 — 6 rounds"
 *   "Box breath 4-4-4-4 — 5 rounds"
 *   "Long-exhale breath: in 4 · out 8 — 8 rounds"
 * and drives a minimalist counter. Falls back to a plain read-along if we
 * can't parse a cadence.
 */

interface Cadence {
  phases: { label: string; seconds: number }[];
  rounds: number;
}

function parseCadence(primer: string): Cadence | null {
  const roundsMatch = primer.match(/(\d+)\s*rounds/i);
  const rounds = roundsMatch ? Math.max(1, parseInt(roundsMatch[1], 10)) : 5;

  const box = primer.match(/(\d+)-(\d+)-(\d+)-(\d+)/);
  if (box) {
    return {
      rounds,
      phases: [
        { label: "In", seconds: +box[1] },
        { label: "Hold", seconds: +box[2] },
        { label: "Out", seconds: +box[3] },
        { label: "Hold", seconds: +box[4] },
      ],
    };
  }
  const inOut = primer.match(/in\s+(\d+)[^\d]+out\s+(\d+)/i);
  if (inOut) {
    return {
      rounds,
      phases: [
        { label: "In", seconds: +inOut[1] },
        { label: "Out", seconds: +inOut[2] },
      ],
    };
  }
  const dashPair = primer.match(/(\d+)-(\d+)\s*breath/i);
  if (dashPair) {
    return {
      rounds,
      phases: [
        { label: "In", seconds: +dashPair[1] },
        { label: "Out", seconds: +dashPair[2] },
      ],
    };
  }
  return null;
}

export function BreathPrimer({ primer, scheduleLabel = "First today — pre-activity" }: { primer: string; scheduleLabel?: string }) {
  const cadence = parseCadence(primer);
  const [running, setRunning] = useState(false);
  const [round, setRound] = useState(1);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [remaining, setRemaining] = useState(cadence?.phases[0]?.seconds ?? 0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!cadence || !running) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      return;
    }
    timerRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r > 1) return r - 1;
        // advance phase
        setPhaseIdx((idx) => {
          const nextIdx = (idx + 1) % cadence.phases.length;
          if (nextIdx === 0) {
            setRound((rd) => {
              if (rd >= cadence.rounds) {
                setRunning(false);
                return cadence.rounds;
              }
              return rd + 1;
            });
          }
          setRemaining(cadence.phases[nextIdx].seconds);
          return nextIdx;
        });
        return 0;
      });
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [running, cadence]);

  const reset = () => {
    setRunning(false);
    setRound(1);
    setPhaseIdx(0);
    setRemaining(cadence?.phases[0]?.seconds ?? 0);
  };

  if (!cadence) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs">
        <Wind className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <div className="font-medium">Breath primer</div>
          <div className="mt-0.5 text-muted-foreground">{primer}</div>
        </div>
      </div>
    );
  }

  const currentPhase = cadence.phases[phaseIdx];
  const finished = !running && round >= cadence.rounds && phaseIdx === cadence.phases.length - 1;

  return (
    <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wind className="h-4 w-4 text-primary" />
          <span className="font-medium">Breath primer</span>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Round {round}/{cadence.rounds}
        </span>
      </div>
      <div className="mt-2 text-muted-foreground">{primer}</div>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1 rounded-md bg-background/60 px-3 py-2 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {currentPhase.label}
          </div>
          <div className="text-2xl font-semibold tabular-nums text-foreground">
            {remaining}s
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            variant={running ? "secondary" : "default"}
            onClick={() => setRunning((r) => !r)}
            className="h-8 px-3"
          >
            {running ? (
              <>
                <Pause className="mr-1 h-3.5 w-3.5" /> Pause
              </>
            ) : (
              <>
                <Play className="mr-1 h-3.5 w-3.5" /> {finished ? "Restart" : "Start"}
              </>
            )}
          </Button>
          <Button size="sm" variant="ghost" onClick={reset} className="h-8 px-3">
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
