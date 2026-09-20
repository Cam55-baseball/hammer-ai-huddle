// Staff View (v1.2 §D3) — read-only, printable, behind the staff_view switch.
// Everything on this page comes from rows the app already stored. Nothing is
// recalculated here, so the page always matches what the athlete was given.
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureSwitches } from "@/hooks/useFeatureSwitches";
import {
  changeLog,
  tankTrend,
  visibleAthleteIds,
  weeklyBucketTotals,
  classWord,
  type ChangeEntry,
  type Grant,
  type PrescriptionRow,
  type TankPoint,
  type BucketTotal,
} from "@/lib/hammer/staff/staffData";
import { decisionSentences, rulesForDecision, type RuleEntry } from "@/lib/hammer/staff/evidence";

type DecisionRow = {
  decision_date: string;
  allowed_class: string | null;
  timing: string | null;
  next_heavy_date: string | null;
  reasons: unknown;
  floors_applied: unknown;
  diagnostics: unknown;
  tank_levels: unknown;
  fallback_used: boolean | null;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function StaffView() {
  const { user } = useAuth();
  const { isEnabled, loading: switchesLoading } = useFeatureSwitches();
  const on = isEnabled("staff_view");

  const [loading, setLoading] = useState(true);
  const [athletes, setAthletes] = useState<Array<{ id: string; name: string }>>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [buckets, setBuckets] = useState<Record<string, string>>({});
  const [block, setBlock] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Array<{ id: string; full_name: string | null }>>([]);
  const [myGrants, setMyGrants] = useState<
    Array<{ id: string; name: string; revoked_at: string | null }>
  >([]);
  const [accessLog, setAccessLog] = useState<Array<{ viewed_at: string; name: string }>>([]);

  const loadMyGrants = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("wk_staff_access")
      .select("id, staff_user_id, revoked_at")
      .eq("athlete_user_id", user.id);
    const rows = (data ?? []) as Array<{ id: string; staff_user_id: string; revoked_at: string | null }>;
    const ids = rows.map((r) => r.staff_user_id);
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id, full_name").in("id", ids)
      : { data: [] as Array<{ id: string; full_name: string | null }> };
    const nameOf = (id: string) =>
      (profiles ?? []).find((p) => p.id === id)?.full_name ?? "Staff member";
    setMyGrants(rows.map((r) => ({ id: r.id, name: nameOf(r.staff_user_id), revoked_at: r.revoked_at })));

    const { data: logs } = await supabase
      .from("wk_staff_access_log")
      .select("viewed_at, staff_user_id")
      .eq("athlete_user_id", user.id)
      .order("viewed_at", { ascending: false })
      .limit(10);
    setAccessLog(
      ((logs ?? []) as Array<{ viewed_at: string; staff_user_id: string }>).map((l) => ({
        viewed_at: l.viewed_at,
        name: nameOf(l.staff_user_id),
      })),
    );
  }, [user]);

  const runSearch = async () => {
    if (search.trim().length < 2) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .ilike("full_name", `%${search.trim()}%`)
      .limit(8);
    setResults((data ?? []) as Array<{ id: string; full_name: string | null }>);
  };

  const grantTo = async (staffId: string) => {
    if (!user) return;
    await supabase
      .from("wk_staff_access")
      .upsert(
        { staff_user_id: staffId, athlete_user_id: user.id, granted_by: user.id, revoked_at: null },
        { onConflict: "staff_user_id,athlete_user_id" },
      );
    setResults([]);
    setSearch("");
    await loadMyGrants();
  };

  const revoke = async (grantId: string) => {
    await supabase
      .from("wk_staff_access")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", grantId);
    await loadMyGrants();
  };


  const loadGrants = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("wk_staff_access")
      .select("staff_user_id, athlete_user_id, revoked_at");
    const ids = visibleAthleteIds((data ?? []) as Grant[], user.id);
    if (ids.length === 0) {
      setAthletes([]);
      setLoading(false);
      return;
    }
    const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", ids);
    setAthletes(
      ids.map((id) => ({
        id,
        name: (profiles ?? []).find((p) => p.id === id)?.full_name ?? "Athlete",
      })),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (on) {
      void loadGrants();
      void loadMyGrants();
    } else setLoading(false);
  }, [on, loadGrants, loadMyGrants]);

  const openAthlete = async (athleteId: string) => {
    if (!user) return;
    setBusy(true);
    setOpenId(athleteId);
    const today = new Date();
    const from = new Date(today);
    from.setUTCDate(from.getUTCDate() - 28);
    const to = new Date(today);
    to.setUTCDate(to.getUTCDate() + 13);

    const [decRes, rxRes] = await Promise.all([
      supabase
        .from("wk_schedule_decisions")
        .select(
          "decision_date, allowed_class, timing, next_heavy_date, reasons, floors_applied, diagnostics, tank_levels, fallback_used",
        )
        .eq("user_id", athleteId)
        .gte("decision_date", iso(from))
        .order("decision_date", { ascending: false }),
      supabase
        .from("wk_prescriptions")
        .select("plan_date, slot, movement_name, movement_slug, sets, reps, status, phase")
        .eq("user_id", athleteId)
        .gte("plan_date", iso(from))
        .lte("plan_date", iso(to))
        .order("plan_date"),
    ]);

    const dec = (decRes.data ?? []) as DecisionRow[];
    const rx = (rxRes.data ?? []) as Array<PrescriptionRow & { phase?: string | null }>;
    setDecisions(dec);
    setPrescriptions(rx);
    setBlock(rx.find((r) => r.phase)?.phase ?? null);

    const slugs = Array.from(new Set(rx.map((r) => r.movement_slug).filter(Boolean))) as string[];
    if (slugs.length) {
      const { data: cat } = await supabase
        .from("wk_movement_catalog")
        .select("slug, bucket")
        .in("slug", slugs);
      setBuckets(
        Object.fromEntries((cat ?? []).map((c) => [c.slug as string, (c.bucket as string) ?? "Other"])),
      );
    } else {
      setBuckets({});
    }

    await supabase.from("wk_staff_access_log").insert({
      staff_user_id: user.id,
      athlete_user_id: athleteId,
      surface: "staff_view",
    });
    setBusy(false);
  };

  const today = iso(new Date());
  const todayDecision = decisions.find((d) => d.decision_date === today) ?? decisions[0] ?? null;
  const next14 = useMemo(() => {
    const out: Array<{ date: string; items: PrescriptionRow[] }> = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + i);
      const date = iso(d);
      out.push({ date, items: prescriptions.filter((p) => p.plan_date === date) });
    }
    return out;
  }, [prescriptions]);

  const changes: ChangeEntry[] = useMemo(() => changeLog(decisions), [decisions]);
  const tanks: TankPoint[] = useMemo(
    () => tankTrend(decisions.map((d) => ({ decision_date: d.decision_date, tank_levels: d.tank_levels }))),
    [decisions],
  );
  const weekly: Record<string, BucketTotal[]> = useMemo(
    () => weeklyBucketTotals(prescriptions, buckets),
    [prescriptions, buckets],
  );
  const rules: RuleEntry[] = useMemo(
    () => (todayDecision ? rulesForDecision(todayDecision) : []),
    [todayDecision],
  );

  if (switchesLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!on) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-2xl p-6 text-sm text-muted-foreground">
          Staff View is not switched on yet.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-4xl space-y-4 p-4 print:max-w-none print:p-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Staff View</h1>
            <p className="text-sm text-muted-foreground">
              Read-only. Training information only, exactly as the app recorded it.
            </p>
          </div>
          <Button size="sm" variant="outline" className="print:hidden" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Save as PDF
          </Button>
        </div>

        <Card className="print:hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">People who can see my training</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search a staff member by name"
                className="h-8 text-xs"
              />
              <Button size="sm" variant="outline" onClick={runSearch}>
                Search
              </Button>
            </div>
            {results.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 border-b py-1">
                <span>{p.full_name ?? "Unnamed"}</span>
                <Button size="sm" variant="secondary" onClick={() => grantTo(p.id)}>
                  Give access
                </Button>
              </div>
            ))}
            {myGrants.length === 0 && <p className="text-muted-foreground">Nobody has access right now.</p>}
            {myGrants.map((g) => (
              <div key={g.id} className="flex items-center justify-between gap-2 border-b py-1">
                <span>
                  {g.name} — {g.revoked_at ? "access removed" : "can see your training"}
                </span>
                {!g.revoked_at && (
                  <Button size="sm" variant="outline" onClick={() => revoke(g.id)}>
                    Remove
                  </Button>
                )}
              </div>
            ))}
            {accessLog.length > 0 && (
              <div className="pt-1">
                <p className="font-medium">Recent views</p>
                {accessLog.map((l, i) => (
                  <p key={i} className="text-muted-foreground">
                    {new Date(l.viewed_at).toLocaleString()} — {l.name}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>



        {athletes.length === 0 && (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              No athlete has given you access yet.
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-2 print:hidden">
          {athletes.map((a) => (
            <Button
              key={a.id}
              size="sm"
              variant={openId === a.id ? "default" : "outline"}
              onClick={() => openAthlete(a.id)}
            >
              {a.name}
            </Button>
          ))}
        </div>

        {busy && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}

        {openId && !busy && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {athletes.find((a) => a.id === openId)?.name} — today
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Block: {blockWord(block)}</Badge>
                  <Badge variant="secondary">
                    Today: {classWord(todayDecision?.allowed_class ?? null)}
                  </Badge>
                  {todayDecision?.timing && <Badge variant="outline">{timingWord(todayDecision.timing)}</Badge>}
                  {todayDecision?.next_heavy_date && (
                    <Badge variant="outline">Next heavy: {dayWord(todayDecision.next_heavy_date)}</Badge>
                  )}
                </div>
                {todayDecision &&
                  decisionSentences(todayDecision).map((s, i) => (
                    <p key={i} className="text-muted-foreground">
                      {s}
                    </p>
                  ))}
                {!todayDecision && <p className="text-muted-foreground">No stored decision for today.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Next 14 days</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                {next14.map((d) => (
                  <div key={d.date} className="flex gap-2 border-b py-1 last:border-0">
                    <span className="w-24 shrink-0 font-medium">{d.date}</span>
                    <span className="text-muted-foreground">
                      {d.items.length === 0
                        ? "nothing on the books"
                        : d.items.map((i) => i.movement_name ?? i.movement_slug).join(", ")}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Changes and why ({changes.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                {changes.length === 0 && <p className="text-muted-foreground">No changes recorded.</p>}
                {changes.map((c, i) => (
                  <div key={`${c.date}-${i}`} className="border-b py-1 last:border-0">
                    <p className="font-medium">
                      {c.date} — {c.what}
                    </p>
                    <p className="text-muted-foreground">{c.why}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Tank trends (last 28 days)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                {tanks.length === 0 && <p className="text-muted-foreground">No stored tank readings.</p>}
                {tanks.slice(-14).map((t) => (
                  <div key={t.date} className="flex gap-2 border-b py-1 last:border-0">
                    <span className="w-24 shrink-0 font-medium">{t.date}</span>
                    <span className="text-muted-foreground">
                      {Object.entries(t.tanks)
                        .map(([k, v]) => `${k} ${v}`)
                        .join(" · ") || "—"}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Weekly totals per bucket</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {Object.keys(weekly).length === 0 && (
                  <p className="text-muted-foreground">Nothing recorded.</p>
                )}
                {Object.entries(weekly)
                  .sort((a, b) => b[0].localeCompare(a[0]))
                  .map(([week, rows]) => (
                    <div key={week}>
                      <p className="font-medium">Week of {week}</p>
                      {rows.map((r) => (
                        <p key={r.bucket} className="text-muted-foreground">
                          {r.bucket}: {r.sets} sets across {r.movements} movements
                        </p>
                      ))}
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Rules applied</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                {rules.length === 0 && <p className="text-muted-foreground">No rule text stored for today.</p>}
                {rules.map((r) => (
                  <div key={r.id} className="flex gap-2 border-b py-1 last:border-0">
                    <Badge variant="outline" className="h-5 shrink-0">
                      {r.grade}
                    </Badge>
                    <span className="text-muted-foreground">
                      <span className="font-medium text-foreground">{r.id}</span> — {r.text}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
