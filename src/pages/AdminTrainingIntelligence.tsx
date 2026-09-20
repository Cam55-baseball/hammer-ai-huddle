import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useToast } from "@/hooks/use-toast";
import {
  TCS_CONFIG_HASH,
  TCS_THRESHOLDS_HASH,
} from "../../supabase/functions/_shared/wic/schedule/tissueCost/config";
import {
  checkIsGreen,
  countGreenNights,
  evaluateGate,
  releasePreflight,
  type SwitchMode,
} from "../../supabase/functions/_shared/wic/flags/rollout";


type TestRun = {
  id: string;
  run_at: string;
  tier: string;
  seasons: number | null;
  violations_count: number | null;
  status: string;
  config_hash: string | null;
  thresholds_hash: string | null;
  git_sha: string | null;
};
type ShadowCheck = {
  id: string;
  run_at: string;
  checked_date: string;
  athletes: number;
  decisions: number;
  mismatches: number;
  fallback_rate: number | null;
  status: string;
};
type MatrixRun = {
  id: string;
  run_at: string;
  cells: number;
  empty_cells: number;
  active_rows: number;
  status: string;
  fingerprint: string | null;
};
type SwitchRow = {
  feature_key: string;
  label: string;
  mode: string;
  allowlist: string[] | null;
  buildable: boolean;
  sort_order: number;
  updated_by: string | null;
};
type PendingRow = {
  id: string;
  slug: string;
  name: string;
  bucket: string | null;
  sub_bucket: string | null;
  ub_tier: string | null;
  family: string | null;
  athlete_cue: string | null;
  coach_cue: string | null;
  min_age_years: number | null;
  min_training_age_years: number | null;
  season_eligibility: string[] | null;
  equipment_requirements: string[] | null;
  regression_slug: string | null;
};
type ProjectionDay = {
  date: string;
  scheduler_class: string;
  engine_class: string;
  agrees: boolean;
  reasons: unknown;
};

const MODE_LABEL: Record<string, string> = {
  off: "Off",
  self: "Just me",
  pilot: "Pilot list",
  all: "Everyone",
};

const Light = ({ ok, label }: { ok: boolean | null; label: string }) => (
  <span className="inline-flex items-center gap-1.5 text-sm">
    {ok === null ? (
      <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
    ) : ok ? (
      <CheckCircle2 className="h-4 w-4 text-primary" />
    ) : (
      <XCircle className="h-4 w-4 text-destructive" />
    )}
    <span>{label}</span>
  </span>
);

export default function AdminTrainingIntelligence() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const { isOwner, loading: ownerLoading } = useOwnerAccess();
  const { toast } = useToast();
  const allowed = isAdmin || isOwner;
  const gateLoading = adminLoading || ownerLoading;

  const [loading, setLoading] = useState(true);
  const [gateRun, setGateRun] = useState<TestRun | null>(null);
  const [versionRun, setVersionRun] = useState<TestRun | null>(null);
  const [checks, setChecks] = useState<ShadowCheck[]>([]);
  const [matrix, setMatrix] = useState<MatrixRun | null>(null);
  const [switches, setSwitches] = useState<SwitchRow[]>([]);
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [athletes, setAthletes] = useState<Array<{ id: string; name: string; allowed_class: string }>>([]);
  const [openAthlete, setOpenAthlete] = useState<string | null>(null);
  const [projection, setProjection] = useState<ProjectionDay[] | null>(null);
  const [projecting, setProjecting] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [fBucket, setFBucket] = useState("all");
  const [fTier, setFTier] = useState("all");
  const [fFamily, setFFamily] = useState("all");
  const [sentBack, setSentBack] = useState<Record<string, string>>({});
  const [sendNote, setSendNote] = useState<Record<string, string>>({});
  const [autoOff, setAutoOff] = useState<
    { feature_key: string; to_mode: string; reason: string | null; changed_at: string } | null
  >(null);
  const [watchNotes, setWatchNotes] = useState<
    Array<{ id: string; noted_at: string; severity: string; category: string; title: string; auto_action: string | null }>
  >([]);
  const [copying, setCopying] = useState(false);


  useEffect(() => {
    if (!gateLoading && !allowed) navigate("/dashboard");
  }, [gateLoading, allowed, navigate]);

  const load = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [runsRes, checksRes, matrixRes, switchRes, pendingRes, decisionRes] = await Promise.all([
      supabase
        .from("tcs_test_runs")
        .select("id, run_at, tier, seasons, violations_count, status, config_hash, thresholds_hash, git_sha")
        .order("run_at", { ascending: false })
        .limit(50),
      supabase
        .from("tcs_shadow_checks")
        .select("id, run_at, checked_date, athletes, decisions, mismatches, fallback_rate, status")
        .order("run_at", { ascending: false })
        .limit(30),
      supabase
        .from("wk_card_matrix_runs")
        .select("id, run_at, cells, empty_cells, active_rows, status, fingerprint")
        .order("run_at", { ascending: false })
        .limit(1),
      supabase
        .from("wk_feature_switches")
        .select("feature_key, label, mode, allowlist, buildable, sort_order, updated_by")
        .order("sort_order"),
      supabase
        .from("wk_movement_catalog")
        .select(
          "id, slug, name, bucket, sub_bucket, ub_tier, family, athlete_cue, coach_cue, min_age_years, min_training_age_years, season_eligibility, equipment_requirements, regression_slug",
        )
        .eq("is_active", false)
        .order("bucket")
        .limit(500),
      supabase
        .from("wk_schedule_decisions")
        .select("user_id, allowed_class")
        .eq("decision_date", today)
        .limit(500),
    ]);

    const runs = (runsRes.data ?? []) as TestRun[];
    const current = (r: TestRun) =>
      r.config_hash === TCS_CONFIG_HASH && r.thresholds_hash === TCS_THRESHOLDS_HASH;
    setGateRun(runs.find((r) => current(r) && r.tier !== "version") ?? null);
    setVersionRun(runs.find((r) => current(r) && r.tier === "version") ?? null);
    setChecks((checksRes.data ?? []) as ShadowCheck[]);
    setMatrix(((matrixRes.data ?? [])[0] as MatrixRun) ?? null);
    setSwitches((switchRes.data ?? []) as SwitchRow[]);
    setPending((pendingRes.data ?? []) as unknown as PendingRow[]);

    const { data: reviewRows } = await supabase
      .from("wk_catalog_review_notes")
      .select("catalog_id, note, decision, decided_at")
      .eq("decision", "rejected")
      .order("decided_at", { ascending: false });
    const backMap: Record<string, string> = {};
    for (const r of (reviewRows ?? []) as Array<{ catalog_id: string; note: string | null }>) {
      if (!(r.catalog_id in backMap)) backMap[r.catalog_id] = r.note ?? "Sent back";
    }
    setSentBack(backMap);

    const { data: autoRows } = await supabase
      .from("wk_feature_switch_audit")
      .select("feature_key, to_mode, reason, changed_at")
      .eq("automatic", true)
      .order("changed_at", { ascending: false })
      .limit(1);
    setAutoOff(((autoRows ?? [])[0] as typeof autoOff) ?? null);

    const { data: noteRows } = await supabase
      .from("ti_watch_notes")
      .select("id, noted_at, severity, category, title, auto_action")
      .gte("noted_at", new Date(Date.now() - 86400000).toISOString())
      .order("noted_at", { ascending: false })
      .limit(50);
    setWatchNotes((noteRows ?? []) as typeof watchNotes);



    const decisions = (decisionRes.data ?? []) as Array<{ user_id: string; allowed_class: string }>;
    const ids = decisions.map((d) => d.user_id);
    let names = new Map<string, string>();
    if (ids.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      names = new Map((profiles ?? []).map((p) => [p.id as string, (p.full_name as string) ?? "Athlete"]));
    }
    setAthletes(
      decisions.map((d) => ({
        id: d.user_id,
        name: names.get(d.user_id) ?? "Athlete",
        allowed_class: d.allowed_class,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);

  // ── health ────────────────────────────────────────────────────────────────
  const lastCheck = checks[0] ?? null;
  const normalised = useMemo(
    () =>
      checks.map((c) => ({
        status: c.status,
        mismatches: c.mismatches,
        fallbackRate: Number(c.fallback_rate ?? 0),
      })),
    [checks],
  );
  const greenNights = useMemo(() => countGreenNights(normalised), [normalised]);
  const lastNightGreen = checkIsGreen(normalised[0] ?? null);
  const gateOk = gateRun?.status === "passed" && (gateRun.violations_count ?? 0) === 0;
  const versionOk = versionRun?.status === "passed" && (versionRun.violations_count ?? 0) === 0;
  const determinismOk = lastCheck ? lastNightGreen : null;
  const matrixOk = matrix ? matrix.status === "passed" && matrix.empty_cells === 0 : null;
  const healthGreen = Boolean(gateOk) && determinismOk === true && matrixOk === true;

  const modeAllowed = (mode: string): { ok: boolean; why: string; needsConfirm: boolean } => {
    if (mode === "off") return { ok: true, why: "", needsConfirm: false };
    if (!healthGreen) return { ok: false, why: "Health is red", needsConfirm: false };
    return evaluateGate(mode as SwitchMode, {
      proofsOk: Boolean(gateOk),
      versionOk: Boolean(versionOk),
      greenNights,
      lastNightGreen,
      ownerConfirmed: true,
    });
  };

  const setMode = async (row: SwitchRow, mode: string) => {
    const gate = modeAllowed(mode);
    if (!gate.ok) {
      toast({ title: "Not available yet", description: gate.why, variant: "destructive" });
      return;
    }
    // Step 17 item A — machine check before any flip that widens a switch.
    if (mode !== "off") {
      const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: crit } = await supabase
        .from("ti_watch_notes")
        .select("id, noted_at, category, title, user_id, auto_action, acknowledged_at")
        .eq("severity", "critical")
        .gte("noted_at", sinceIso)
        .order("noted_at", { ascending: false });
      const rowsCrit = (crit ?? []) as Array<{
        id: string; noted_at: string; category: string; title: string; user_id: string | null;
        auto_action: string | null; acknowledged_at: string | null;
      }>;
      const pending = rowsCrit.find(
        (n) => !n.acknowledged_at && (n.auto_action ?? "").toLowerCase().includes("drops one level"),
      );
      const pre = releasePreflight({
        mode: mode as SwitchMode,
        criticalNotes: rowsCrit.map((n) => ({
          id: n.id, noted_at: n.noted_at, category: n.category, title: n.title, user_id: n.user_id,
        })),
        now: new Date(),
        pendingAutoOff: pending ? { feature_key: row.feature_key, to_mode: "one level down" } : null,
      });
      if (!pre.ok) {
        toast({
          title: "Release refused",
          description: `${pre.why}. Blocking: ${
            pre.blocking.slice(0, 5).map((b) => `${b.noted_at.slice(11, 16)} ${b.category} — ${b.title}`).join("; ")
          }`,
          variant: "destructive",
        });
        return;
      }
    }
    if (
      gate.needsConfirm &&
      !window.confirm(`Turn ${row.label} on for ${MODE_LABEL[mode]}? This affects other people.`)
    ) {
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("wk_feature_switches")
      .update({ mode, updated_by: user?.id ?? null })
      .eq("feature_key", row.feature_key);
    if (!error) {
      await supabase.from("wk_feature_switch_audit").insert({
        feature_key: row.feature_key,
        from_mode: row.mode,
        to_mode: mode,
        from_allowlist: row.allowlist,
        to_allowlist: row.allowlist,
        changed_by: user?.id ?? null,
        automatic: false,
        reason: "Changed by hand in the Control Center",
      });
      toast({ title: `${row.label} → ${MODE_LABEL[mode]}` });
      await load();
    } else {
      toast({ title: "Could not change that switch", description: error.message, variant: "destructive" });
    }
    setBusy(false);
  };


  const project = async (athleteId: string) => {
    setOpenAthlete(athleteId);
    setProjection(null);
    setProjecting(true);
    const { data, error } = await supabase.functions.invoke("wk-training-intel", {
      body: { action: "project", userId: athleteId },
    });
    setProjecting(false);
    if (error) {
      toast({ title: "Could not build the comparison", description: error.message, variant: "destructive" });
      return;
    }
    setProjection((data?.days ?? []) as ProjectionDay[]);
  };

  const mark = async (athleteId: string, date: string, verdict: "agree" | "disagree") => {
    const { error } = await supabase.from("wk_shadow_review_marks").upsert(
      {
        athlete_id: athleteId,
        decision_date: date,
        verdict,
        note: verdict === "disagree" ? note || null : null,
        marked_by: user?.id ?? "",
      },
      { onConflict: "athlete_id,decision_date,marked_by" },
    );
    toast(
      error
        ? { title: "Could not save that", description: error.message, variant: "destructive" }
        : { title: verdict === "agree" ? "Marked agree" : "Marked disagree" },
    );
    if (!error) setNote("");
  };

  const approveBatch = async () => {
    if (selected.length === 0) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("wk-training-intel", {
      body: { action: "approve_batch", ids: selected.slice(0, 20) },
    });
    setBusy(false);
    if (error) {
      toast({ title: "Approval failed", description: error.message, variant: "destructive" });
      return;
    }
    if (data?.ok) {
      toast({ title: `Activated ${data.activated} exercises`, description: `Cards checked: ${data.cells} of 1296, none empty.` });
      setSelected([]);
      await load();
    } else {
      toast({
        title: "Rolled back",
        description: `The card check failed (${data?.empty_cells ?? "?"} empty cells), so nothing was activated.`,
        variant: "destructive",
      });
      await load();
    }
  };

  const sendBack = async (row: PendingRow) => {
    const text = (sendNote[row.id] ?? "").trim();
    if (!text) {
      toast({ title: "Add a note first", description: "Say why it is going back.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("wk_catalog_review_notes").insert({
      catalog_id: row.id,
      slug: row.slug,
      decision: "rejected",
      note: text,
      decided_by: user?.id ?? "",
    });
    if (error) {
      toast({ title: "Could not send it back", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `${row.name} sent back`, description: "It stays switched off with your note." });
    setSendNote((s) => ({ ...s, [row.id]: "" }));
    setSelected((s) => s.filter((x) => x !== row.id));
    await load();
  };

  if (gateLoading || (allowed && loading)) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }
  if (!allowed) return null;

  const uniq = (vals: Array<string | null>) =>
    Array.from(new Set(vals.filter((v): v is string => Boolean(v)))).sort();
  const bucketOptions = uniq(pending.map((r) => r.bucket));
  const tierOptions = uniq(pending.map((r) => r.ub_tier));
  const familyOptions = uniq(pending.map((r) => r.family));

  const visible = pending.filter(
    (r) =>
      (fBucket === "all" || r.bucket === fBucket) &&
      (fTier === "all" || r.ub_tier === fTier) &&
      (fFamily === "all" || r.family === fFamily),
  );
  const sentBackCount = pending.filter((r) => sentBack[r.id]).length;

  const grouped = visible.reduce<Record<string, PendingRow[]>>((acc, r) => {
    const k = `${r.bucket ?? "Unsorted"} · ${r.sub_bucket ?? "—"}${r.ub_tier ? ` · ${r.ub_tier}` : ""}`;
    (acc[k] ??= []).push(r);
    return acc;
  }, {});


  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-3xl space-y-4 p-4">
        <div>
          <h1 className="text-2xl font-bold">Training Intelligence</h1>
          <p className="text-sm text-muted-foreground">
            Health, review and switches for the new training calculator.
          </p>
        </div>

        <Tabs defaultValue="health">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="health">Health</TabsTrigger>
            <TabsTrigger value="review">Review</TabsTrigger>
            <TabsTrigger value="switches">Switches</TabsTrigger>
          </TabsList>

          {/* ── HEALTH ─────────────────────────────────────────────────── */}
          <TabsContent value="health" className="space-y-3 pt-3">
            {autoOff && (
              <Card className="border-destructive/40">
                <CardContent className="p-3 text-sm">
                  <p className="font-medium">Safety stepped a switch down</p>
                  <p className="text-xs text-muted-foreground">
                    {autoOff.feature_key} → {MODE_LABEL[autoOff.to_mode] ?? autoOff.to_mode} ·{" "}
                    {autoOff.reason ?? "no reason recorded"} ·{" "}
                    {new Date(autoOff.changed_at).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {healthGreen ? "All green" : "Needs attention"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="space-y-1">
                  <Light ok={gateOk ?? null} label="Tests for this code and settings" />
                  <p className="pl-6 text-xs text-muted-foreground">
                    {gateRun
                      ? `${gateRun.seasons?.toLocaleString() ?? "?"} seasons · ${gateRun.violations_count ?? 0} problems · ${new Date(gateRun.run_at).toLocaleString()}`
                      : "No run yet for the current settings."}
                  </p>
                </div>
                <div className="space-y-1">
                  <Light ok={versionOk ?? null} label="20,000-season run for this version" />
                  <p className="pl-6 text-xs text-muted-foreground">
                    {versionRun
                      ? `${versionRun.seasons?.toLocaleString()} seasons · ${versionRun.violations_count ?? 0} problems · ${new Date(versionRun.run_at).toLocaleString()}`
                      : "Not run yet for the current settings."}
                  </p>
                </div>
                <div className="space-y-1">
                  <Light ok={determinismOk} label="Last night's re-check" />
                  <p className="pl-6 text-xs text-muted-foreground">
                    {lastCheck
                      ? `${lastCheck.decisions} decisions · ${lastCheck.mismatches} mismatches · fallback ${(Number(lastCheck.fallback_rate ?? 0) * 100).toFixed(2)}%`
                      : "No re-check recorded yet."}
                  </p>
                </div>
                <div className="space-y-1">
                  <Light ok={greenNights > 0} label={`${greenNights} green night${greenNights === 1 ? "" : "s"} in a row`} />
                </div>
                <div className="space-y-1">
                  <Light ok={matrixOk} label="Card check" />
                  <p className="pl-6 text-xs text-muted-foreground">
                    {matrix
                      ? `${matrix.cells} of 1296 cells · ${matrix.empty_cells} empty · ${matrix.active_rows} active exercises`
                      : "No card check recorded yet."}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Watchdog — the app's own notes from the last 24 hours */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {watchNotes.length === 0
                    ? "All clear in the last 24 hours"
                    : `${watchNotes.filter((n) => n.severity === "critical").length} critical · ${watchNotes.filter((n) => n.severity === "warn").length} warnings`}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {watchNotes.slice(0, 6).map((n) => (
                  <div key={n.id} className="space-y-0.5">
                    <p className={n.severity === "critical" ? "font-medium text-destructive" : "font-medium"}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {n.category} · {new Date(n.noted_at).toLocaleString()}
                      {n.auto_action ? ` · ${n.auto_action}` : ""}
                    </p>
                  </div>
                ))}
                {watchNotes.length > 6 && (
                  <p className="text-xs text-muted-foreground">…and {watchNotes.length - 6} more</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={copying}
                  onClick={async () => {
                    setCopying(true);
                    const { data, error } = await supabase.functions.invoke("ti-watchdog", {
                      body: { mode: "report", days: 7 },
                    });
                    setCopying(false);
                    if (error || !(data as any)?.text) {
                      toast({ title: "Could not build the report", variant: "destructive" });
                      return;
                    }
                    await navigator.clipboard.writeText((data as any).text as string);
                    toast({ title: "Report copied — paste it into the chat" });
                  }}
                >
                  {copying ? "Building…" : "Copy report for Claude"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── REVIEW ─────────────────────────────────────────────────── */}
          <TabsContent value="review" className="space-y-4 pt-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Side-by-side, next 14 days</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {athletes.length === 0 && (
                  <p className="text-sm text-muted-foreground">No decisions stored for today yet.</p>
                )}
                {athletes.map((a) => (
                  <div key={a.id} className="rounded-md border p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{a.name}</p>
                        <p className="text-xs text-muted-foreground">Today: {a.allowed_class}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => project(a.id)}>
                        Compare
                      </Button>
                    </div>

                    {openAthlete === a.id && (
                      <div className="mt-2 space-y-2">
                        {projecting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {projection?.map((d) => (
                          <div key={d.date} className="rounded border p-2 text-xs">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{d.date}</span>
                              <Badge variant="outline">Now: {d.engine_class}</Badge>
                              <Badge variant={d.agrees ? "secondary" : "destructive"}>
                                New: {d.scheduler_class}
                              </Badge>
                            </div>
                            {!d.agrees && (
                              <>
                                <p className="mt-1 text-muted-foreground">
                                  {Array.isArray(d.reasons)
                                    ? (d.reasons as Array<{ text?: string } | string>)
                                        .map((r) => (typeof r === "string" ? r : r?.text ?? ""))
                                        .filter(Boolean)
                                        .join(" ")
                                    : ""}
                                </p>
                                <div className="mt-2 flex gap-2">
                                  <Button size="sm" variant="secondary" onClick={() => mark(a.id, d.date, "agree")}>
                                    Agree
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => mark(a.id, d.date, "disagree")}>
                                    Disagree
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                        {projection && (
                          <Textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Note for a disagreement (optional)"
                            className="text-xs"
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  New exercises awaiting review ({pending.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {selected.length} selected (20 max per batch)
                  </p>
                  <Button size="sm" disabled={selected.length === 0 || busy} onClick={approveBatch}>
                    {busy ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                    Approve batch
                  </Button>
                </div>
                {Object.entries(grouped).map(([group, rows]) => (
                  <div key={group} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group} ({rows.length})
                    </p>
                    {rows.map((r) => (
                      <label key={r.id} className="flex gap-2 rounded-md border p-2 text-xs">
                        <Checkbox
                          checked={selected.includes(r.id)}
                          onCheckedChange={(v) =>
                            setSelected((s) =>
                              v === true ? [...s, r.id].slice(0, 20) : s.filter((x) => x !== r.id),
                            )
                          }
                        />
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium">{r.name}</p>
                          {r.athlete_cue && <p className="text-muted-foreground">Athlete: {r.athlete_cue}</p>}
                          {r.coach_cue && <p className="text-muted-foreground">Staff: {r.coach_cue}</p>}
                          <p className="text-muted-foreground">
                            Age {r.min_age_years ?? "—"}+ · training age {r.min_training_age_years ?? "—"}+
                            {r.family ? ` · ${r.family}` : ""}
                          </p>
                          <p className="text-muted-foreground">
                            Phases: {(r.season_eligibility ?? []).join(", ") || "any"} · Equipment:{" "}
                            {(r.equipment_requirements ?? []).join(", ") || "none"}
                            {r.regression_slug ? ` · easier version: ${r.regression_slug}` : ""}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── SWITCHES ───────────────────────────────────────────────── */}
          <TabsContent value="switches" className="space-y-3 pt-3">
            {!healthGreen && (
              <Card className="border-destructive/40">
                <CardContent className="p-3 text-sm text-muted-foreground">
                  Health is red, so switches stay off until it is green again.
                </CardContent>
              </Card>
            )}
            {switches.map((row) => (
              <Card key={row.feature_key}>
                <CardContent className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{row.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.buildable ? MODE_LABEL[row.mode] ?? row.mode : "Not built yet"}
                    </p>
                  </div>
                  <Select
                    value={row.mode}
                    disabled={!row.buildable || busy}
                    onValueChange={(v) => setMode(row, v)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["off", "self", "pilot", "all"].map((m) => {
                        const gate = modeAllowed(m);
                        return (
                          <SelectItem key={m} value={m} disabled={!gate.ok}>
                            {MODE_LABEL[m]}
                            {!gate.ok && m !== "off" ? " — locked" : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
