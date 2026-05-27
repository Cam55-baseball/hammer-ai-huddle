import { Link } from "react-router-dom";
import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TopicLabel } from "../TopicLabel";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

interface Props { rows: AsbEventRow[] | undefined; loading?: boolean }

export function RecentEventsPreview({ rows, loading }: Props) {
  const items = (rows ?? []).slice(0, 8);
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Recent activity
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/timeline">Open timeline →</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-24 w-full animate-pulse rounded-md bg-muted/50" />
        ) : items.length === 0 ? (
          <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
            No updates yet. New activity will appear here in real time.
          </div>
        ) : (
          <ul className="divide-y">
            {items.map((r) => (
              <li key={r.event_id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <TopicLabel id={r.topic_id} />
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{r.occurred_at}</p>
                </div>
                <Link
                  to={`/replay/${r.event_id}`}
                  className="shrink-0 text-xs text-primary underline-offset-2 hover:underline"
                >
                  review →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
