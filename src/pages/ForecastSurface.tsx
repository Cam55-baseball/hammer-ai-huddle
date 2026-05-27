import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { TrendingUp, Calendar, CalendarRange, ChevronDown } from "lucide-react";
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
  plainForecastSentence,
  plainForecastHelp,
  plainForecastRisk,
  type ForecastHorizon,
} from "@/lib/digest/sentences";
import { CircleSlash } from "lucide-react";

const HORIZONS: Array<{ id: ForecastHorizon; title: string; icon: React.ReactNode }> = [
  { id: "3d", title: "Next 3 days", icon: <Calendar className="h-4 w-4 text-primary" /> },
  { id: "7d", title: "Next week", icon: <CalendarRange className="h-4 w-4 text-primary" /> },
  { id: "long", title: "Longer trend", icon: <TrendingUp className="h-4 w-4 text-primary" /> },
];

export default function ForecastSurface() {
  const { user, loading, isAuthStable } = useAuth();
  const navigate = useNavigate();
  const { projection, isLoading, rows } = useForecastProjection();
  const [showTechnical, setShowTechnical] = useState(false);

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
            What’s likely next
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            If your current patterns continue. Not a prediction — a calm picture of where
            you’re heading.
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {HORIZONS.map((h) => (
                <Card key={h.id} className="relative overflow-hidden">
                  <div className="absolute inset-y-0 left-0 w-[3px] bg-primary" aria-hidden />
                  <CardContent className="space-y-4 py-5 pl-5 pr-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {h.icon}
                      {h.title}
                    </div>
                    <p className="text-base font-medium leading-snug text-foreground">
                      {plainForecastSentence(
                        h.id,
                        projection.workloadContinuation,
                        projection.readinessContinuation,
                      )}
                    </p>
                    <div className="space-y-2 border-t pt-3 text-sm">
                      <p>
                        <span className="font-semibold text-foreground">What helps: </span>
                        <span className="text-muted-foreground">{plainForecastHelp(h.id)}</span>
                      </p>
                      <p>
                        <span className="font-semibold text-foreground">What raises risk: </span>
                        <span className="text-muted-foreground">{plainForecastRisk(h.id)}</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Collapsible open={showTechnical} onOpenChange={setShowTechnical}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full min-h-11 justify-between">
                  <span className="text-sm font-medium">
                    {showTechnical ? "Hide technical view" : "Show technical view (lineage & confidence)"}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${showTechnical ? "rotate-180" : ""}`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-6 pt-4">
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
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
