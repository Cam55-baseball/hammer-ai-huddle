/**
 * CountPlanGrid — 12-cell count-by-count approach grid (0-0 .. 3-2).
 */
import { Card } from "@/components/ui/card";
import { COUNT_KEYS, type CountKey } from "@/lib/games/situationalMatrix";

export interface CountPlanEntry {
  look?: string;
  take?: string;
  swing?: string;
  note?: string;
}

export function CountPlanGrid({
  plan,
}: {
  plan: Partial<Record<CountKey, CountPlanEntry>> | undefined | null;
}) {
  if (!plan) {
    return (
      <p className="text-xs text-muted-foreground">No count plan yet — regenerate the elite plan to populate.</p>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      {COUNT_KEYS.map((k) => {
        const e = plan[k];
        return (
          <Card key={k} className="p-2 text-xs space-y-1">
            <div className="font-bold text-sm">{k}</div>
            {e?.look && <div><span className="text-muted-foreground">Look:</span> {e.look}</div>}
            {e?.take && <div><span className="text-muted-foreground">Take:</span> {e.take}</div>}
            {e?.swing && <div><span className="text-muted-foreground">Swing:</span> {e.swing}</div>}
            {e?.note && <div className="italic text-muted-foreground">{e.note}</div>}
            {!e && <div className="italic text-muted-foreground">—</div>}
          </Card>
        );
      })}
    </div>
  );
}
