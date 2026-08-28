/**
 * Renders recruiting-match pings for whichever side the viewer is on.
 * Content is limited to what the match itself justifies: org, standard, date —
 * plus the athlete's name on the org side only.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BellRing, Check } from "lucide-react";
import {
  useMarkStandardMatchNotificationRead,
  useStandardMatchNotifications,
} from "@/hooks/useStandardMatchPings";

export function StandardMatchNotificationList({
  kind,
  emptyText,
}: {
  kind: "standard_match_athlete" | "standard_match_org";
  emptyText: string;
}) {
  const { data, isLoading } = useStandardMatchNotifications(kind);
  const markRead = useMarkStandardMatchNotificationRead();

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading notifications…</p>;
  if (!data?.length) return <p className="text-sm text-muted-foreground">{emptyText}</p>;

  return (
    <div className="space-y-2">
      {data.map((n) => (
        <Card key={n.id} className={n.is_read ? "" : "border-primary/60"}>
          <CardContent className="py-3 flex items-start gap-3">
            <BellRing className={`h-4 w-4 mt-0.5 shrink-0 ${n.is_read ? "text-muted-foreground" : "text-primary"}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{n.title}</p>
              {n.message && <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {n.template_snapshot?.org_name && (
                  <Badge variant="outline">{n.template_snapshot.org_name}</Badge>
                )}
                {n.template_snapshot?.standard_label && (
                  <Badge variant="secondary">{n.template_snapshot.standard_label}</Badge>
                )}
                <Badge variant="outline">{new Date(n.created_at).toLocaleDateString()}</Badge>
              </div>
            </div>
            {!n.is_read && (
              <Button size="sm" variant="ghost" onClick={() => markRead.mutate(n.id)}>
                <Check className="h-4 w-4" />
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
