import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EventTimeline } from "@/components/asb/EventTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEmitOnce } from "@/hooks/useEmitObservability";

export default function AsbTimeline() {
  const { user, loading } = useAuth();

  // RFL-007 — emit canonical intelligence.trend.viewed once per athlete per day
  // for the timeline trend surface.
  useEmitOnce(
    user?.id ? `trend_timeline:${user.id}` : null,
    user?.id
      ? {
          topic: "intelligence.trend.viewed",
          athleteId: user.id,
          actorId: user.id,
          actorRole: "athlete",
          payload: { surface: "asb_timeline" },
        }
      : null,
  );


  return (
    <DashboardLayout>
      <div className="container max-w-4xl py-6 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">ASB Event Timeline</h1>
          <p className="text-sm text-muted-foreground">
            Read-only view of your canonical ASB event ledger. Every event exposes its raw payload,
            confidence, missingness, engine_version, state snapshot, and full lineage graph one
            click away. No aggregation, no summary, no abstraction.
          </p>
        </header>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Events</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div
                className="text-sm text-muted-foreground"
                role="status"
                aria-live="polite"
              >
                Loading session…
              </div>
            ) : !user ? (
              <div className="text-sm text-muted-foreground">
                Sign in to view your ASB event ledger.
              </div>
            ) : (
              <EventTimeline athleteId={user.id} />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
