import { HeartPulse, CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useHammersToday } from "@/components/hammer/HammersTodayProvider";

type RestDayPayload = {
  allowed_class?: string | null;
  next_heavy_chip?: string | null;
  reasons?: string[] | null;
  recovery_only?: boolean | null;
};

/**
 * TCS stage S4 surface. Renders only when the rest-day calculator produced a
 * decision for today's plan — i.e. only when the switch resolves on for this
 * athlete. Absent payload renders nothing at all.
 */
export function WkRestDayBanner() {
  const { data } = useHammersToday() as unknown as {
    data?: Array<{ why_payload?: Record<string, unknown> | null }>;
  };
  const payload = (data ?? [])
    .map((rx) => (rx.why_payload as Record<string, unknown> | null)?.rest_day as RestDayPayload | undefined)
    .find(Boolean);
  if (!payload) return null;

  const reasons = (payload.reasons ?? []).filter(Boolean);
  const recovery = payload.recovery_only === true;

  return (
    <Card className={recovery ? "border-sky-400/40 bg-sky-500/5" : "border-border/60"}>
      <CardContent className="p-3 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <HeartPulse className="h-4 w-4 text-sky-500 shrink-0" />
          <span className="text-sm font-semibold">
            {recovery ? "Recovery & Tissue day" : "Today's training load"}
          </span>
          {payload.next_heavy_chip && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <CalendarClock className="h-3 w-3" />
              {payload.next_heavy_chip}
            </Badge>
          )}
        </div>
        {/* Step 21A — "Do this after your skill work" belongs to the lift card
            only. The day header and today's training load never carry it. */}
        {reasons.length > 0 && (
          <ul className="text-[11px] text-muted-foreground list-disc pl-4 space-y-0.5">
            {reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
