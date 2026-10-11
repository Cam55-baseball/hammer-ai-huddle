import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendErrorText } from "@/lib/coach/messages";

/** Coach → player message box. Recipients are decided by the server by age. */
export function CoachMessageBox({ athleteId }: { athleteId: string }) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: sent = [] } = useQuery({
    queryKey: ["coach-messages-sent", athleteId],
    queryFn: async () => {
      const { data } = await supabase
        .from("coach_messages")
        .select("id, body, created_at, parent_copied, parent_only")
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const send = async () => {
    setBusy(true);
    setStatus(null);
    const { error } = await supabase.rpc("send_coach_message", { _athlete: athleteId, _body: body });
    setBusy(false);
    if (error) return setStatus(sendErrorText(error.message));
    setBody("");
    setStatus("Sent.");
    qc.invalidateQueries({ queryKey: ["coach-messages-sent", athleteId] });
  };

  return (
    <Card data-testid="coach-message-box">
      <CardHeader><CardTitle className="text-base">Message this player</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Players 13–17: their parent gets a copy. Under 13: only the parent receives it.
        </p>
        <Textarea value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} placeholder="Write a message" />
        <div className="flex items-center gap-3">
          <Button size="sm" disabled={busy || !body.trim()} onClick={send}>Send</Button>
          {status && <span className="text-sm text-muted-foreground" role="status">{status}</span>}
        </div>
        {sent.length > 0 && (
          <ul className="space-y-2 border-t pt-3 text-sm">
            {sent.map((m) => (
              <li key={m.id}>
                <p>{m.body}</p>
                <p className="text-xs text-muted-foreground">
                  Sent {new Date(m.created_at).toLocaleDateString()} ·{" "}
                  {m.parent_only ? "To parent only" : m.parent_copied ? "To player, parent copied" : "To player"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
