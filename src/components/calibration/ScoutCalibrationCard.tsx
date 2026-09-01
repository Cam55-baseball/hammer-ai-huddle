import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Crosshair, TrendingUp } from "lucide-react";
import {
  useScoutCalibration,
  TOOL_LABELS,
  calibrationTone,
  type ScoutToolCalibration,
} from "@/hooks/useCalibration";
import { CalibrationEmptyState } from "./CalibrationEmptyState";

/**
 * Scout calibration — own profile only.
 *
 * Compares this scout's tool grades against the system's measured grade
 * (grade_source = 'cv_measured') for the same athlete and tool, within a
 * 120-day window. Everything shown is computed server-side from real rows;
 * unpaired tools render as "no measured comparison yet", never as a number.
 */

function ToolRow({ row }: { row: ScoutToolCalibration }) {
  const label = TOOL_LABELS[row.tool] ?? row.tool;
  const tone = calibrationTone(row.signed_dev);
  const hasData = row.pairs > 0;

  // 20-80 scale mapped onto the bar.
  const pos = (v: number) => `${Math.min(100, Math.max(0, ((v - 20) / 60) * 100))}%`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        {hasData ? (
          <span className={`text-xs font-medium ${tone.className}`}>{tone.label}</span>
        ) : (
          <span className="text-xs text-muted-foreground">No measured comparison yet</span>
        )}
      </div>
      {hasData && (
        <>
          <div className="relative h-2 rounded-full bg-muted">
            <span
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-muted-foreground"
              style={{ left: pos(row.avg_system) }}
              title={`System ${row.avg_system}`}
            />
            <span
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary"
              style={{ left: pos(row.avg_scout) }}
              title={`You ${row.avg_scout}`}
            />
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>You {row.avg_scout.toFixed(1)}</span>
            <span>System {row.avg_system.toFixed(1)}</span>
            <span className="ml-auto">
              {row.pairs} paired {row.pairs === 1 ? "grade" : "grades"}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export function ScoutCalibrationCard() {
  const { data, isLoading, error } = useScoutCalibration();

  const paired = data?.total_pairs ?? 0;
  const tone = calibrationTone(data?.avg_signed_deviation ?? null);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Crosshair className="h-5 w-5 text-primary" />
          Your calibration
        </CardTitle>
        <CardDescription>
          How your grades line up with the system's measured grade for the same athlete and tool —
          and what happened to the players you liked.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your track record…
          </div>
        ) : error ? (
          <CalibrationEmptyState
            headline="Calibration unavailable"
            detail="We couldn't read your grading history just now. Try again in a moment."
          />
        ) : (
          <>
            {/* Headline numbers */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Reports filed</p>
                <p className="text-2xl font-semibold tabular-nums">{data?.reports ?? 0}</p>
                <p className="text-[11px] text-muted-foreground">
                  on {data?.athletes_graded ?? 0} {data?.athletes_graded === 1 ? "athlete" : "athletes"}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Avg. distance from measurement</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {data?.avg_abs_deviation != null ? `${data.avg_abs_deviation.toFixed(1)} pts` : "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {paired > 0 ? `across ${paired} paired grades` : "no paired grades yet"}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Direction</p>
                <p className={`text-sm font-semibold ${tone.className}`}>{tone.label}</p>
                <p className="text-[11px] text-muted-foreground">
                  positive = you grade above measurement
                </p>
              </div>
            </div>

            {/* Per-tool */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Tool by tool</p>
              {paired === 0 ? (
                <CalibrationEmptyState
                  headline="Not enough data yet to compare against system grades"
                  detail="Computer-vision measurement is still being validated, so there are almost no measured grades to grade you against. This card fills in automatically as measured grades land on athletes you've already scouted — nothing here is estimated in the meantime."
                />
              ) : (
                <div className="space-y-4">
                  {(data?.per_tool ?? []).map((row) => (
                    <ToolRow key={row.tool} row={row} />
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Longitudinal */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Longitudinal track record</p>
              </div>
              {(data?.high_graded_athletes ?? 0) === 0 ? (
                <CalibrationEmptyState
                  headline="No high grades on record yet"
                  detail="Once you grade athletes at 55 or above on the 20-80 scale, we'll track how many of them later matched a college or organization recruiting standard."
                />
              ) : (
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-2xl font-semibold tabular-nums">
                    {data!.high_graded_with_success}
                    <span className="text-base font-normal text-muted-foreground">
                      {" "}
                      of {data!.high_graded_athletes}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    athletes you graded 55+ later matched a recruiting standard
                  </p>
                </div>
              )}
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                <strong className="font-medium text-foreground">Success marker:</strong> matching a
                published college or organization recruiting standard after your grade date. It's the
                only externally-set, timestamped outcome the system records today — commitments and
                level changes aren't yet captured with dates, so they're deliberately excluded.
                Sample sizes are thin this early; read this as a record, not a rating.
              </p>
            </div>

            <Badge variant="outline" className="text-[11px]">
              Visible only to you
            </Badge>
          </>
        )}
      </CardContent>
    </Card>
  );
}
