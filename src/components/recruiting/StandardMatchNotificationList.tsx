/**
 * Renders recruiting-match pings for whichever side the viewer is on.
 * Content is limited to what the match itself justifies: org, standard, date —
 * plus the athlete's name on the org side only.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BellRing, Check, Mail, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useFollowMatchedAthlete,
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
  const follow = useFollowMatchedAthlete();
  const { toast } = useToast();

  const handleFollow = async (athleteUserId: string, athleteName?: string) => {
    try {
      const status = await follow.mutateAsync(athleteUserId);
      toast({
        title: status === "pending" ? "Follow request sent" : `Already ${status}`,
        description: `${athleteName ?? "This athlete"} will see your request and accept it from their side.`,
      });
    } catch (err) {
      toast({
        title: "Could not follow",
        description: (err as Error)?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

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

              {kind === "standard_match_org" && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {n.template_snapshot?.athlete_email && (
                    <a
                      href={`mailto:${n.template_snapshot.athlete_email}`}
                      className="inline-flex items-center gap-1 text-xs underline underline-offset-2"
                    >
                      <Mail className="h-3 w-3" />
                      {n.template_snapshot.athlete_email}
                    </a>
                  )}
                  {n.template_snapshot?.athlete_user_id && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={follow.isPending}
                      onClick={() =>
                        handleFollow(
                          n.template_snapshot!.athlete_user_id!,
                          n.template_snapshot?.athlete_name,
                        )
                      }
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1" />
                      Follow this player
                    </Button>
                  )}
                </div>
              )}
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
