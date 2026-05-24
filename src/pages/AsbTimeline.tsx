import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EventTimeline } from "@/components/asb/EventTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AsbTimeline() {
  const { user, loading } = useAuth();

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
              <div className="text-sm text-muted-foreground">Loading session…</div>
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
