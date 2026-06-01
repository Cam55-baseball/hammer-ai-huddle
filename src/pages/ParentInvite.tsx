/**
 * RR-4 — Athlete-facing parent invite page.
 *
 * Lists existing parent relationships (replay-derived via useRelationshipState)
 * and lets the athlete generate a new parent invite token. No parallel state.
 */
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRelationshipState } from "@/hooks/useRelationalProjections";
import { createParentInvite, revokeParentRelationship } from "@/lib/runtime/relational/parentLinking";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export default function ParentInvite() {
  const { user } = useAuth();
  const athleteId = user?.id ?? "";
  const { state, meta } = useRelationshipState(athleteId, "self");
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    if (!user || busy) return;
    setBusy(true);
    try {
      const out = await createParentInvite({ athleteId: user.id });
      const url = `${window.location.origin}/accept-parent-invite?token=${encodeURIComponent(out.token)}`;
      setToken(url);
      toast.success("Invite link created");
    } catch (e) {
      toast.error("Could not create invite");
      console.warn("[parent-invite] create failed", e);
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(rel: { relationship_id: string; created_event_id: string }) {
    if (!user) return;
    try {
      await revokeParentRelationship({
        athleteId: user.id,
        relationshipId: rel.relationship_id,
        createdEventId: rel.created_event_id,
        revokedBy: "self",
        revokedByUserId: user.id,
        reason: "subject_request",
      });
      toast.success("Relationship revoked");
    } catch (e) {
      toast.error("Could not revoke");
      console.warn("[parent-invite] revoke failed", e);
    }
  }

  const parents = Object.values(state.byId).filter(
    (r) => r.relationship_type === "parent",
  );

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <header>
          <h1 className="text-2xl font-semibold text-foreground">Parent linkage</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite a parent to view your scope-appropriate signal. Every transition is
            replay-derived and lineage-visible.
          </p>
        </header>

        <Card className="p-4 space-y-3">
          <h2 className="text-base font-medium">Create invite</h2>
          <Button onClick={handleCreate} disabled={busy || !user} size="lg">
            {busy ? "Working…" : "Generate invite link"}
          </Button>
          {token && (
            <div className="rounded-md bg-muted p-3 text-xs break-all">
              {token}
            </div>
          )}
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="text-base font-medium">
            Parent relationships ({parents.length})
          </h2>
          {parents.length === 0 && (
            <p className="text-sm text-muted-foreground">No parent relationships yet.</p>
          )}
          {parents.map((rel) => (
            <div
              key={rel.relationship_id}
              className="flex items-center justify-between border-t pt-2 first:border-t-0 first:pt-0"
            >
              <div className="text-sm">
                <div className="font-mono text-xs">{rel.relationship_id.slice(0, 8)}…</div>
                <div className="text-muted-foreground">status: {rel.status}</div>
              </div>
              {rel.status !== "revoked" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleRevoke({
                      relationship_id: rel.relationship_id,
                      created_event_id: rel.created_event_id,
                    })
                  }
                >
                  Revoke
                </Button>
              )}
            </div>
          ))}
          <p className="pt-2 text-xs text-muted-foreground">
            Source events: {meta.sourceCount}
          </p>
        </Card>
      </div>
    </main>
  );
}
