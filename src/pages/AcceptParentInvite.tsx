/**
 * RR-4 — Parent-facing accept-invite page.
 *
 * Reads ?token=… from the URL, requires the parent to be authenticated,
 * resolves the originating created event via the athlete's timeline, and
 * emits relationship.confirmed. Idempotent at the emit boundary.
 *
 * Phase C humanization: protection-first lead, IDs/timestamps moved to
 * Details disclosure, explicit reassurance about easy removal.
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { PARENT_INVITE_VOICE, SURFACE_TITLES } from "@/lib/relational/copy";
import { ChevronDown } from "lucide-react";
import { HammerParentVoice } from "@/components/parent/HammerParentVoice";

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
      toast.error(PARENT_INVITE_VOICE.invalid);
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
      toast.success(PARENT_INVITE_VOICE.successToast);
      navigate("/");
    } catch (e) {
      toast.error(PARENT_INVITE_VOICE.fail);
      console.warn("[accept-parent-invite] failed", e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh bg-background p-4 md:p-8">
      <div className="mx-auto max-w-xl space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {PARENT_INVITE_VOICE.acceptTitle}
          </h1>
        </header>

        <HammerParentVoice input={{ state: "invited-not-accepted" }} />


        {!decoded && (
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">
              {PARENT_INVITE_VOICE.invalid}
            </p>
          </Card>
        )}

        {decoded && !user && (
          <Card className="p-5 space-y-3">
            <p className="text-sm text-foreground">
              {PARENT_INVITE_VOICE.signInPrompt}
            </p>
            <Button
              onClick={() =>
                navigate(
                  `/auth?redirect=/accept-parent-invite?token=${encodeURIComponent(token)}`,
                )
              }
              size="lg"
              className="w-full min-h-11"
            >
              {PARENT_INVITE_VOICE.signInCta}
            </Button>
          </Card>
        )}

        {decoded && user && (
          <Card className="p-5 space-y-4">
            <p className="text-sm text-foreground">
              {PARENT_INVITE_VOICE.acceptIntro}
            </p>
            <p className="text-sm text-muted-foreground">
              {PARENT_INVITE_VOICE.acceptReassurance}
            </p>

            <Button
              onClick={handleAccept}
              disabled={!createdEventId || busy}
              size="lg"
              className="w-full min-h-11"
            >
              {busy
                ? PARENT_INVITE_VOICE.acceptBusy
                : !createdEventId
                  ? PARENT_INVITE_VOICE.resolving
                  : PARENT_INVITE_VOICE.acceptCta}
            </Button>

            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown className="h-3 w-3" aria-hidden />
                {PARENT_INVITE_VOICE.detailsToggle}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-1 text-xs text-muted-foreground">
                <div>
                  <span>Reference:</span>{" "}
                  <span className="font-mono">
                    {decoded.relationship_id.slice(0, 8)}…
                  </span>
                </div>
                <div>
                  <span>Issued:</span>{" "}
                  {new Date(decoded.issued_at).toLocaleString()}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )}
      </div>
    </main>
  );
}
