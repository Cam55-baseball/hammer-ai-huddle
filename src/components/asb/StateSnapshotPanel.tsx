import { useStateSnapshotForEvent } from "@/hooks/useEventLineage";
import { Skeleton } from "@/components/ui/skeleton";
import { EngineVersionBadge } from "./EngineVersionBadge";

interface Props {
  eventId: string;
}

export function StateSnapshotPanel({ eventId }: Props) {
  const { data, isLoading, error } = useStateSnapshotForEvent(eventId);

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" aria-label="Loading state snapshot">
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (error) {
    return <div className="text-xs text-destructive">Failed to load snapshot: {(error as Error).message}</div>;
  }
  if (!data || data.length === 0) {
    return (
      <div className="text-xs text-muted-foreground">
        No state snapshot recorded as_of this event.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((snap) => (
        <div key={snap.snapshot_id} className="rounded-md border border-border p-3 bg-muted/30">
          <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
            <span className="font-semibold">snapshot_kind:</span>
            <span className="font-mono">{snap.snapshot_kind}</span>
            <EngineVersionBadge engineVersion={snap.engine_version} />
            <span className="text-muted-foreground">
              · {new Date(snap.created_at).toISOString()}
            </span>
          </div>
          <pre className="text-[10px] leading-tight overflow-x-auto whitespace-pre-wrap break-all bg-background p-2 rounded border border-border">
            {JSON.stringify(snap.payload, null, 2)}
          </pre>
          <div className="mt-1 text-[10px] text-muted-foreground font-mono">
            snapshot_id: {snap.snapshot_id}
          </div>
        </div>
      ))}
    </div>
  );
}
