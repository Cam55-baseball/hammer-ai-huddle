import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

/**
 * Shown while a video is being analyzed.
 * - Live spinner so users know nothing is frozen.
 * - Elapsed-seconds counter.
 * - Approximate progress bar against an estimated 45s budget (analysis usually
 *   completes in 25–60s; two-pass extraction can push to ~75s). Bar caps at
 *   97% until results actually arrive so we never claim "done" early.
 */
const EST_SECONDS = 45;

/** Phase wording differs per discipline — a pitch has no "contact". */
const STAGES: Record<string, { t: number; text: string }[]> = {
  hitting: [
    { t: 0, text: "Extracting frames from your video…" },
    { t: 5, text: "Locating swing landmarks (load, stride, contact)…" },
    { t: 15, text: "Measuring mechanics frame-by-frame…" },
    { t: 30, text: "Scoring your report card…" },
    { t: 50, text: "Re-checking missing measurements (second pass)…" },
    { t: 75, text: "Almost done — finalizing your scorecard…" },
  ],
  pitching: [
    { t: 0, text: "Extracting frames from your video…" },
    { t: 5, text: "Locating delivery landmarks (wind-up, stride, release)…" },
    { t: 15, text: "Measuring mechanics frame-by-frame…" },
    { t: 30, text: "Scoring your report card…" },
    { t: 50, text: "Re-checking missing measurements (second pass)…" },
    { t: 75, text: "Almost done — finalizing your scorecard…" },
  ],
  throwing: [
    { t: 0, text: "Extracting frames from your video…" },
    { t: 5, text: "Locating throw landmarks (load, stride, release)…" },
    { t: 15, text: "Measuring mechanics frame-by-frame…" },
    { t: 30, text: "Scoring your report card…" },
    { t: 50, text: "Re-checking missing measurements (second pass)…" },
    { t: 75, text: "Almost done — finalizing your scorecard…" },
  ],
};

export function AnalysisProgressIndicator({
  stageLabel = "Analyzing your video",
  module = "hitting",
}: { stageLabel?: string; module?: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  const pct = Math.min(97, Math.round((elapsed / EST_SECONDS) * 100));
  const remaining = Math.max(0, EST_SECONDS - elapsed);

  const stages = STAGES[module] ?? STAGES.hitting;
  const stage = stages.reduce((acc, s) => (elapsed >= s.t ? s.text : acc), stages[0].text);


  return (
    <Card className="p-6 space-y-4" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary shrink-0" />
        <div className="min-w-0">
          <h3 className="font-semibold text-base">{stageLabel}</h3>
          <p className="text-sm text-muted-foreground">{stage}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Progress value={pct} aria-label="Analysis progress" />
        <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
          <span>{elapsed}s elapsed</span>
          <span>
            {elapsed < EST_SECONDS
              ? `~${remaining}s remaining`
              : "Wrapping up…"}
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Don't close this tab. Most analyses finish in 25–60 seconds; complex
        swings can take a bit longer when a second-pass measurement is needed.
      </p>
    </Card>
  );
}
