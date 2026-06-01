/**
 * Phase 152 — Parent Trust card. Read-only derived trust + last share scope.
 */
import {
  useTrustState,
  useConversationMemory,
} from "@/hooks/useRelationalProjections";
import type { Scope } from "@/lib/runtime/projections/types";
import { Card } from "@/components/ui/card";

interface Props {
  athleteId: string;
  scope: Scope;
  parentCounterpartyId?: string;
}

export function ParentTrustCard({
  athleteId,
  scope,
  parentCounterpartyId = "cp_parent",
}: Props) {
  const { state: trust } = useTrustState(athleteId, scope);
  const { state: mem } = useConversationMemory(athleteId, scope);
  const parent = trust.byCounterparty[parentCounterpartyId];
  const sharedScopes = Object.values(mem.threads)
    .map((t) => t.last_shared_scope)
    .filter(Boolean) as string[];
  return (
    <Card className="p-4 space-y-2">
      <h3 className="font-semibold text-foreground">Parent Trust</h3>
      <div className="text-sm text-muted-foreground">
        {parent ? (
          <>
            derived trust score:{" "}
            <span className="text-foreground font-medium">
              {parent.trust_score.toFixed(2)}
            </span>{" "}
            • {parent.contribution_count} contribution
            {parent.contribution_count === 1 ? "" : "s"}
          </>
        ) : (
          "No parent interaction lineage yet."
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        last shared scopes:{" "}
        {sharedScopes.length ? sharedScopes.join(", ") : "none"}
      </div>
      <p className="text-xs text-muted-foreground">
        Trust is derived from interaction lineage. It never authorizes;
        it only affords visibility.
      </p>
    </Card>
  );
}
