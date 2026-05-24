import { useAsbTimeline } from "@/hooks/useAsbTimeline";
import { EventCard } from "./EventCard";

interface Props {
  athleteId: string;
  pageSize?: number;
}

export function EventTimeline({ athleteId, pageSize = 50 }: Props) {
  const { data, isLoading, error } = useAsbTimeline({ athleteId, pageSize });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading ASB event ledger…</div>;
  }
  if (error) {
    return (
      <div className="text-sm text-destructive">
        Failed to load events: {(error as Error).message}
      </div>
    );
  }
  if (!data || data.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
        No ASB events recorded yet for this athlete. The ledger is empty — no data is being
        fabricated.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((ev) => (
        <EventCard key={ev.event_id} event={ev} />
      ))}
    </div>
  );
}
