import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { TrendingUp } from "lucide-react";
import { ForecastBoundaryCard } from "@/components/forecast/ForecastBoundaryCard";
import { ForecastWindowCard } from "@/components/forecast/ForecastWindowCard";
import { ProjectionConfidenceCard } from "@/components/forecast/ProjectionConfidenceCard";
import { ForecastSourceStrip } from "@/components/forecast/ForecastSourceStrip";
import { DigestCardShell } from "@/components/digest/DigestCardShell";
import { DigestEmptyState } from "@/components/digest/DigestEmptyState";
import { useForecastProjection } from "@/hooks/digest/useForecastProjection";
import {
  FORECAST_BOUNDARY_DISCLAIMER,
  missingnessProjectionSentence,
} from "@/lib/digest/sentences";
import { CircleSlash } from "lucide-react";

export default function ForecastSurface() {
  const { user, loading, isAuthStable } = useAuth();
  const navigate = useNavigate();
  const { projection, isLoading, rows } = useForecastProjection();

  useEffect(() => {
    if (!loading && isAuthStable && !user) navigate("/auth", { replace: true });
  }, [loading, isAuthStable, user, navigate]);

  const allSources = Array.from(
    new Set([
      ...projection.workloadContinuation.sourceEventIds,
      ...projection.readinessContinuation.sourceEventIds,
      ...projection.behavioralContinuation.sourceEventIds,
    ]),
  );

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-5xl px-4 pb-12 sm:px-6">
        <header className="border-b pb-4 pt-4">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <TrendingUp className="h-6 w-6 text-primary" />
            Bounded Forecast
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Continuation projections only. Every value derives from canonical ASB events with full
            lineage.
          </p>
        </header>

        {isLoading ? (
          <div className="mt-6 h-32 animate-pulse rounded-md bg-muted/40" />
        ) : rows.length === 0 ? (
          <div className="mt-6">
            <DigestEmptyState message="No organism history yet." />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <ForecastBoundaryCard />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ForecastWindowCard
                title="Workload continuation"
                label="scheduled-day"
                projection={projection.workloadContinuation}
              />
              <ForecastWindowCard
                title="Readiness continuation"
                label="readiness"
                projection={projection.readinessContinuation}
              />
              <ForecastWindowCard
                title="Behavioral continuation"
                label="behavioral"
                projection={projection.behavioralContinuation}
              />
              <ProjectionConfidenceCard projection={projection.escalationPersistence} />
              <DigestCardShell
                title="Recovery missingness"
                icon={<CircleSlash className="h-4 w-4 text-muted-foreground" />}
                projection={projection.recoveryMissingness}
                sentence={`${missingnessProjectionSentence(
                  "recovery",
                  projection.recoveryMissingness,
                )} ${FORECAST_BOUNDARY_DISCLAIMER}`}
              />
              <DigestCardShell
                title="Readiness missingness"
                icon={<CircleSlash className="h-4 w-4 text-muted-foreground" />}
                projection={projection.readinessMissingness}
                sentence={`${missingnessProjectionSentence(
                  "readiness",
                  projection.readinessMissingness,
                )} ${FORECAST_BOUNDARY_DISCLAIMER}`}
              />
            </div>

            <ForecastSourceStrip sourceEventIds={allSources} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
