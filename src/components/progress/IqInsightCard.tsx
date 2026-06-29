/**
 * Wave 6 — IQ Insight card on Progress Landing.
 *
 * Surfaces athlete's weakest Game IQ lens (defense / offense / pitching /
 * baserunning) once enough attempts are logged. Below the floor, the card
 * stays trust-first: a short "keep repping" nudge with no fabricated reading.
 */
import { Link } from "react-router-dom";
import { Brain, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useIqWeakestLens } from "@/hooks/useIqWeakestLens";
import { LENS_LABELS, type IqLens } from "@/lib/iq/types";

const LENS_BLURB: Record<IqLens, string> = {
  defense: "Reps will sharpen your reads on Ball / Bag / Backup assignments.",
  offense: "Reps will tighten baserunning decisions and at-bat awareness.",
  pitching: "Reps will sharpen PFP, hold-runner reads, and pitch sequencing.",
  baserunning: "Reps will tighten leads, secondary reads, and first-and-third decisions.",
};

export function IqInsightCard() {
  const { data, isLoading } = useIqWeakestLens();

  if (isLoading) return null;

  const weakest = data?.weakest ?? null;
  const totalAttempts = data?.totalAttempts ?? 0;

  if (!weakest) {
    return (
      <Card className="p-4 border-border/40 bg-gradient-to-br from-indigo-500/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-indigo-500/10 p-2"><Brain className="h-4 w-4 text-indigo-500" /></div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">Game IQ</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {totalAttempts === 0
                ? "No reps logged yet. Start with a few situations and the system will surface your weakest lens."
                : "Keep repping — a few more attempts per lens and we'll surface a clear focus area."}
            </p>
            <Button asChild size="sm" variant="ghost" className="mt-2 h-7 px-2 text-xs">
              <Link to="/iq/review">Start reps <ArrowRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 border-border/40 bg-gradient-to-br from-indigo-500/10 to-transparent">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-indigo-500/15 p-2"><Brain className="h-4 w-4 text-indigo-500" /></div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">
            Weakest lens: <span className="text-indigo-500">{LENS_LABELS[weakest]}</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{LENS_BLURB[weakest]}</p>
          <Button asChild size="sm" className="mt-2 h-7 px-2 text-xs">
            <Link to={`/iq/review?lens=${weakest}`}>
              Focus reps on {LENS_LABELS[weakest]} <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
