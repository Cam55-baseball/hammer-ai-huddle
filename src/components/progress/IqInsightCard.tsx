/**
 * Wave 6 — IQ Insight card on Progress Landing.
 *
 * Game IQ 101 is under construction, so this card is a static
 * "coming soon" tile. Restore the weakest-lens logic when the module ships.
 */
import { Brain } from "lucide-react";
import { Card } from "@/components/ui/card";

export function IqInsightCard() {
  return (
    <Card className="p-4 border-border/40 border-dashed bg-gradient-to-br from-indigo-500/5 to-transparent">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-indigo-500/10 p-2"><Brain className="h-4 w-4 text-indigo-500" /></div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-muted-foreground">Game IQ 101 · Coming soon</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Under construction. It will unlock on your plan automatically once it's ready.
          </p>
        </div>
      </div>
    </Card>
  );
}
