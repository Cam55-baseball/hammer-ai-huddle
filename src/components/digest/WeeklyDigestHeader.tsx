import { CalendarRange } from "lucide-react";

interface Props {
  windowLabel: string;
  totalEvents: number;
}

export function WeeklyDigestHeader({ windowLabel, totalEvents }: Props) {
  return (
    <header className="flex items-start justify-between gap-4 border-b pb-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <CalendarRange className="h-6 w-6 text-primary" />
          Weekly Organism Digest
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Deterministic week-over-week organism change derived from canonical ASB events. Every
          statement is lineage-cited.
        </p>
      </div>
      <div className="text-right">
        <p className="font-mono text-xs text-muted-foreground">{windowLabel}</p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">{totalEvents} events</p>
      </div>
    </header>
  );
}
