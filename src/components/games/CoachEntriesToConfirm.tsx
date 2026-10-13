import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { STAT_FIELDS, ENTRY_STATUS_LABEL } from "@/lib/coach/coachLogging";

/** Player side: confirm or flag what a coach logged. Flagged entries stay out of ratings. */
export function CoachEntriesToConfirm() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [flagging, setFlagging] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ["my-coach-entries", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any).from("coach_logged_entries").select("*").eq("athlete_id", user!.id).in("status", ["pending", "flagged"]).order("entry_date", { ascending: false });
      return (data ?? []) as any[];
    },
  });
  if (!data || data.length === 0) return null;
  const resolve = async (id: string, confirm: boolean, reason?: string) => {
    const { error } = await (supabase as any).rpc("player_resolve_coach_entry", { _entry: id, _confirm: confirm, _reason: reason ?? null });
    if (error) return toast.error("Could not save. Try again.");
    setFlagging(null);
    toast.success(confirm ? "Confirmed" : "Flagged — your coach will see it");
    qc.invalidateQueries({ queryKey: ["my-coach-entries", user?.id] });
  };
  return (
    <div className="rounded-lg border p-3 space-y-3" data-testid="coach-entries-confirm">
      <p className="font-medium">Your coach logged these — is this right?</p>
      {data.map((e) => (
        <div key={e.id} className="rounded-md border p-3 text-sm space-y-1">
          <div className="flex justify-between"><span className="font-medium">{e.kind === "game" ? "Game" : "Practice"}{e.opponent ? ` vs ${e.opponent}` : ""}</span><span className="text-muted-foreground">{e.entry_date}</span></div>
          <p>{STAT_FIELDS.filter((f) => e.stats?.[f.key] != null).map((f) => `${f.label}: ${e.stats[f.key]}`).join(" · ")}</p>
          <p className="text-xs text-muted-foreground">Source: {e.coach_label} · {ENTRY_STATUS_LABEL[e.status]}</p>
          {flagging === e.id ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => resolve(e.id, false, "not_me")}>This wasn't me</Button>
              <Button size="sm" variant="outline" onClick={() => resolve(e.id, false, "wrong_numbers")}>Numbers are wrong</Button>
              <Button size="sm" variant="ghost" onClick={() => setFlagging(null)}>Back</Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => resolve(e.id, true)}>Yes, that's right</Button>
              {e.status === "pending" && <Button size="sm" variant="outline" onClick={() => setFlagging(e.id)}>Something's wrong</Button>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
