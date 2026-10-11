import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Messages from coaches the signed-in user may read (own, or a linked child's copies). */
export function CoachMessagesInbox({ athleteId, title }: { athleteId: string; title: string }) {
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
              <p className="text-xs text-muted-foreground">Coach message · {new Date(m.created_at).toLocaleDateString()}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
