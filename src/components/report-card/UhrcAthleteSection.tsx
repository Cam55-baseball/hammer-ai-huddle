/**
 * Athlete-side UHRC mounting helper. Wires the canonical hooks
 * (HIE snapshot + latest PIE V2 aggregate) into `buildUhrcReport`
 * and renders the report card. Used by AthleteCommand and
 * ProgressDashboard as the default analysis surface.
 *
 * Command Center Authority Restoration §D (RFL-065): sport is now sourced
 * from the athlete context envelope. UHRC pillars remain baseball/softball-
 * scoped today; non-supported sports render a visible missingness card
 * instead of fabricating a baseball-shaped report.
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useHIESnapshot } from "@/hooks/useHIESnapshot";
import { usePitchingV2Trends } from "@/hooks/usePitchingV2Trends";
import { useHammerAthleteContext } from "@/lib/hammer/context/athleteContext";
import { buildUhrcReport } from "@/lib/uhrc/buildReport";
import { UhrcReportCard } from "./UhrcReportCard";
import { BhCategoryPanels } from "./BhCategoryPanels";
import { useEmitOnce } from "@/hooks/useEmitObservability";

const SUPPORTED_SPORTS = new Set(["baseball", "softball"]);

interface Props {
  disciplines?: Array<"pitching" | "hitting">;
}

export function UhrcAthleteSection({ disciplines }: Props) {
  const { user } = useAuth();
  const { snapshot } = useHIESnapshot();
  const { data: trends } = usePitchingV2Trends(user?.id);
  const ctx = useHammerAthleteContext();
  const rawSport = ctx.get<string>("sport_primary")?.value ?? null;
  const sport = (rawSport ?? "baseball").toLowerCase();
  const sportSupported = SUPPORTED_SPORTS.has(sport);
  const reportSport = (sport === "softball" ? "softball" : "baseball") as
    | "baseball"
    | "softball";

  const report = useMemo(() => {
    if (!user?.id) return null;
    if (!sportSupported) return null;
    const w30 = trends?.find((w) => w.window === "30d");
    const latest = w30?.aggregates[w30.aggregates.length - 1] ?? null;
    return buildUhrcReport({
      athlete_id: user.id,
      sport: reportSport,
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
  }, [user?.id, snapshot, trends, disciplines, sportSupported, reportSport]);

  // RFL-003 — emit canonical intelligence.uhrc.viewed once per athlete per session/day.
  useEmitOnce(
    user?.id && report ? `uhrc:${user.id}` : null,
    user?.id && report
      ? {
          topic: "intelligence.uhrc.viewed",
          athleteId: user.id,
          actorId: user.id,
          actorRole: "athlete",
          payload: {
            surface: "athlete_section",
            sport: reportSport,
            disciplines: disciplines ?? ["pitching", "hitting"],
          },
        }
      : null,
  );

  // RFL-065: visible missingness when sport has no projector — never fabricate
  // a baseball-shaped UHRC for a non-baseball athlete.
  if (!sportSupported && rawSport) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-lg">
            <span>Hammers Report Card</span>
            <Badge variant="outline" className="text-[10px] uppercase">
              waiting on projector
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            We don't have a {rawSport} report projector yet, so we're not
            showing a grade rather than guessing one. The rest of your Command
            Center still works — your daily plan, recovery, and signals are all
            live.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!report) return null;
  const showHitting =
    reportSport === "baseball" && (disciplines ?? ["pitching", "hitting"]).includes("hitting");
  return (
    <div className="space-y-4">
      <UhrcReportCard report={report} sourceEventId={snapshot?.id ?? null} />
      {showHitting && <BhCategoryPanels />}
    </div>
  );
}
