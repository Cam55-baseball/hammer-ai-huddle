import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  videoId: string;
  onRecomputed?: (metrics: Record<string, unknown>) => void;
}

/**
 * On-demand backfill for the Hammer Report Card. Calls the
 * `recompute-report-card` edge function which re-runs structured metric
 * extraction against the existing saved analysis and writes the result back
 * to `ai_analysis.metrics`. Lineage-preserving — never mutates feedback,
 * scorecard, or efficiency_score.
 */
export function RecomputeReportCardButton({ videoId, onRecomputed }: Props) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("recompute-report-card", {
        body: { video_id: videoId },
      });
      if (error) throw error;
      const metrics = (data as { metrics?: Record<string, unknown> })?.metrics;
      if (metrics && Object.keys(metrics).length > 0) {
        onRecomputed?.(metrics);
        toast.success("Report card refreshed");
      } else {
        toast.message("Recompute finished — no metrics could be extracted from this analysis.");
      }
    } catch (e: any) {
      console.error("[recompute-report-card]", e);
      toast.error(e?.message || "Failed to recompute report card");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={busy}
      onClick={run}
      className="w-full justify-center text-xs text-muted-foreground"
    >
      <RefreshCcw className={`h-3.5 w-3.5 mr-2 ${busy ? "animate-spin" : ""}`} />
      {busy ? "Recomputing report card…" : "Recompute report card"}
    </Button>
  );
}
