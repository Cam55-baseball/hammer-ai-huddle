import { format, formatDistanceToNow } from "date-fns";
import { ENGINE_VERSION } from "@/lib/asb/engineVersion";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

interface Props {
  rows: AsbEventRow[] | undefined;
}

export function TodayOverviewHeader({ rows }: Props) {
  const latest = rows?.[0] ?? null;
  const updated = latest ? formatDistanceToNow(new Date(latest.occurred_at), { addSuffix: true }) : null;
  return (
    <header
      className="mb-2"
      title={`engine ${ENGINE_VERSION}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold leading-tight sm:text-2xl">
            How your body is doing today
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            {format(new Date(), "EEEE, MMM d")}
            {updated ? ` · updated ${updated}` : ""}
          </p>
        </div>
        <span
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
          aria-label="Live"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Live
        </span>
      </div>
    </header>
  );
}
