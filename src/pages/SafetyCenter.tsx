/**
 * Phase D §2 — Safety Center.
 *
 * Calm, mobile-first list of safeguarding alerts surfaced by the
 * classifier. Pending / Reviewed / Set aside states. One action per row.
 * No red panic styling. Replay-derived.
 */
import { useAuth } from "@/hooks/useAuth";
import { useSafetyState } from "@/hooks/useSafetyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SAFETY_VOICE } from "@/lib/relational/copy";

export default function SafetyCenter() {
  const { user } = useAuth();
  const { state, loading, setStatus } = useSafetyState(user?.id ?? "");

  return (
    <main className="min-h-dvh bg-background p-4 md:p-8">
      <div className="mx-auto max-w-xl space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {SAFETY_VOICE.title}
          </h1>
          <p className="text-sm text-muted-foreground">{SAFETY_VOICE.subtitle}</p>
        </header>

        {loading && (
          <Card className="p-5 space-y-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-9 w-32" />
          </Card>
        )}

        {!loading && state.notifications.length === 0 && (
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">{SAFETY_VOICE.empty}</p>
          </Card>
        )}

        {!loading && state.notifications.length > 0 && (
          <ul className="space-y-3">
            {state.notifications.map((n) => (
              <li key={n.id}>
                <Card className="p-5 space-y-3 rounded-xl shadow-sm">
                  <div className="space-y-1">
                    <p className="text-sm text-foreground">
                      {SAFETY_VOICE.routes[n.route] ?? n.copy}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {SAFETY_VOICE.status[n.status] ?? n.status}
                    </p>
                  </div>
                  {n.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-11"
                        onClick={() => setStatus(n.source_event_id, n.route, "reviewed")}
                      >
                        {SAFETY_VOICE.markReviewed}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="min-h-11 text-muted-foreground"
                        onClick={() => setStatus(n.source_event_id, n.route, "muted")}
                      >
                        {SAFETY_VOICE.mute}
                      </Button>
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
