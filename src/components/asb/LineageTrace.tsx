import { useEventLineage, type LineageEdge } from "@/hooks/useEventLineage";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDown, ArrowUp, GitBranch } from "lucide-react";

interface Props {
  eventId: string;
}

function EdgeRow({ edge, direction }: { edge: LineageEdge; direction: "ancestor" | "descendant" }) {
  const other = direction === "ancestor" ? edge.parent_event_id : edge.child_event_id;
  return (
    <div className="flex items-start gap-2 text-xs font-mono p-2 rounded border border-border bg-background">
      {direction === "ancestor" ? (
        <ArrowUp className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
      ) : (
        <ArrowDown className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
      )}
      <div className="space-y-0.5 min-w-0 flex-1">
        <div className="truncate">
          <span className="text-muted-foreground">
            {direction === "ancestor" ? "parent_event_id" : "child_event_id"}:
          </span>{" "}
          {other}
        </div>
        <div className="text-muted-foreground">
          derivation_type: <span className="text-foreground">{edge.derivation_type}</span>
          {" · "}engine: <span className="text-foreground">{edge.engine_version}</span>
          {" · "}
          {new Date(edge.created_at).toISOString()}
        </div>
        <div className="text-[10px] text-muted-foreground">lineage_id: {edge.lineage_id}</div>
      </div>
    </div>
  );
}

export function LineageTrace({ eventId }: Props) {
  const { data, isLoading, error } = useEventLineage(eventId);

  if (isLoading) {
    return (
      <div className="space-y-2" role="status" aria-live="polite" aria-label="Loading lineage">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-xs text-destructive">
        Failed to load lineage: {(error as Error).message}
      </div>
    );
  }

  const ancestors = data?.ancestors ?? [];
  const descendants = data?.descendants ?? [];

  if (ancestors.length === 0 && descendants.length === 0) {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <GitBranch className="h-3 w-3" />
        No lineage edges recorded for this event. Single-hop traversal only.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs font-semibold mb-1 flex items-center gap-1">
          <ArrowUp className="h-3 w-3" /> Ancestors ({ancestors.length})
        </div>
        {ancestors.length === 0 ? (
          <div className="text-xs text-muted-foreground">No parent events.</div>
        ) : (
          <div className="space-y-1">
            {ancestors.map((e) => (
              <EdgeRow key={e.lineage_id} edge={e} direction="ancestor" />
            ))}
          </div>
        )}
      </div>
      <div>
        <div className="text-xs font-semibold mb-1 flex items-center gap-1">
          <ArrowDown className="h-3 w-3" /> Descendants ({descendants.length})
        </div>
        {descendants.length === 0 ? (
          <div className="text-xs text-muted-foreground">No derived events.</div>
        ) : (
          <div className="space-y-1">
            {descendants.map((e) => (
              <EdgeRow key={e.lineage_id} edge={e} direction="descendant" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
