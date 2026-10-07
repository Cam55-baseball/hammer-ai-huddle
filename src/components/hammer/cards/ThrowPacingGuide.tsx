/**
 * ThrowPacingGuide — Round 9 owner rule (2026-10-07). Guidance only, never a
 * dose. Max-effort throws rest 15–45 s (owner 2026-10-07: health first, no
 * stiffening between throws). Each line has an optional timer; warm-ups/catch play/long toss have none.
 */
import { useState } from "react";
import { RestTimer } from "@/components/hammer/cards/RestTimer";

export interface ThrowPace { key: string; label: string; between: string; min: number | null; max: number | null; line: string }

export const THROW_PACES: ThrowPace[] = [
  { key: "warmup", label: "Warm-ups, catch play, long toss", between: "no timer", min: null, max: null, line: "Throw at your natural rhythm." },
  { key: "pitches", label: "Flat-ground and bullpen pitches", between: "between pitches", min: 15, max: 20, line: "About 15–20 seconds between pitches — game pace." },
  { key: "max_intent", label: "Max-effort pull-downs and velocity throws", between: "between throws", min: 15, max: 45, line: "15–45 seconds between throws — enough to reset, short enough that your arm stays warm and loose." },
  { key: "rounds", label: "PlyoCare and drill rounds", between: "between rounds", min: 60, max: 90, line: "60–90 seconds between rounds, not between every throw." },
];

export function ThrowPacingGuide() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div data-throw-pacing className="rounded-md border bg-muted/20 p-3 space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Throwing pace (guide)</div>
      <ul className="space-y-2">
        {THROW_PACES.map((p) => (
          <li key={p.key} className="text-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-medium text-foreground">{p.label}:</span>{" "}
                <span className="text-muted-foreground">{p.line}</span>
              </div>
              {p.min != null && (
                <button type="button" className="shrink-0 text-[11px] underline text-primary" onClick={() => setOpen(open === p.key ? null : p.key)}>
                  {open === p.key ? "Hide timer" : "Timer"}
                </button>
              )}
            </div>
            {open === p.key && p.min != null && (
              <div className="mt-1"><RestTimer label={`Rest ${p.between}`} seconds={p.min} maxSeconds={p.max} /></div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
