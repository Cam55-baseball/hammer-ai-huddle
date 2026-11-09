import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useParentLinks } from "@/hooks/useParentLink";
import { supabase } from "@/integrations/supabase/client";
import { MOVEMENT_CONSENT_TEXT, type MovementConsentStatus } from "@/lib/legal/movementConsent";

const db = supabase as never as { from: (t: string) => any };
const rpc = supabase.rpc as unknown as (fn: string, args?: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;

/**
 * Parent side of movement-data consent (Release 0): approve or decline a pending request,
 * turn an active one off, or ask for the player's camera-measurement history to be deleted.
 * Rows exist only for players whose movement_consent_v1 switch is on.
 */
export function ParentMovementConsent() {
  const { user } = useAuth();
  const { data: links } = useParentLinks();
  const nameOf = (id: string) => links?.find((l) => l.athlete_user_id === id)?.athlete_full_name ?? "Your player";
  const [rows, setRows] = useState<Array<{ user_id: string; status: MovementConsentStatus }>>([]);
  const [note, setNote] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await db.from("movement_consents").select("user_id, status, created_at").neq("user_id", user.id).order("created_at", { ascending: false }).limit(200);
    const latest = new Map<string, MovementConsentStatus>();
    for (const r of (data ?? []) as Array<{ user_id: string; status: MovementConsentStatus }>) if (!latest.has(r.user_id)) latest.set(r.user_id, r.status);
    setRows([...latest.entries()].map(([user_id, status]) => ({ user_id, status })).filter((r) => r.status === "pending_parent" || r.status === "active"));
  }, [user]);
  useEffect(() => { void load(); }, [load]);
  if (!user || !MOVEMENT_CONSENT_TEXT || rows.length === 0) return null;

  const act = async (fn: string, args: Record<string, unknown>, ok: string) => {
    const { error } = await rpc(fn, args);
    setNote(error ? "That didn't save. Try again." : ok);
    await load();
  };

  return (
    <section aria-label="Camera measurement consent" className="rounded-lg border border-border bg-card p-4 space-y-3">
      <h2 className="text-sm font-bold text-foreground">Camera measurements</h2>
      <p className="whitespace-pre-line text-xs text-muted-foreground">{MOVEMENT_CONSENT_TEXT}</p>
      {rows.map((r) => (
        <div key={r.user_id} className="space-y-2 border-t border-border pt-2 text-sm">
          <p><span className="font-medium">{nameOf(r.user_id)}</span>: {r.status === "pending_parent" ? "asked you to say yes." : "camera measurements are allowed."}</p>
          <div className="flex flex-wrap gap-2">
            {r.status === "pending_parent" ? (
              <>
                <Button size="sm" onClick={() => void act("movement_consent_parent_decide", { _athlete: r.user_id, _approve: true }, "Approved.")}>Yes, allow</Button>
                <Button size="sm" variant="outline" onClick={() => void act("movement_consent_parent_decide", { _athlete: r.user_id, _approve: false }, "Declined.")}>No</Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => void act("movement_consent_revoke", { _athlete: r.user_id }, "Turned off.")}>Turn off</Button>
            )}
            <Button size="sm" variant="outline" onClick={() => void act("request_measurement_deletion", { _athlete: r.user_id }, "Deletion requested.")}>Delete their camera measurements</Button>
          </div>
        </div>
      ))}
      {note && <p className="text-sm" role="status">{note}</p>}
    </section>
  );
}
