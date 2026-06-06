/**
 * Athlete-side UHRC mounting helper. Wires the canonical hooks
 * (HIE snapshot + latest PIE V2 aggregate) into `buildUhrcReport`
 * and renders the report card. Used by AthleteCommand and
 * ProgressDashboard as the default analysis surface.
 */
import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useHIESnapshot } from "@/hooks/useHIESnapshot";
import { usePitchingV2Trends } from "@/hooks/usePitchingV2Trends";
import { buildUhrcReport } from "@/lib/uhrc/buildReport";
import { UhrcReportCard } from "./UhrcReportCard";

interface Props {
  disciplines?: Array<"pitching" | "hitting">;
}

export function UhrcAthleteSection({ disciplines }: Props) {
  const { user } = useAuth();
  const { snapshot } = useHIESnapshot();
  const { data: trends } = usePitchingV2Trends(user?.id);

  const report = useMemo(() => {
    if (!user?.id) return null;
    const w30 = trends?.find((w) => w.window === "30d");
    const latest = w30?.aggregates[w30.aggregates.length - 1] ?? null;
    return buildUhrcReport({
      athlete_id: user.id,
      disciplines: disciplines ?? ["pitching", "hitting"],
      pieV2Latest: latest ?? undefined,
      hieSnapshot: snapshot
        ? {
            id: snapshot.id,
            computed_at: snapshot.computed_at,
            hitting_doctrine: snapshot.hitting_doctrine ?? null,
            decision_speed_index: snapshot.decision_speed_index ?? null,
            movement_efficiency_score: snapshot.movement_efficiency_score ?? null,
          }
        : null,
    });
  }, [user?.id, snapshot, trends, disciplines]);

  if (!report) return null;
  return <UhrcReportCard report={report} />;
}
