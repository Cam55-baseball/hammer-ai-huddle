import { useState } from "react";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  useEscalationFeed,
  useAcknowledgeEscalation,
} from "@/hooks/command/useEscalationFeed";
import { topicLabel } from "@/lib/asb/topicLabels";

/**
 * Header-mounted bell with unacked escalation count.
 * Each item links to /replay/:eventId and writes an ack on click.
 */
export function NotificationBell() {
  const { items, unackedCount, loading } = useEscalationFeed({ withinHours: 72 });
  const ack = useAcknowledgeEscalation();
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unackedCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {unackedCount > 9 ? "9+" : unackedCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(92vw,360px)] max-h-[70vh] overflow-y-auto p-0"
      >
        <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Escalations (72h)
        </div>
        {loading && (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">Loading…</div>
        )}
        {!loading && items.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            No escalations in the last 72 hours.
          </div>
        )}
        <ul className="divide-y divide-border">
          {items.slice(0, 25).map((i) => {
            const p = (i.event.payload ?? {}) as Record<string, unknown>;
            const conf = typeof p.confidence === "number" ? (p.confidence as number) : null;
            const miss = typeof p.missingness === "string" ? (p.missingness as string) : null;
            return (
              <li key={i.event.event_id}>
                <Link
                  to={`/replay/${i.event.event_id}`}
                  onClick={() => {
                    void ack(i.event.event_id);
                    setOpen(false);
                  }}
                  className={`block px-3 py-2 text-sm hover:bg-muted/60 ${
                    !i.acknowledgedAt ? "" : "opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{topicLabel(i.event.topic_id)}</div>
                      <div className="truncate font-mono text-[10px] text-muted-foreground">{i.event.topic_id}</div>
                    </div>
                    {!i.acknowledgedAt && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{new Date(i.event.occurred_at).toLocaleString()}</span>
                    {conf !== null && <span>conf {conf.toFixed(2)}</span>}
                    {miss && <span>missing: {miss}</span>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
