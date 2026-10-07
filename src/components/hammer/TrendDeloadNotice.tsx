/** Round 9 — plain reason shown when the lighter week is brought forward by trends. */
import { Feather } from "lucide-react";
import { useHammersToday } from "@/components/hammer/HammersTodayProvider";

export function TrendDeloadNotice() {
  const { data } = useHammersToday() as { data?: Array<Record<string, any>> };
  const row = (data ?? []).find((rx) => rx?.why_payload?.trend_deload?.reason);
  if (!row) return null;
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <div className="flex items-start gap-2">
        <Feather className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">Lifting: lighter week</div>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{String(row.why_payload.trend_deload.reason)}</p>
        </div>
      </div>
    </div>
  );
}
