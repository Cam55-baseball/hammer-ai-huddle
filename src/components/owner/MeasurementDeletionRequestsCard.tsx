import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Release 0: requests to delete camera-measurement history (player or parent). Listed for the owner;
 * deleting is a separate, owner-approved step (no automatic deletion of a player's history).
 */
export function MeasurementDeletionRequestsCard() {
  const q = useQuery({
    queryKey: ["measurement-deletion-requests"],
    queryFn: async () => {
      const { data, error } = await (supabase as never as { from: (t: string) => any }).from("measurement_deletion_requests")
        .select("id, user_id, requested_by, status, created_at").eq("status", "pending").order("created_at").limit(200);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; user_id: string; requested_by: string; created_at: string }>;
    },
  });
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Camera-measurement deletion requests</CardTitle></CardHeader>
      <CardContent className="space-y-1 text-sm">
        {q.isLoading && <p className="text-muted-foreground">Loading…</p>}
        {q.error && <p className="text-destructive">Couldn't load the requests.</p>}
        {q.data?.length === 0 && <p className="text-muted-foreground">No requests waiting.</p>}
        {q.data?.map((r) => (
          <p key={r.id}>{r.created_at.slice(0, 10)} · player {r.user_id.slice(0, 8)} · {r.requested_by === r.user_id ? "asked by the player" : "asked by a parent"}</p>
        ))}
      </CardContent>
    </Card>
  );
}
