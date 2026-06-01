/**
 * RR-4 — Parent-facing accept-invite page.
 *
 * Reads ?token=… from the URL, requires the parent to be authenticated,
 * resolves the originating created event via the athlete's timeline, and
 * emits relationship.confirmed. Idempotent at the emit boundary.
 */
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  acceptParentInvite,
  decodeInviteToken,
} from "@/lib/runtime/relational/parentLinking";
import { useAsbTimeline } from "@/hooks/useAsbTimeline";
import { RELATIONSHIP_TOPICS } from "@/lib/runtime/relational/relationshipSchemas";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export default function AcceptParentInvite() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = sp.get("token") ?? "";
  const decoded = token ? decodeInviteToken(token) : null;
  const [busy, setBusy] = useState(false);

  // Pull the athlete's timeline so we can resolve the originating created
  // event id by relationship_id (replay-derived; no side cache).
  const { data } = useAsbTimeline({
    athleteId: decoded?.athlete_id ?? null,
    pageSize: 200,
  });

  const createdEventId = (() => {
    if (!decoded || !data?.rows) return null;
    const hit = data.rows.find(
      (r) =>
        r.topic_id === RELATIONSHIP_TOPICS.created &&
        (r.payload as { relationship_id?: string })?.relationship_id ===
          decoded.relationship_id,
    );
    return hit?.event_id ?? null;
  })();

  useEffect(() => {
    if (!decoded) {
      toast.error("Invalid invite link");
    }
  }, [decoded]);

  async function handleAccept() {
    if (!user || !decoded || !createdEventId || busy) return;
    setBusy(true);
    try {
      await acceptParentInvite({
        token,
        parentUserId: user.id,
        createdEventId,
      });
      toast.success("Relationship confirmed");
      navigate("/");
    } catch (e) {
      toast.error("Could not confirm");
      console.warn("[accept-parent-invite] failed", e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">
          Accept parent invite
        </h1>

        {!decoded && (
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">
              This invite link is invalid or malformed.
            </p>
          </Card>
        )}

        {decoded && !user && (
          <Card className="p-4 space-y-2">
            <p className="text-sm">Sign in as the parent to accept this invite.</p>
            <Button onClick={() => navigate(`/auth?redirect=/accept-parent-invite?token=${encodeURIComponent(token)}`)}>
              Sign in
            </Button>
          </Card>
        )}

        {decoded && user && (
          <Card className="p-4 space-y-3">
            <div className="text-sm">
              <div>
                <span className="text-muted-foreground">Relationship:</span>{" "}
                <span className="font-mono text-xs">{decoded.relationship_id}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Athlete:</span>{" "}
                <span className="font-mono text-xs">{decoded.athlete_id}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Issued:</span>{" "}
                {decoded.issued_at}
              </div>
            </div>
            <Button
              onClick={handleAccept}
              disabled={!createdEventId || busy}
              size="lg"
            >
              {busy
                ? "Confirming…"
                : !createdEventId
                  ? "Resolving invite…"
                  : "Accept and confirm"}
            </Button>
            <p className="text-xs text-muted-foreground">
              By accepting you become a constitutional parent counterparty for this
              athlete. Either side may revoke at any time. All transitions are
              lineage-visible and replay-derived.
            </p>
          </Card>
        )}
      </div>
    </main>
  );
}
