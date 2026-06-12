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

export function AnalysisProgressIndicator({
  stageLabel = "Analyzing your video",
}: { stageLabel?: string }) {
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

  // Stage messaging gives users a real sense of where the work is.
  let stage = "Extracting frames from your video…";
  if (elapsed > 5) stage = "Locating swing landmarks (load, stride, contact)…";
  if (elapsed > 15) stage = "Measuring mechanics frame-by-frame…";
  if (elapsed > 30) stage = "Scoring the 15-tile report card…";
  if (elapsed > 50) stage = "Re-checking missing measurements (second pass)…";
  if (elapsed > 75) stage = "Almost done — finalizing your scorecard…";

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
