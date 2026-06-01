/**
 * Phase 152 — Parent Trust card. Read-only derived trust + last share scope.
 *
 * Presentation pass: leads with protection, not exposure.
 */
import {
  useTrustState,
  useConversationMemory,
} from "@/hooks/useRelationalProjections";
import type { Scope } from "@/lib/runtime/projections/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PARENT_VOICE, SURFACE_TITLES } from "@/lib/relational/copy";

interface Props {
  athleteId: string;
  scope: Scope;
  parentCounterpartyId?: string;
  debug?: boolean;
}

export function ParentTrustCard({
  athleteId,
  scope,
  parentCounterpartyId = "cp_parent",
  debug = false,
}: Props) {
  const { state: trust } = useTrustState(athleteId, scope);
  const { state: mem } = useConversationMemory(athleteId, scope);
  const parent = trust.byCounterparty[parentCounterpartyId];
  const sharedScopes = Object.values(mem.threads)
    .map((t) => t.last_shared_scope)
    .filter(Boolean) as string[];
  return (
    <Card className="p-4 space-y-3">
      <header>
        <h3 className="font-semibold text-foreground">{SURFACE_TITLES.parentTrust}</h3>
        <Badge variant="secondary" className="mt-1">
          {PARENT_VOICE.protectedLead}
        </Badge>
      </header>
      <p className="text-sm text-foreground">{PARENT_VOICE.protectedBody}</p>
      {parent ? (
        <p className="text-xs text-muted-foreground">
          Parent has shown up{" "}
          <span className="text-foreground font-medium">
            {parent.contribution_count}
          </span>{" "}
          time{parent.contribution_count === 1 ? "" : "s"}.{" "}
          {PARENT_VOICE.trustNote}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{PARENT_VOICE.noHistory}</p>
      )}
      {debug && (
        <div className="text-xs text-muted-foreground border-t border-border pt-2">
          trust={parent?.trust_score.toFixed(2) ?? "—"} · shared=
          {sharedScopes.length ? sharedScopes.join(", ") : "none"}
        </div>
      )}
    </Card>
  );
}
