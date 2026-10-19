/** Logged-data Game IQ navigation; never invent an insight score. */
import { Brain } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";

export function IqInsightCard() {
  return (
    <Card className="p-4 border-border/40">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2"><Brain className="h-4 w-4 text-primary" /></div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">Game IQ</h3>
          <Link className="text-xs text-primary mt-1 inline-block" to="/progress#game-iq">Open game reports</Link>
        </div>
      </div>
    </Card>
  );
}
