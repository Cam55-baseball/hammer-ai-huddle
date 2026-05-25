import { format } from "date-fns";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ENGINE_VERSION } from "@/lib/asb/engineVersion";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

interface Props {
  rows: AsbEventRow[] | undefined;
}

export function TodayOverviewHeader({ rows }: Props) {
  const latest = rows?.[0] ?? null;
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-4 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold leading-tight sm:text-xl">Command Center</h1>
          <p className="truncate text-xs text-muted-foreground">
            {format(new Date(), "EEEE, MMM d · yyyy")}
            {latest ? ` · last event ${latest.occurred_at}` : " · no events yet"}
          </p>
        </div>
        <Badge variant="outline" className="gap-1 font-mono text-xs">
          <ShieldCheck className="h-3 w-3" />
          engine {ENGINE_VERSION}
        </Badge>
      </div>
    </header>
  );
}
