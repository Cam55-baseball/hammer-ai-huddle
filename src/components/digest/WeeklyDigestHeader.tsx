import { CalendarRange } from "lucide-react";
import { ExplainSimplyToggle } from "./DigestStorySection";

interface Props {
  windowLabel: string;
  totalEvents: number;
  simplify: boolean;
  onSimplifyChange: (v: boolean) => void;
}

export function WeeklyDigestHeader({
  windowLabel,
  totalEvents,
  simplify,
  onSimplifyChange,
}: Props) {
  return (
    <header className="space-y-3 border-b pb-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <CalendarRange className="h-6 w-6 text-primary" />
            Your week
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {simplify
              ? "A simple story of how your body did this week."
              : "Deterministic week-over-week organism change. Every statement is lineage-cited."}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <ExplainSimplyToggle on={simplify} onChange={onSimplifyChange} />
          <div className="text-right">
            <p className="font-mono text-xs text-muted-foreground">{windowLabel}</p>
            <p className="font-mono text-xs text-muted-foreground">{totalEvents} events</p>
          </div>
        </div>
      </div>
    </header>
  );
}
