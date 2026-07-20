import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, RefreshCw, ExternalLink, AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface RunRow {
  id: string; started_at: string; finished_at: string | null;
  status: string; situations_checked: number;
  findings_total: number; findings_error: number; findings_warn: number;
  error_message: string | null;
}
interface FindingRow {
  id: string; run_id: string; situation_id: string;
  situation_slug: string | null; situation_title: string | null;
  sport: string; batter_side: string; severity: string;
  reason_code: string; preset_key: string | null; detail: any;
}

const SEV_BADGE: Record<string, { color: string; icon: any; label: string }> = {
  error: { color: "destructive", icon: AlertCircle, label: "Error" },
  warn: { color: "secondary", icon: AlertTriangle, label: "Warn" },
  ok: { color: "outline", icon: CheckCircle2, label: "OK" },
};

export default function IqAlignmentAudit() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showOkRows, setShowOkRows] = useState(false);

  const runsQ = useQuery({
    queryKey: ["iq-audit-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("iq_alignment_audit_runs" as any)
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as RunRow[];
    },
  });

  const latestRun = runsQ.data?.[0];

  const findingsQ = useQuery({
    queryKey: ["iq-audit-findings", latestRun?.id],
    enabled: !!latestRun?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("iq_alignment_audit_findings" as any)
        .select("*")
        .eq("run_id", latestRun!.id)
        .order("severity", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as FindingRow[];
    },
  });

  const runAudit = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("iq-alignment-audit");
      if (error) throw error;
      return data;
    },
    onSuccess: async (d: any) => {
      toast({ title: "Audit complete", description:
        `${d?.situations ?? 0} situations · ${d?.totals?.error ?? 0} errors · ${d?.totals?.warn ?? 0} warnings` });
      await qc.invalidateQueries({ queryKey: ["iq-audit-runs"] });
    },
    onError: (e: any) => toast({ title: "Audit failed", description: e?.message ?? "", variant: "destructive" }),
  });

  const findings = findingsQ.data ?? [];
  const visible = showOkRows ? findings : findings.filter((f) => f.severity !== "ok");
  const errors = findings.filter((f) => f.severity === "error");
  const warns = findings.filter((f) => f.severity === "warn");

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Alignment resolution audit</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Every published situation is checked for both sports × RHH/LHH × representative game states.
              Errors block publish; warnings should be reviewed.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => runAudit.mutate()} disabled={runAudit.isPending}>
              {runAudit.isPending ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
              Run audit
            </Button>
            <Button variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ["iq-audit-runs"] })}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {latestRun && (
          <Card className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
              <Stat label="Status" value={latestRun.status} />
              <Stat label="Situations" value={latestRun.situations_checked} />
              <Stat label="Findings" value={latestRun.findings_total} />
              <Stat label="Errors" value={latestRun.findings_error} tone={latestRun.findings_error ? "destructive" : "muted"} />
              <Stat label="Warnings" value={latestRun.findings_warn} tone={latestRun.findings_warn ? "warn" : "muted"} />
            </div>
            <div className="text-xs text-muted-foreground mt-3">
              Started {new Date(latestRun.started_at).toLocaleString()}
              {latestRun.finished_at && ` · finished ${new Date(latestRun.finished_at).toLocaleTimeString()}`}
            </div>
            {latestRun.error_message && (
              <div className="text-xs text-destructive mt-2">Error: {latestRun.error_message}</div>
            )}
          </Card>
        )}

        {!latestRun && !runsQ.isLoading && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No audit runs yet — press <b>Run audit</b> to check every published situation.
          </Card>
        )}

        {findings.length > 0 && (
          <>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="destructive">{errors.length} errors</Badge>
              <Badge variant="secondary">{warns.length} warnings</Badge>
              <label className="ml-auto inline-flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={showOkRows} onChange={(e) => setShowOkRows(e.target.checked)} />
                Show OK rows
              </label>
            </div>

            <Card className="p-0 overflow-hidden">
              <div className="max-h-[65vh] overflow-y-auto divide-y">
                {visible.map((f) => {
                  const meta = SEV_BADGE[f.severity] ?? SEV_BADGE.ok;
                  const Icon = meta.icon;
                  return (
                    <div key={f.id} className="p-3 flex items-start gap-3 text-sm">
                      <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${
                        f.severity === "error" ? "text-destructive" :
                        f.severity === "warn" ? "text-amber-500" : "text-green-500"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold truncate">{f.situation_title ?? f.situation_slug}</span>
                          <Badge variant="outline" className="text-[10px]">{f.sport}</Badge>
                          <Badge variant="outline" className="text-[10px]">{f.batter_side}HH</Badge>
                          {f.preset_key && <Badge variant="secondary" className="text-[10px]">{f.preset_key}</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          <span className="font-mono">{f.reason_code}</span>
                          {f.detail && Object.keys(f.detail).length > 0 && (
                            <span className="ml-2">· {JSON.stringify(f.detail).slice(0, 180)}</span>
                          )}
                        </div>
                      </div>
                      {f.situation_slug && (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={`/iq/${f.situation_slug}`} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                    </div>
                  );
                })}
                {visible.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    All checks passing — no errors or warnings.
                  </div>
                )}
              </div>
            </Card>
          </>
        )}

        {runsQ.data && runsQ.data.length > 1 && (
          <Card className="p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Recent runs
            </div>
            <div className="text-xs space-y-1">
              {runsQ.data.slice(1).map((r) => (
                <div key={r.id} className="flex items-center gap-2">
                  <span className="text-muted-foreground">{new Date(r.started_at).toLocaleString()}</span>
                  <Badge variant={r.findings_error ? "destructive" : "outline"} className="text-[10px]">
                    {r.findings_error}E / {r.findings_warn}W
                  </Badge>
                  <span className="text-muted-foreground">· {r.situations_checked} situations</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function Stat({ label, value, tone }: { label: string; value: any; tone?: "muted" | "destructive" | "warn" }) {
  const color = tone === "destructive" ? "text-destructive"
              : tone === "warn" ? "text-amber-500"
              : "text-foreground";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}
