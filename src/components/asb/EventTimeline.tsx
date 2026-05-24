import { useState } from "react";
import { useAsbTimeline, type AsbTimelineCursor } from "@/hooks/useAsbTimeline";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EventCard } from "./EventCard";

interface Props {
  athleteId: string;
  pageSize?: number;
}

/**
 * Cursor-based pagination over raw asb_events. Each page is a deterministic
 * keyset slice on (occurred_at desc, event_id desc). No aggregation, no
 * hidden background fetches — each "Load more" advances by exactly one cursor.
 */
export function EventTimeline({ athleteId, pageSize = 50 }: Props) {
  const [cursor, setCursor] = useState<AsbTimelineCursor | null>(null);
  const [history, setHistory] = useState<AsbTimelineCursor[]>([]);
  const { data, isLoading, isFetching, error } = useAsbTimeline({ athleteId, pageSize, cursor });

  if (isLoading && !data) {
    return (
      <div
        className="space-y-3"
        role="status"
        aria-live="polite"
        aria-label="Loading ASB event ledger"
      >
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-sm text-destructive">
        Failed to load events: {(error as Error).message}
      </div>
    );
  }
  const rows = data?.rows ?? [];
  if (rows.length === 0 && !cursor) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
        No ASB events recorded yet for this athlete. The ledger is empty — no data is being
        fabricated.
      </div>
    );
  }

  const hasPrev = history.length > 0;
  const hasNext = !!data?.nextCursor;

  return (
    <div className="space-y-3">
      {rows.map((ev) => (
        <EventCard key={ev.event_id} event={ev} />
      ))}

      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-muted-foreground font-mono">
          page size: {pageSize} · showing {rows.length}
          {isFetching && " · fetching…"}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasPrev || isFetching}
            onClick={() => {
              const prev = history[history.length - 1] ?? null;
              setHistory((h) => h.slice(0, -1));
              setCursor(prev);
            }}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNext || isFetching}
            onClick={() => {
              if (!data?.nextCursor) return;
              setHistory((h) => [...h, cursor as AsbTimelineCursor]);
              setCursor(data.nextCursor);
            }}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
