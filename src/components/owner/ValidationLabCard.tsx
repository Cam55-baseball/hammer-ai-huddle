/**
 * Validation Lab (Release 0, owner-only, switch validation_lab_v1). Pick a metric, name the
 * ground-truth device, enter trials side by side, and read the five-gate scorecard per app build.
 */
import { useMemo, useState } from "react";
import { isImpossibleEntry } from "@/lib/ledger/entryCheck";
import { ImpossibleNumberNote } from "@/components/measure/ImpossibleNumberNote";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { scorecard, trialsCsv, type LabMetric, type LabTrial } from "@/lib/validationLab/gates";

const db = supabase as never as { from: (t: string) => any };
const num = (s: string) => (s.trim() === "" || !Number.isFinite(Number(s)) ? null : Number(s));

export function ValidationLabCard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [metricKey, setMetricKey] = useState<string>("");
  const [build, setBuild] = useState("");
  const [f, setF] = useState({ device: "", deviceValue: "", appValue: "", fps: "", group: "", lighting: "", distance: "", height: "", angle: "", tilt: "", detected: true });
  const [busy, setBusy] = useState(false);

  const defs = useQuery({
    queryKey: ["validation-lab-defs"],
    queryFn: async () => {
      const { data, error } = await db.from("measurement_definitions")
        .select("metric_key, unit, display_name, required_fps, physical_min, physical_max, gt_tolerance, gt_device, published_source")
        .eq("is_canonical", true).not("gt_tolerance", "is", null).order("metric_key");
      if (error) throw error;
      return (data ?? []) as Array<LabMetric & { display_name: string; gt_device: string | null; published_source: string | null }>;
    },
  });
  const metric = defs.data?.find((d) => d.metric_key === metricKey) ?? null;

  const trials = useQuery({
    queryKey: ["validation-lab-trials", metricKey],
    enabled: !!metricKey,
    queryFn: async () => {
      const { data, error } = await db.from("validation_trials").select("*").eq("metric_key", metricKey).order("created_at");
      if (error) throw error;
      return (data ?? []) as LabTrial[];
    },
  });
  const history = useQuery({
    queryKey: ["validation-lab-history", metricKey],
    enabled: !!metricKey,
    queryFn: async () => {
      const { data, error } = await db.from("validation_scorecards").select("app_build, ready_to_open, trial_count, created_at").eq("metric_key", metricKey).order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const forBuild = useMemo(() => (trials.data ?? []).filter((t) => !build || t.app_build === build), [trials.data, build]);
  const builds = useMemo(() => [...new Set((trials.data ?? []).map((t) => t.app_build))], [trials.data]);
  const card = metric ? scorecard(metric, forBuild) : null;

  // Owner Nov 9: a device reading outside the metric dictionary's physical range can't be saved.
  // (App readings stay unblocked: the scorecard's physics gate must see impossible app numbers.)
  const deviceImpossible = !!metric && isImpossibleEntry(metric.metric_key, f.deviceValue);

  const add = async () => {
    if (deviceImpossible) return;
    if (!metric || !build.trim() || !f.device.trim()) { toast({ title: "Pick a metric, an app build and the device", variant: "destructive" }); return; }
    setBusy(true);
    const conditions = Object.fromEntries(Object.entries({ lighting: f.lighting || undefined, distance_m: num(f.distance) ?? undefined, camera_height_m: num(f.height) ?? undefined, view_angle: f.angle || undefined, tilt_deg: num(f.tilt) ?? undefined }).filter(([, v]) => v !== undefined));
    const { error } = await db.from("validation_trials").insert({
      metric_key: metric.metric_key, device_name: f.device.trim(), device_value: num(f.deviceValue), app_value: num(f.appValue),
      measured_fps: num(f.fps), detected: f.detected, consistency_group: f.group.trim() || null, app_build: build.trim(), conditions,
    });
    setBusy(false);
    if (error) { toast({ title: "Trial not saved", description: error.message, variant: "destructive" }); return; }
    setF((s) => ({ ...s, deviceValue: "", appValue: "" }));
    await qc.invalidateQueries({ queryKey: ["validation-lab-trials", metricKey] });
  };

  const saveSnapshot = async () => {
    if (!metric || !card || !build) return;
    const { error } = await db.from("validation_scorecards").insert({ metric_key: metric.metric_key, app_build: build, device_name: f.device || null, gates: card.gates, ready_to_open: card.ready, trial_count: card.n });
    if (error) toast({ title: "Scorecard not saved", description: error.message, variant: "destructive" });
    else await qc.invalidateQueries({ queryKey: ["validation-lab-history", metricKey] });
  };

  const exportCsv = () => {
    if (!metric) return;
    const blob = new Blob([trialsCsv(metric, forBuild)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `validation-${metric.metric_key}-${build || "all-builds"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const field = (k: keyof typeof f, label: string, type = "text") => (
    <div className="space-y-1">
      <Label htmlFor={`vl-${k}`} className="text-xs">{label}</Label>
      <Input id={`vl-${k}`} type={type} inputMode={type === "number" ? "decimal" : undefined} value={String(f[k])} onChange={(e) => setF((s) => ({ ...s, [k]: e.target.value }))} />
      {k === "deviceValue" && <ImpossibleNumberNote show={deviceImpossible} />}
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Validation Lab</CardTitle></CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Measurement</Label>
            <Select value={metricKey} onValueChange={setMetricKey}>
              <SelectTrigger aria-label="Measurement"><SelectValue placeholder="Pick a measurement" /></SelectTrigger>
              <SelectContent>{(defs.data ?? []).map((d) => <SelectItem key={d.metric_key} value={d.metric_key}>{d.display_name} ({d.unit})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="vl-build" className="text-xs">App build</Label>
            <Input id="vl-build" list="vl-builds" value={build} onChange={(e) => setBuild(e.target.value)} placeholder="e.g. 1.0 (11)" />
            <datalist id="vl-builds">{builds.map((b) => <option key={b} value={b} />)}</datalist>
          </div>
        </div>
        {metric && (
          <p className="text-xs text-muted-foreground">
            Allowed difference ±{metric.gt_tolerance} {metric.unit}{metric.published_source ? "" : " (proposed)"} · needs {metric.required_fps ? `${metric.required_fps} fps` : "no camera"} ·
            limits {metric.physical_min}–{metric.physical_max} {metric.unit}{metric.gt_device ? ` · suggested device: ${metric.gt_device}` : ""}
          </p>
        )}
        {metric && (
          <div className="grid gap-3 sm:grid-cols-3">
            {field("device", "Ground-truth device")}
            {field("deviceValue", `Device reading (${metric.unit})`, "number")}
            {field("appValue", `App reading (${metric.unit})`, "number")}
            {field("fps", "Counted fps", "number")}
            {field("group", "Same-input group (for repeats)")}
            {field("lighting", "Lighting")}
            {field("distance", "Distance (m)", "number")}
            {field("height", "Camera height (m)", "number")}
            {field("angle", "View angle")}
            {field("tilt", "Phone tilt (°)", "number")}
            <label className="flex items-center gap-2 pt-5 text-sm"><Checkbox checked={f.detected} onCheckedChange={(v) => setF((s) => ({ ...s, detected: v === true }))} />Detected</label>
            <div className="pt-4"><Button onClick={() => void add()} disabled={busy || deviceImpossible}>Add trial</Button></div>
          </div>
        )}
        {card && (
          <div className="space-y-2" aria-label="Scorecard">
            <p className="font-semibold">Build {build || "(all builds)"} · {card.n} trial(s)</p>
            {card.gates.map((g) => (
              <div key={g.key} className="flex items-start justify-between gap-3 border-b border-border pb-1">
                <span>{g.key} {g.label}<span className="block text-xs text-muted-foreground">{g.detail}</span></span>
                <Badge variant={g.pass ? "default" : "destructive"}>{g.pass ? "PASS" : "FAIL"}</Badge>
              </div>
            ))}
            <p className="text-base font-semibold">Ready to open: {card.ready ? "yes" : "no"}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void saveSnapshot()} disabled={!build}>Save scorecard for this build</Button>
              <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
            </div>
          </div>
        )}
        {!!history.data?.length && (
          <div className="space-y-1">
            <p className="font-semibold">History</p>
            {history.data.map((h: any, i: number) => (
              <p key={i} className="text-xs text-muted-foreground">{String(h.created_at).slice(0, 16).replace("T", " ")} · build {h.app_build} · {h.trial_count} trials · ready {h.ready_to_open ? "yes" : "no"}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
