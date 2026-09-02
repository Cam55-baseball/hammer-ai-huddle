import { Gauge, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BallFlightResult } from "@/lib/cv/runBallFlight";

interface BallFlightPanelProps {
  running: boolean;
  result: BallFlightResult | null;
}

/**
 * Ball-flight section of the single report card. Always renders once the
 * athlete chose analysis — either the measured number or the honest reason
 * there isn't one. Never a blank space, never a guessed number.
 */
export function BallFlightPanel({ running, result }: BallFlightPanelProps) {
  if (!running && !result) return null;

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-primary/10">
          <Gauge className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">Ball speed</p>
            {result?.status === "measured" ? (
              <Badge variant="secondary">Measured</Badge>
            ) : result ? (
              <Badge variant="outline">Not measured</Badge>
            ) : null}
          </div>

          {running && (
            <p className="text-xs text-muted-foreground mt-2 inline-flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Following the ball through your clip…
            </p>
          )}

          {result?.status === "measured" && result.velocity_mph != null && (
            <p className="text-2xl font-bold mt-1">{result.velocity_mph.toFixed(1)} mph</p>
          )}

          {result?.status === "missing" && (
            <p className="text-xs text-muted-foreground mt-2">{result.reason}</p>
          )}

          {result?.status === "measured" && result.referenceDistanceFt != null && (
            <p className="text-xs text-muted-foreground mt-1">
              Measured against {result.referenceDistanceFt} ft
              {result.captureFps ? ` at ${Math.round(result.captureFps)} fps` : ""}.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
