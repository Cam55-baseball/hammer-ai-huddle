import { DashboardLayout } from "@/components/DashboardLayout";
import { useRosterProjection } from "@/hooks/coach/useRosterProjection";
import { RosterGrid } from "@/components/coach-console/RosterGrid";
import { EscalationQueue } from "@/components/coach-console/EscalationQueue";
import { MissingSignalQueue } from "@/components/coach-console/MissingSignalQueue";
import { WorkloadContinuityPanel } from "@/components/coach-console/WorkloadContinuityPanel";
import { RecentBehavioralFeed } from "@/components/coach-console/RecentBehavioralFeed";
import { useCoachRosterRows } from "@/hooks/coach/useCoachRosterRows";
import { Badge } from "@/components/ui/badge";
import { Users, AlertTriangle, EyeOff } from "lucide-react";

export default function CoachConsole() {
  const { roster, snapshots, escalations, missing, workload, isLoading, error } =
    useRosterProjection();
  const athleteIds = roster.map((a) => a.athleteId);
  const rowsQ = useCoachRosterRows(athleteIds, { days: 14, limit: 2000 });

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <header className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold">Coach Console</h1>
            <p className="text-sm text-muted-foreground">
              Read-only roster visibility over canonical ASB events. Every signal
              is lineage-drillable to <code className="rounded bg-muted px-1 text-xs">/replay/:eventId</code>.
            </p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1"><Users className="h-3 w-3" /> {roster.length} roster</Badge>
            <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> {escalations.length} escalations</Badge>
            <Badge variant="secondary" className="gap-1"><EyeOff className="h-3 w-3" /> {missing.length} missing</Badge>
          </div>
        </header>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {(error as Error).message}
          </div>
        )}

        <section>
          <h2 className="mb-3 text-lg font-semibold">Roster</h2>
          <RosterGrid roster={roster} snapshots={snapshots} isLoading={isLoading} />
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <EscalationQueue rows={escalations} roster={roster} />
          <MissingSignalQueue rows={missing} roster={roster} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <WorkloadContinuityPanel rows={workload} roster={roster} />
          <RecentBehavioralFeed rows={rowsQ.data ?? []} roster={roster} />
        </div>
      </div>
    </DashboardLayout>
  );
}
