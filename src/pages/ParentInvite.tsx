/**
 * RR-4 — Athlete-facing parent invite page.
 *
 * Lists existing parent relationships (replay-derived via useRelationshipState)
 * and lets the athlete generate a new parent invite link.
 *
 * Phase C humanization: protection-first lead, single primary CTA, copy-link
 * affordance, internal IDs hidden behind a Details disclosure.
 */
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRelationshipState } from "@/hooks/useRelationalProjections";
import type { RelationshipRecord } from "@/lib/runtime/projections/relationshipState";
import {
  createParentInvite,
  revokeParentRelationship,
} from "@/lib/runtime/relational/parentLinking";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { PARENT_INVITE_VOICE, SURFACE_TITLES } from "@/lib/relational/copy";
import { Copy, ChevronDown } from "lucide-react";

type TransportStatus = "sent" | "skipped_disabled" | "failed" | null;

export default function ParentInvite() {
  const { user } = useAuth();
  const athleteId = user?.id ?? "";
  const { state, meta } = useRelationshipState(athleteId, "self");
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleCreate() {
    if (!user || busy) return;
    setBusy(true);
    try {
      const out = await createParentInvite({ athleteId: user.id });
      const url = `${window.location.origin}/accept-parent-invite?token=${encodeURIComponent(out.token)}`;
      setLink(url);
    } catch (e) {
      toast.error(PARENT_INVITE_VOICE.fail);
      console.warn("[parent-invite] create failed", e);
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success(PARENT_INVITE_VOICE.linkCopied);
    } catch {
      // Clipboard can fail under non-secure contexts; show fallback.
      toast.message(link);
    }
  }

  async function handleRevoke(rel: RelationshipRecord) {
    if (!user) return;
    setRemovingId(rel.relationship_id);
    try {
      await revokeParentRelationship({
        athleteId: user.id,
        relationshipId: rel.relationship_id,
        createdEventId: rel.created_event_id,
        revokedBy: "self",
        revokedByUserId: user.id,
        reason: "subject_request",
      });
      toast.success(PARENT_INVITE_VOICE.removedToast);
    } catch (e) {
      toast.error(PARENT_INVITE_VOICE.fail);
      console.warn("[parent-invite] revoke failed", e);
    } finally {
      setRemovingId(null);
    }
  }

  const parents = (Object.values(state.byId) as RelationshipRecord[]).filter(
    (r) => r.relationship_type === "parent",
  );
  const activeParents = parents.filter((r) => r.status !== "revoked");

  return (
    <main className="min-h-dvh bg-background p-4 md:p-8">
      <div className="mx-auto max-w-xl space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {SURFACE_TITLES.parentLinkage}
          </h1>
          <p className="text-sm text-muted-foreground">
            {PARENT_INVITE_VOICE.athleteIntro}
          </p>
        </header>

        <Card className="p-5 space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {PARENT_INVITE_VOICE.control}
            </p>
            <ul className="space-y-1.5">
              {PARENT_INVITE_VOICE.controlBullets.map((b) => (
                <li
                  key={b}
                  className="text-sm text-muted-foreground flex gap-2"
                >
                  <span
                    aria-hidden
                    className="mt-2 inline-block h-1 w-1 rounded-full bg-muted-foreground/60 shrink-0"
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {!link && (
            <Button
              onClick={handleCreate}
              disabled={busy || !user}
              size="lg"
              className="w-full min-h-11"
            >
              {busy
                ? PARENT_INVITE_VOICE.createBusy
                : PARENT_INVITE_VOICE.createCta}
            </Button>
          )}

          {link && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {PARENT_INVITE_VOICE.linkReady}
              </p>
              <div className="rounded-md bg-muted px-3 py-2 text-xs break-all text-foreground">
                {link}
              </div>
              <Button
                variant="outline"
                onClick={handleCopy}
                className="w-full min-h-11"
              >
                <Copy className="mr-2 h-4 w-4" aria-hidden />
                {PARENT_INVITE_VOICE.copyLink}
              </Button>
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="text-sm font-medium text-foreground">
            {PARENT_INVITE_VOICE.yourParents}
            {activeParents.length > 0 && (
              <span className="ml-1.5 text-muted-foreground">
                ({activeParents.length})
              </span>
            )}
          </h2>

          {parents.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {PARENT_INVITE_VOICE.noParentsYet}
            </p>
          )}

          <ul className="divide-y divide-border">
            {parents.map((rel) => {
              const statusLabel =
                rel.status === "active"
                  ? "Linked"
                  : rel.status === "pending"
                    ? "Invite pending"
                    : rel.status === "paused"
                      ? "Paused"
                      : "Access removed";
              const isRevoked = rel.status === "revoked";
              return (
                <li
                  key={rel.relationship_id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-3"
                >
                  <div className="text-sm">
                    <div className="font-medium text-foreground">Parent</div>
                    <div className="text-muted-foreground text-xs">
                      {statusLabel}
                    </div>
                  </div>
                  {!isRevoked && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={removingId === rel.relationship_id}
                      onClick={() => handleRevoke(rel)}
                      className="min-h-11"
                    >
                      {removingId === rel.relationship_id
                        ? PARENT_INVITE_VOICE.removing
                        : PARENT_INVITE_VOICE.removeCta}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>

          {parents.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown className="h-3 w-3" aria-hidden />
                {PARENT_INVITE_VOICE.detailsToggle}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 text-xs text-muted-foreground">
                Source events: {meta.sourceCount}
              </CollapsibleContent>
            </Collapsible>
          )}
        </Card>
      </div>
    </main>
  );
}
