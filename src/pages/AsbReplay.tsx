import { useParams, Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useReplayCertification } from "@/hooks/useReplayCertification";
import { ReplayCertificationPanel } from "@/components/asb/ReplayCertificationPanel";
import { ReplayInputChain } from "@/components/asb/ReplayInputChain";
import { StateDiffView } from "@/components/asb/StateDiffView";

export default function AsbReplay() {
  const { eventId } = useParams<{ eventId: string }>();
  const { data, isLoading, error } = useReplayCertification(eventId ?? null);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-6 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Replay certification</h1>
          <p className="text-xs text-muted-foreground">
            Read-only re-derivation of state from the canonical event lineage.
            The ledger is the only source of truth; this view is a projection
            for transparency, never a re-authoring of organism state.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/timeline">
            <ArrowLeft className="h-4 w-4" />
            <span className="ml-1">Timeline</span>
          </Link>
        </Button>
      </header>

      {isLoading && (
        <div role="status" aria-live="polite" className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="border border-destructive bg-destructive/10 text-destructive p-3 rounded text-xs font-mono break-all"
        >
          {(error as Error).message}
        </div>
      )}

      {data && (
        <>
          <section aria-label="Replay certification verdict">
            <ReplayCertificationPanel data={data} />
          </section>

          <section aria-label="Replay input chain" className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide">
              Replay input chain
            </h2>
            <ReplayInputChain data={data} />
          </section>

          <section aria-label="State diff" className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide">
              Original snapshot vs re-derived projection
            </h2>
            <StateDiffView data={data} />
          </section>
        </>
      )}
    </main>
  );
}
