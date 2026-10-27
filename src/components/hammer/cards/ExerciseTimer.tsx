import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Elapsed time is wall-clock work time only; pauses never count as work. */
export function ExerciseTimer({ target, onRecord }: { target?: number; onRecord: (seconds: number) => void }) {
  const accumulated = useRef(0);
  const started = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [stopped, setStopped] = useState(false);
  const actual = () => accumulated.current + (started.current == null ? 0 : (Date.now() - started.current) / 1000);
  const pause = () => {
    const seconds = Math.round(actual() * 100) / 100;
    accumulated.current = seconds; started.current = null;
    setElapsed(seconds); setRunning(false);
    return seconds;
  };
  const record = () => { const seconds = pause(); setStopped(true); onRecord(seconds); };
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      const seconds = actual(); setElapsed(seconds);
      if (target != null && seconds >= target) record();
    }, 10);
    return () => window.clearInterval(timer);
  }, [running, target, onRecord]);
  const start = (restart = false) => {
    if (restart || stopped) { accumulated.current = 0; setElapsed(0); }
    setStopped(false);
    started.current = Date.now(); setRunning(true);
  };
  const left = target == null ? elapsed : Math.max(0, target - elapsed);
  const fraction = target != null && target > 0 ? Math.min(1, elapsed / target) : 0;
  return <div data-exercise-timer className="flex flex-wrap items-center gap-3">
    <div className="relative grid h-24 w-24 shrink-0 place-items-center">
      {target != null && <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="5" className="text-muted" />
        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="5" pathLength="1" strokeDasharray="1" strokeDashoffset={fraction} className="text-primary" />
      </svg>}
      <output className="font-mono text-sm tabular-nums" aria-label={target == null ? "Elapsed seconds" : "Remaining seconds"}>{left.toFixed(2)} s</output>
    </div>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={running ? pause : () => start()} aria-label={running ? "Pause timer" : elapsed > 0 && !stopped ? "Resume timer" : "Start timer"} title={running ? "Pause timer" : elapsed > 0 && !stopped ? "Resume timer" : "Start timer"}>{running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
      <Button size="sm" variant="outline" disabled={stopped || elapsed === 0 && !running} onClick={record} aria-label="Stop timer" title="Stop timer"><Square className="h-4 w-4" /></Button>
      <Button size="sm" variant="outline" onClick={() => {
        if (running || elapsed > 0 && !stopped) { start(true); return; }
        pause(); accumulated.current = 0; setElapsed(0); setStopped(false);
      }} aria-label={running || elapsed > 0 && !stopped ? "Restart timer" : "Reset timer"} title={running || elapsed > 0 && !stopped ? "Restart timer" : "Reset timer"}><RotateCcw className="h-4 w-4" /></Button>
    </div>
  </div>;
}