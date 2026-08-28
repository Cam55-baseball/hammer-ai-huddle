/**
 * MyTellReport — pitcher-facing preview of the tipping "Tell Report".
 * Staff-only pre-release surface (route wrapped in StaffOnlyRoute).
 * Honest states throughout: untagged videos, indeterminate metrics, sample-size
 * confidence, and the fact that detection is not live yet are all shown plainly.
 *
 * Windup and stretch are reported separately and never pooled — a pitcher
 * moves differently out of each, so a cross-delivery comparison would flag a
 * delivery difference as a tell.
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
import { Eye, FlaskConical, AlertCircle, Layers } from "lucide-react";
import {
  describeFinding,
  DEFAULT_TELL_CONFIG,
  TIPPING_DETECTION_ENABLED,
  type DeliveryTellReport,
  type MetricTellFinding,
} from "@/lib/biomech/tipping/tellReport";
import {
  useTellReportRuns,
  useSetRunTags,
  useTellReport,
  type TellReportRun,
} from "@/hooks/useTellReport";

const TELL_METRIC_LABELS: Record<string, string> = {
  energy_angle_deg: "Energy angle",
  shoulder_tilt_deg: "Shoulder tilt",
};

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

const DELIVERY_LABEL = { windup: "Windup", stretch: "Stretch" } as const;

function verdictBadge(verdict: MetricTellFinding["verdict"]) {
  if (verdict === "likely_tell") return <Badge variant="destructive">Likely tell</Badge>;
  if (verdict === "no_tell") return <Badge variant="secondary">No tell found</Badge>;
  return <Badge variant="outline">Not enough data yet</Badge>;
}

function confidenceBadge(f: MetricTellFinding) {
  if (!f.confidence) return null;
  return f.confidence === "established" ? (
    <Badge variant="secondary">Solid sample ({f.min_group_n}+ per type)</Badge>
  ) : (
    <Badge variant="outline" className="border-amber-500/60 text-amber-700 dark:text-amber-400">
      Preliminary — only {f.min_group_n} of a type
    </Badge>
  );
}

function RunRow({ run }: { run: TellReportRun }) {
  const setTags = useSetRunTags();
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background/40 p-3">
      <div className="min-w-[10rem] flex-1">
        <p className="text-sm font-medium">
          Pitch analyzed {new Date(run.createdAt).toLocaleDateString()}
        </p>
        <p className="text-xs text-muted-foreground">
          {run.eligibleMetricCount > 0
            ? `${run.eligibleMetricCount} measurable ${run.eligibleMetricCount === 1 ? "metric" : "metrics"} on this video`
            : "No measurable metrics on this video yet"}
          {run.pitchType && !run.deliveryType && " · needs a delivery to be counted"}
        </p>
      </div>
      <Select
        value={run.pitchType ?? ""}
        onValueChange={(v) =>
          setTags.mutate({
            runId: run.id,
            patch: { pitch_type: v === "__none__" ? null : v },
          })
        }
      >
        <SelectTrigger className="w-36 capitalize">
          <SelectValue placeholder="Pitch type" />
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
      <Select
        value={run.deliveryType ?? ""}
        onValueChange={(v) =>
          setTags.mutate({
            runId: run.id,
            patch: { delivery_type: v === "__none__" ? null : (v as "windup" | "stretch") },
          })
        }
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Delivery" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Untagged</SelectItem>
          <SelectItem value="windup">Windup</SelectItem>
          <SelectItem value="stretch">Stretch</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function ArsenalBlock({ delivery }: { delivery: DeliveryTellReport }) {
  if (delivery.arsenal.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Nothing tagged from the {delivery.delivery_type} yet.
      </p>
    );
  }
  return (
    <div className="space-y-1.5">
      {delivery.arsenal.map((a) => (
        <div
          key={a.pitch_type}
          className="flex items-center justify-between gap-2 rounded border border-border bg-background/40 px-2 py-1.5 text-xs"
        >
          <span className="font-medium capitalize">{a.pitch_type}</span>
          <span className="text-muted-foreground">
            {a.n} tagged
            {!a.meets_minimum
              ? ` · ${a.pitches_to_minimum} more to be scored at all`
              : a.pitches_to_confident > 0
                ? ` · ${a.pitches_to_confident} more for a confident read`
                : " · solid sample"}
          </span>
        </div>
      ))}
    </div>
  );
}

function DeliverySection({ delivery }: { delivery: DeliveryTellReport }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-sm font-bold">
            <Layers className="h-4 w-4 text-muted-foreground" />
            {DELIVERY_LABEL[delivery.delivery_type]}
          </h2>
          <span className="text-xs text-muted-foreground">
            {delivery.total_pitches} tagged {delivery.total_pitches === 1 ? "pitch" : "pitches"}
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Your arsenal here</p>
          <ArsenalBlock delivery={delivery} />
        </div>

        <div className="space-y-2">
          {delivery.findings.map((f) => (
            <div
              key={f.metric}
              className="space-y-1.5 rounded-md border border-border bg-background/40 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  {TELL_METRIC_LABELS[f.metric] ?? f.metric}
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {confidenceBadge(f)}
                  {verdictBadge(f.verdict)}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{describeFinding(f)}</p>
              {f.groups.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {f.groups.map((g) => (
                    <span
                      key={g.pitch_type}
                      className="rounded bg-muted px-1.5 py-0.5 text-[10px] capitalize text-muted-foreground"
                    >
                      {g.pitch_type}: avg {g.mean.toFixed(1)}° (n={g.n})
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function MyTellReport() {
  const { data: runs, isLoading } = useTellReportRuns();
  const report = useTellReport(runs);
  const taggedCount = runs?.filter((r) => r.pitchType).length ?? 0;

  return (
    <DashboardLayout>
      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <div className="space-y-1">
          <h1 className="text-xl font-black">Pitch Tipping — Tell Report</h1>
          <p className="text-sm text-muted-foreground">
            Do you move differently depending on which pitch you're throwing? This
            report compares how much a mechanic varies between pitch types against
            how much it naturally varies within the same pitch type — separately for
            your windup and your stretch, because those two deliveries don't look the
            same and comparing across them would be misleading.
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
              Each pitch needs both tags — which pitch it was, and whether you threw it
              from the windup or the stretch. A pitch missing either one is left out of
              the comparison rather than guessed at. Aim for at least{" "}
              {DEFAULT_TELL_CONFIG.min_pitches_per_type} of each pitch type per delivery
              ({DEFAULT_TELL_CONFIG.confident_pitches_per_type}+ for a confident read).
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
        {!report || taggedCount === 0 ? (
          <Card>
            <CardContent className="p-4 text-xs text-muted-foreground">
              Nothing to report yet — tag some pitches above.
            </CardContent>
          </Card>
        ) : (
          <>
            {report.excluded_missing_delivery > 0 && (
              <Card className="border-dashed">
                <CardContent className="flex items-start gap-2 p-3 text-xs text-muted-foreground">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {report.excluded_missing_delivery}{" "}
                  {report.excluded_missing_delivery === 1 ? "pitch has" : "pitches have"} a
                  pitch type but no delivery tag, so {report.excluded_missing_delivery === 1
                    ? "it isn't"
                    : "they aren't"}{" "}
                  counted in either report yet.
                </CardContent>
              </Card>
            )}
            {report.deliveries.map((d) => (
              <DeliverySection key={d.delivery_type} delivery={d} />
            ))}
          </>
        )}
      </main>
    </DashboardLayout>
  );
}
