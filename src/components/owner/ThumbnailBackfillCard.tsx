import { useState } from "react";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { backfillLibraryThumbnails, type ThumbnailBackfillReport } from "@/lib/videoThumbnail";

/**
 * Owner tool: give every library video a cover image.
 * Platform clips take their own preview picture; our own uploads get a real
 * frame rendered here in the browser and stored. Anything that genuinely
 * cannot produce one is listed by name rather than quietly skipped.
 */
export function ThumbnailBackfillCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<ThumbnailBackfillReport | null>(null);

  const { data: missing = 0 } = useQuery({
    queryKey: ["library-thumbnails-missing"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("library_videos")
        .select("id", { count: "exact", head: true })
        .is("thumbnail_url", null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  if (missing === 0 && !report) return null;

  const run = async () => {
    if (!user) return;
    setRunning(true);
    setReport(null);
    try {
      const res = await backfillLibraryThumbnails(user.id);
      setReport(res);
      qc.invalidateQueries({ queryKey: ["library-thumbnails-missing"] });
      qc.invalidateQueries({ queryKey: ["library-videos"] });
      toast.success(`Cover images added to ${res.updated} video${res.updated === 1 ? "" : "s"}`);
    } catch (err) {
      toast.error((err as Error).message || "Could not add cover images");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <ImageIcon className="h-4 w-4 text-primary shrink-0" />
          <p className="text-sm font-medium">
            {missing} video{missing === 1 ? "" : "s"} still without a cover image
          </p>
        </div>
        <Button size="sm" onClick={run} disabled={running}>
          {running && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          {running ? "Making cover images…" : "Add cover images"}
        </Button>
      </div>

      {report && (
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            {report.updated} updated ({report.generated} frames captured, {report.derived} taken from the
            host).
          </p>
          {report.failed.length > 0 && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-destructive">
              <p className="font-medium">Could not make a cover for:</p>
              <ul className="mt-1 space-y-0.5">
                {report.failed.map((f) => (
                  <li key={f.id}>• {f.title} — {f.reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
