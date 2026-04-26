import { Activity, AlertCircle, CheckCircle2, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useVideoReadiness, summarizeReadiness } from "@/hooks/useVideoReadiness";

interface Props {
  onBackfill: () => void;
  onFilterIncomplete: () => void;
  filterActive: boolean;
}

export function LibraryHealthStrip({ onBackfill, onFilterIncomplete, filterActive }: Props) {
  const { data: rows, isLoading } = useVideoReadiness();
  const { total, ready, empty, incomplete } = summarizeReadiness(rows);

  if (isLoading || total === 0) return null;

  const allReady = ready === total;
  const pct = total > 0 ? Math.round((ready / total) * 100) : 0;

  return (
    <Card className="p-3 border-l-4" style={{ borderLeftColor: allReady ? "hsl(var(--primary))" : "hsl(var(--destructive))" }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Activity className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              Library Health: {ready}/{total} videos ready for recommendations ({pct}%)
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" /> {ready} ready
              </span>
              {incomplete > 0 && (
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-amber-500" /> {incomplete} incomplete
                </span>
              )}
              {empty > 0 && (
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-destructive" /> {empty} empty
                </span>
              )}
            </div>
          </div>
        </div>

        {!allReady && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant={filterActive ? "default" : "outline"}
              onClick={onFilterIncomplete}
            >
              {filterActive ? "Show all" : "Show only incomplete"}
            </Button>
            <Button size="sm" onClick={onBackfill}>
              <Wrench className="h-3.5 w-3.5 mr-1.5" />
              Backfill missing data
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
