import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import type { ScoutProfileData } from "@/components/scout/ScoutProfileTabs";
import { NM, NOT_SHARED, scoutFairnessWarnings, toColumn } from "@/lib/scout/compare";

const fetchProfile = async (id: string): Promise<ScoutProfileData | null> => {
  const { data, error } = await (supabase as any).rpc("scout_athlete_profile", { _athlete: id });
  return error ? null : (data as ScoutProfileData);
};

function Line({ k, v, src }: { k: string; v: string; src?: string }) {
  return (
    <div className="border-b py-1.5 text-sm">
      <p className="text-muted-foreground text-xs">{k}</p>
      <p>{v}</p>
      {src && <p className="text-xs text-muted-foreground">{src}</p>}
    </div>
  );
}

export default function ScoutCompare() {
  const navigate = useNavigate();
  const [picked, setPicked] = useState<string[]>([]);

  const follows = useQuery({
    queryKey: ["scout-compare-follows"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [] as string[];
      const { data } = await supabase.from("scout_follows").select("player_id").eq("scout_id", u.user.id).eq("status", "accepted").limit(40);
      return (data ?? []).map((r: any) => r.player_id as string);
    },
  });
  const ids = follows.data ?? [];
  const profiles = useQueries({
    queries: ids.map((id) => ({ queryKey: ["scout-profile", id], retry: false, queryFn: () => fetchProfile(id) })),
  });
  const cols = useMemo(() => ids.map((id, i) => toColumn(id, profiles[i]?.data)), [ids, profiles]);
  const chosen = cols.filter((c) => picked.includes(c.id));
  const warnings = scoutFairnessWarnings(chosen);

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 4 ? p : [...p, id]));

  return (
    <div className="min-h-screen bg-background p-4 max-w-5xl mx-auto space-y-4">
      <Button variant="ghost" onClick={() => navigate("/scout-dashboard")}><ArrowLeft className="h-4 w-4 mr-2" />Scout Dashboard</Button>
      <h1 className="text-2xl font-bold">Compare players</h1>
      <p className="text-sm text-muted-foreground">Pick 2 to 4 players you follow. You only see what each family shared.</p>

      <Card>
        <CardHeader><CardTitle className="text-base">Players you follow ({picked.length} of 4 picked)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {follows.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
            : !ids.length ? <p className="text-sm text-muted-foreground">You're not following any players yet.</p>
            : cols.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer min-h-10">
                <Checkbox checked={picked.includes(c.id)} disabled={!picked.includes(c.id) && picked.length >= 4} onCheckedChange={() => toggle(c.id)} aria-label={`Compare ${c.name}`} />
                Player: {c.name}
              </label>
            ))}
        </CardContent>
      </Card>

      {chosen.length < 2 ? (
        <p className="text-sm text-muted-foreground">Pick at least 2 players to compare.</p>
      ) : (
        <>
          {warnings.length > 0 && (
            <Card className="border-destructive/50" data-testid="scout-compare-warnings">
              <CardContent className="pt-4 space-y-1">
                {warnings.map((w) => <p key={w} className="text-sm flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />{w}</p>)}
              </CardContent>
            </Card>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {chosen.map((c) => (
              <Card key={c.id} data-testid="scout-compare-col">
                <CardHeader><CardTitle className="text-base">{c.name}</CardTitle></CardHeader>
                <CardContent>
                  <Line k="Position" v={c.position ?? "Not entered"} />
                  <Line k="Playing level" v={c.level ?? "Not entered"} />
                  <Line k="Grad year" v={c.gradYear ? String(c.gradYear) : "Not entered"} src="Source: athlete-entered profile" />
                  {!c.sharedMetrics ? <Line k="Tests and grades" v={NOT_SHARED} /> : (<>
                    <Line k="Latest test" v={c.latestTest ? `${c.latestTest.type} — ${c.latestTest.values || NM} (${c.latestTest.date})` : NM}
                      src={c.latestTest ? (c.latestTest.verified ? "Source: facility-verified (in person)" : "Source: athlete-entered") : undefined} />
                    <Line k="Tests logged" v={String(c.testCount)} />
                    <Line k="Latest grade (20–80 scale)" v={c.latestGrade?.grade != null ? `${c.latestGrade.grade} (${c.latestGrade.date ?? "date not recorded"})` : NM}
                      src={c.latestGrade ? `Entered by: ${c.latestGrade.source ?? "not recorded"}` : undefined} />
                  </>)}
                  <Line k="Analysis reports" v={c.reportCount === null ? NOT_SHARED : String(c.reportCount)} />
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
