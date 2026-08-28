/**
 * MyTellReport — pitcher-facing preview of the tipping "Tell Report".
 * Staff-only pre-release surface (route wrapped in StaffOnlyRoute).
 * Honest states throughout: untagged videos, indeterminate metrics, and the
 * fact that detection is not live yet are all shown plainly.
 */
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, FlaskConical, AlertCircle } from "lucide-react";
import {
  describeFinding,
  TIPPING_DETECTION_ENABLED,
  type MetricTellFinding,
} from "@/lib/biomech/tipping/tellReport";

const TELL_METRIC_LABELS: Record<string, string> = {
  energy_angle_deg: "Energy angle",
  shoulder_tilt_deg: "Shoulder tilt",
};
import {
  useTellReportRuns,
  useSetRunPitchType,
  useTellReport,
  type TellReportRun,
} from "@/hooks/useTellReport";

const PITCH_TYPES = [
  "fastball",
  "cutter",
  "sinker",
  "curveball",
  "slider",
  "changeup",
  "riseball",
  "dropball",
  "screwball",
  "other",
] as const;

function verdictBadge(verdict: TellFinding["verdict"]) {
  if (verdict === "likely_tell") return <Badge variant="destructive">Likely tell</Badge>;
  if (verdict === "no_tell") return <Badge variant="secondary">No tell found</Badge>;
  return <Badge variant="outline">Not enough data yet</Badge>;
}

function RunRow({ run }: { run: TellReportRun }) {
  const setPitch = useSetRunPitchType();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-background/40 p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          Pitch analyzed {new Date(run.createdAt).toLocaleDateString()}
        </p>
        <p className="text-xs text-muted-foreground">
          {run.eligibleMetricCount > 0
            ? `${run.eligibleMetricCount} measurable ${run.eligibleMetricCount === 1 ? "metric" : "metrics"} on this video`
            : "No measurable metrics on this video yet"}
        </p>
      </div>
      <Select
        value={run.pitchType ?? ""}
        onValueChange={(v) =>
          setPitch.mutate({ runId: run.id, pitchType: v === "__none__" ? null : v })
        }
      >
        <SelectTrigger className="w-40 capitalize">
          <SelectValue placeholder="Tag pitch type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Untagged</SelectItem>
          {PITCH_TYPES.map((p) => (
            <SelectItem key={p} value={p} className="capitalize">
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function MyTellReport() {
  const { data: runs, isLoading } = useTellReportRuns();
  const report = useTellReport(runs);

  const taggedCount = runs?.filter((r) => r.pitchType).length ?? 0;
  const distinctTypes = new Set(runs?.filter((r) => r.pitchType).map((r) => r.pitchType)).size;

  return (
    <DashboardLayout>
      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <div className="space-y-1">
          <h1 className="text-xl font-black">Pitch Tipping — Tell Report</h1>
          <p className="text-sm text-muted-foreground">
            Do you move differently depending on which pitch you're throwing? This
            report compares how much a mechanic varies between pitch types against
            how much it naturally varies within the same pitch type.
          </p>
        </div>

        {!TIPPING_DETECTION_ENABLED && (
          <Card className="border-dashed border-amber-500/50 bg-amber-500/5">
            <CardContent className="flex items-start gap-2 p-3 text-xs text-amber-700 dark:text-amber-400">
              <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Preview build — automatic tipping detection is not live yet. This page
                is for validating the report against real pitches before release.
              </span>
            </CardContent>
          </Card>
        )}

        {/* Tagging step */}
        <Card>
          <CardContent className="space-y-3 p-4">
            <h2 className="text-sm font-bold">1. Tag your analyzed pitches</h2>
            <p className="text-xs text-muted-foreground">
              The report only works once it knows which pitch each video was. Tag at
              least 2 different pitch types, with a few videos of each.
            </p>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : !runs || runs.length === 0 ? (
              <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                No analyzed pitching videos found yet. Analyze a pitch first, then come
                back here to tag it.
              </div>
            ) : (
              <div className="space-y-2">
                {runs.map((r) => (
                  <RunRow key={r.id} run={r} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report */}
        <Card>
          <CardContent className="space-y-3 p-4">
            <h2 className="text-sm font-bold">2. Your report</h2>
            {!report || taggedCount === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nothing to report yet — tag some pitches above.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Based on {report.total_tagged} tagged{" "}
                  {report.total_tagged === 1 ? "pitch" : "pitches"} across{" "}
                  {distinctTypes} pitch {distinctTypes === 1 ? "type" : "types"}.
                </p>
                <div className="space-y-2">
                  {report.findings.map((f) => (
                    <div
                      key={f.metric}
                      className="space-y-1.5 rounded-md border border-border bg-background/40 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          {TELL_METRIC_LABELS[f.metric]}
                        </span>
                        {verdictBadge(f.verdict)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {describeFinding(f)}
                      </p>
                      {Object.keys(f.per_type_means).length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {Object.entries(f.per_type_means).map(([type, mean]) => (
                            <span
                              key={type}
                              className="rounded bg-muted px-1.5 py-0.5 text-[10px] capitalize text-muted-foreground"
                            >
                              {type}: avg {mean.toFixed(1)}°
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </DashboardLayout>
  );
}
