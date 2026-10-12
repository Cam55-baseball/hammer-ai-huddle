import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flag } from "lucide-react";
import { ReportContentDialog, type ReportTarget } from "@/components/safety/ReportContentDialog";

/** Messages from coaches the signed-in user may read (own, or a linked child's copies). */
export function CoachMessagesInbox({ athleteId, title }: { athleteId: string; title: string }) {
  const [target, setTarget] = useState<ReportTarget | null>(null);
  const { data: msgs = [] } = useQuery({
    queryKey: ["coach-messages-inbox", athleteId],
    queryFn: async () => {
      const { data } = await supabase
        .from("coach_messages")
        .select("id, body, created_at, coach_id")
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });
  if (msgs.length === 0) return null;
  return (
    <Card data-testid="coach-messages-inbox">
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        <ul className="space-y-3 text-sm">
          {msgs.map((m) => (
            <li key={m.id}>
              <p>{m.body}</p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">Coach message · {new Date(m.created_at).toLocaleDateString()}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                  aria-label="Report this message"
                  onClick={() => setTarget({ contentType: "coach_message", contentId: m.id, reportedUserId: m.coach_id, label: "coach message" })}
                >
                  <Flag className="h-3 w-3" /> Report
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
      {target && (
        <ReportContentDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)} target={target} />
      )}
    </Card>
  );
}
