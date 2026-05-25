import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { FORECAST_BOUNDARY_DISCLAIMER } from "@/lib/digest/sentences";

export function ForecastBoundaryCard() {
  return (
    <Card className="border-dashed border-muted-foreground/40 bg-muted/20">
      <CardContent className="flex items-start gap-3 py-4">
        <ShieldAlert className="mt-0.5 h-5 w-5 text-muted-foreground" />
        <div className="text-sm">
          <p className="font-medium text-foreground">{FORECAST_BOUNDARY_DISCLAIMER}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            All values below are deterministic continuation projections from canonical events.
            No injury, psychological, scholarship, or performance prediction is performed.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
