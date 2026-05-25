import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { WeeklyDigestHeader } from "@/components/digest/WeeklyDigestHeader";
import { OrganismChangeCard } from "@/components/digest/OrganismChangeCard";
import { WorkloadShiftCard } from "@/components/digest/WorkloadShiftCard";
import { EscalationResolutionCard } from "@/components/digest/EscalationResolutionCard";
import { BehavioralTrendCard } from "@/components/digest/BehavioralTrendCard";
import { RecoveryContinuityCard } from "@/components/digest/RecoveryContinuityCard";
import { MissingSignalCard } from "@/components/digest/MissingSignalCard";
import { DigestTimelineStrip } from "@/components/digest/DigestTimelineStrip";
import { DigestEmptyState } from "@/components/digest/DigestEmptyState";
import { useDigestProjection } from "@/hooks/digest/useDigestProjection";

export default function AthleteDigest() {
  const { user, loading, isAuthStable } = useAuth();
  const navigate = useNavigate();
  const { projection, isLoading, rows } = useDigestProjection();

  useEffect(() => {
    if (!loading && isAuthStable && !user) navigate("/auth", { replace: true });
  }, [loading, isAuthStable, user, navigate]);

  const windowLabel = (() => {
    const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);
    return `${fmt(projection.currWindow.startMs)} → ${fmt(projection.currWindow.endMs)}`;
  })();

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-5xl px-4 pb-12 sm:px-6">
        <div className="pt-4">
          <WeeklyDigestHeader windowLabel={windowLabel} totalEvents={projection.totalEvents} />
        </div>

        {isLoading ? (
          <div className="mt-6 h-32 animate-pulse rounded-md bg-muted/40" />
        ) : projection.totalEvents === 0 ? (
          <div className="mt-6">
            <DigestEmptyState />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <OrganismChangeCard projection={projection.organismChange} />
              <WorkloadShiftCard projection={projection.workloadShift} />
              <BehavioralTrendCard projection={projection.behavioralTrend} />
              <RecoveryContinuityCard projection={projection.recoveryContinuity} />
              <MissingSignalCard topics={projection.missingTopics} />
            </div>
            <EscalationResolutionCard
              emerged={projection.escalationEmerged}
              resolved={projection.escalationResolved}
            />
            <DigestTimelineStrip rows={rows} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
