/**
 * GpInGameSummaryCard — compact "from the field" view at the top of the
 * The General. Renders nothing when no games have been logged.
 */
import { useNavigate } from "react-router-dom";
import { Trophy, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGpSignal } from "@/hooks/useGpSignal";

export function GpInGameSummaryCard() {
  const signal = useGpSignal(7);
  const navigate = useNavigate();

  if (signal.loading) return null;
  if (signal.atBats === 0 && signal.pitchesSeen === 0 && signal.defensivePlays === 0) {
    return null;
  }

  return (
    <Card className="p-4 border-primary/20">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">From the field — last {signal.windowDays} days</h3>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1"
          onClick={() => navigate("/games/reports")}
        >
          Reports <ArrowRight className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{signal.atBats} AB</Badge>
        <Badge variant="outline">{signal.pitchesSeen} pitches seen</Badge>
        <Badge variant="outline">{signal.defensivePlays} D plays</Badge>
        {signal.kRate != null && <Badge variant="secondary">K% {signal.kRate}</Badge>}
        {signal.whiffPct != null && <Badge variant="secondary">Whiff% {signal.whiffPct}</Badge>}
        {signal.chasePct != null && <Badge variant="secondary">Chase% {signal.chasePct}</Badge>}
      </div>

      {signal.advisories.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {signal.advisories.map((a, i) => (
            <li key={i} className="text-[11px] text-muted-foreground leading-snug">
              • {a.message}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
