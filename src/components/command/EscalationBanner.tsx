import { AlertTriangle, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEscalationFeed, useAcknowledgeEscalation } from "@/hooks/command/useEscalationFeed";
import { topicLabel } from "@/lib/asb/topicLabels";

/**
 * Sticky banner shown on /command when ≥1 unacked escalation exists in the
 * last 72h. Reads only from canonical asb_events via useEscalationFeed.
 *
 * RFL-071 closure (Command Center Authority Restoration §B): "See why" now
 * acknowledges through the same canonical mutation the Bell uses so the
 * unacked count decrements regardless of entry surface.
 */
export function EscalationBanner() {
  const { items, unackedCount } = useEscalationFeed({ withinHours: 72 });
  const ack = useAcknowledgeEscalation();
  const navigate = useNavigate();
  if (unackedCount === 0) return null;
  const first = items.find((i) => !i.acknowledgedAt) ?? items[0];

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">
      <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-destructive">
          {unackedCount} thing{unackedCount === 1 ? "" : "s"} that need a look
        </div>
        <div className="truncate text-xs text-muted-foreground">
          Latest: {topicLabel(first.event.topic_id)}
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          void ack(first.event.event_id);
          navigate(`/replay/${first.event.event_id}`);
        }}
        className="flex shrink-0 items-center gap-1 rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        See why
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}
