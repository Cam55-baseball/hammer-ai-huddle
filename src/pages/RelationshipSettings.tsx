/**
 * Phase D §3 — Relationship Settings.
 *
 * Pause / Restore / Remove access per linked person. All actions emit
 * canonical relational events only. No mutable relationship table.
 */
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRelationshipState } from "@/hooks/useRelationalProjections";
import type { RelationshipRecord } from "@/lib/runtime/projections/relationshipState";
import {
  emitRelationshipPaused,
  emitRelationshipConfirmed,
} from "@/lib/runtime/relational/relationshipEmitters";
import { revokeParentRelationship } from "@/lib/runtime/relational/parentLinking";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { RELATIONSHIP_SETTINGS_VOICE, TERMS } from "@/lib/relational/copy";

export default function RelationshipSettings() {
  const { user } = useAuth();
  const athleteId = user?.id ?? "";
  const { state, meta } = useRelationshipState(athleteId, "self");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const records = Object.values(state.byId) as RelationshipRecord[];

  async function pause(rel: RelationshipRecord) {
    if (!user) return;
    setBusyId(rel.relationship_id);
    try {
      await emitRelationshipPaused(
        {
          athleteId: user.id,
          actorId: user.id,
          actorRole: "athlete",
          occurredAt: new Date().toISOString(),
        },
        {
          visibility_scope: "parent",
          confidence: 1,
          missingness: { fields: [], reason: "not_observed" },
          authority: "self",
          lineage_parent_ids: [rel.created_event_id],
          relationship_id: rel.relationship_id,
          paused_by: "self",
          reason: RELATIONSHIP_SETTINGS_VOICE.pauseReason,
          resume_allowed: true,
        },
      );
      toast.success("Access paused");
    } catch (e) {
      console.warn("[settings] pause failed", e);
      toast.error(TERMS.somethingOff);
    } finally {
      setBusyId(null);
    }
  }

  async function restore(rel: RelationshipRecord) {
    if (!user) return;
    setBusyId(rel.relationship_id);
    try {
      await emitRelationshipConfirmed(
        {
          athleteId: user.id,
          actorId: user.id,
          actorRole: "athlete",
          occurredAt: new Date().toISOString(),
        },
        {
          visibility_scope: "parent",
          confidence: 1,
          missingness: { fields: [], reason: "not_observed" },
          authority: "self",
          lineage_parent_ids: [rel.created_event_id],
          relationship_id: rel.relationship_id,
          confirmed_by: "self",
          confirmation_method: "in_app_accept",
        },
      );
      toast.success("Access restored");
    } catch (e) {
      console.warn("[settings] restore failed", e);
      toast.error(TERMS.somethingOff);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(rel: RelationshipRecord) {
    if (!user) return;
    setBusyId(rel.relationship_id);
    try {
      await revokeParentRelationship({
        athleteId: user.id,
        relationshipId: rel.relationship_id,
        createdEventId: rel.created_event_id,
        revokedBy: "self",
        revokedByUserId: user.id,
        reason: "subject_request",
      });
      toast.success(TERMS.accessRemoved);
      setConfirmRemoveId(null);
    } catch (e) {
      console.warn("[settings] remove failed", e);
      toast.error(TERMS.somethingOff);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-dvh bg-background p-4 md:p-8">
      <div className="mx-auto max-w-xl space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {RELATIONSHIP_SETTINGS_VOICE.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {RELATIONSHIP_SETTINGS_VOICE.subtitle}
          </p>
        </header>

        {meta.sourceCount === 0 && (
          <Card className="p-5">
            <Skeleton className="h-4 w-2/3" />
          </Card>
        )}

        {records.length === 0 && meta.sourceCount > 0 && (
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">
              {RELATIONSHIP_SETTINGS_VOICE.empty}
            </p>
          </Card>
        )}

        <ul className="space-y-3">
          {records.map((rel) => {
            const label =
              RELATIONSHIP_SETTINGS_VOICE.statusLabels[rel.status] ?? rel.status;
            const busy = busyId === rel.relationship_id;
            const isConfirming = confirmRemoveId === rel.relationship_id;
            return (
              <li key={rel.relationship_id}>
                <Card className="p-5 space-y-3 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm">
                      <div className="font-medium text-foreground capitalize">
                        {rel.relationship_type}
                      </div>
                      <div className="text-xs text-muted-foreground">{label}</div>
                    </div>
                  </div>

                  {!isConfirming && rel.status !== "revoked" && (
                    <div className="flex flex-wrap gap-2">
                      {rel.status === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="min-h-11"
                          disabled={busy}
                          onClick={() => pause(rel)}
                        >
                          {RELATIONSHIP_SETTINGS_VOICE.pause}
                        </Button>
                      )}
                      {rel.status === "paused" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="min-h-11"
                          disabled={busy}
                          onClick={() => restore(rel)}
                        >
                          {RELATIONSHIP_SETTINGS_VOICE.restore}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="min-h-11 text-muted-foreground"
                        disabled={busy}
                        onClick={() => setConfirmRemoveId(rel.relationship_id)}
                      >
                        {RELATIONSHIP_SETTINGS_VOICE.remove}
                      </Button>
                    </div>
                  )}

                  {isConfirming && (
                    <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                      <p className="text-sm text-foreground">
                        {RELATIONSHIP_SETTINGS_VOICE.confirmRemoveLead}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {RELATIONSHIP_SETTINGS_VOICE.confirmRemoveBody}
                      </p>
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          className="min-h-11"
                          disabled={busy}
                          onClick={() => remove(rel)}
                        >
                          {RELATIONSHIP_SETTINGS_VOICE.confirm}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="min-h-11"
                          disabled={busy}
                          onClick={() => setConfirmRemoveId(null)}
                        >
                          {RELATIONSHIP_SETTINGS_VOICE.cancel}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
