/**
 * WkCardFailureNotice — owner Nov 2: never "Plan couldn't publish", never a
 * missing-details dead end. Missing details don't block plans any more; if a
 * build fails for another reason, show ONE plain sentence with the exact fix
 * and a button that does it.
 */
import { Info, RefreshCw, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkoutCatalog } from "@/hooks/useWorkoutCatalog";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAuth } from "@/hooks/useAuth";
import { humanizeFailures } from "@/lib/hammer/failureCopy";
import { accountGateKey } from "@/components/auth/AccountGate";
import { failureAction } from "@/lib/hammer/finishProfile";

export type WkCardFailure = {
  code?: string | null;
  title?: string | null;
  detail?: string | null;
  missingFields?: string[];
  engineFailures?: Record<string, string[] | undefined>;
} | null;

export function WkCardFailureNotice({
  engine,
  failure,
  retry,
  retrying,
}: {
  engine: "speed" | "bat_speed" | "lift" | "conditioning";
  failure: WkCardFailure;
  retry: () => void;
  retrying?: boolean;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isOwner } = useOwnerAccess();
  const { data: catalog } = useWorkoutCatalog();
  const nameOf = useMemo(() => {
    const map = new Map((catalog ?? []).map((m) => [m.slug, m.name]));
    return (slug: string) => map.get(slug) ?? null;
  }, [catalog]);
  const reasons = useMemo(
    () => humanizeFailures(failure?.engineFailures?.[engine] ?? [], nameOf, isOwner),
    [failure, engine, nameOf, isOwner],
  );
  const action = failureAction(failure?.code ?? null, reasons, failure?.missingFields ?? []);
  const run = () => {
    if (action.kind === "birthday") void qc.invalidateQueries({ queryKey: accountGateKey(user?.id) });
    else if (action.kind === "equipment") navigate("/onboarding/athlete?edit=equipment");
    else retry();
  };

  return (
    <div className="rounded-md border border-border bg-muted/40 p-2 text-xs">
      <div className="flex items-start gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <p>{action.sentence}</p>
          <Button size="sm" className="h-7" onClick={run} disabled={retrying}>
            {retrying ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : action.kind === "retry" ? <RefreshCw className="mr-1 h-3 w-3" /> : null}
            {action.button}
          </Button>
        </div>
      </div>
    </div>
  );
}
