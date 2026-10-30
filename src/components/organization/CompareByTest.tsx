import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { rankRows, rankingWarnings, ageOn, type RankFilters, type TestRankRow } from "@/lib/org/testRanking";
import { EvidenceTrendChart } from '@/components/progress/EvidenceTrendChart';
import { MeaningTitle } from '@/components/progress/SectionMeaning';

const sel = "w-full rounded-md border border-input bg-background p-2 text-sm";

/** Plan v3.1 owner addition — compare / rank players by one test result. */
export function CompareByTest({ orgId }: { orgId: string }) {
  const [test, setTest] = useState("");
  const [f, setF] = useState<RankFilters>({ ageGroup: "all", position: "all", level: "all", verifiedOnly: false, lowerIsBetter: false });

  const { data } = useQuery({
    queryKey: ["org-test-ranking", orgId, test],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("org_test_ranking", { _org: orgId, _test: test || null });
      if (error) throw error;
      return data as { tests: string[]; rows: TestRankRow[] };
    },
  });
  const all = data?.rows ?? [];
  const ranked = useMemo(() => rankRows(all, f), [all, f]);
  const warnings = useMemo(() => (test ? rankingWarnings(ranked) : []), [ranked, test]);
  const positions = [...new Set(all.map((r) => r.primary_position).filter(Boolean))] as string[];
  const levels = [...new Set(all.map((r) => r.league_tier).filter(Boolean))] as string[];

  return (
    <Card>
      <CardHeader>
        <CardTitle><MeaningTitle organization title="Rank by Test" use="Pick a test, set whether higher or lower is better, then find who is behind and give them work on that skill.">Each player contributes their latest recorded result for the selected test. Results keep their date and verification source. Choose whether higher or lower is better; mixed ages and positions need care.</MeaningTitle></CardTitle>
        <p className="text-sm text-muted-foreground">Each player's most recent result for the test you pick.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="rk-test">Test</Label>
          <select id="rk-test" className={sel} value={test} onChange={(e) => setTest(e.target.value)}>
            <option value="">Pick a test</option>
            {(data?.tests ?? []).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {data && data.tests.length === 0 && <p className="text-sm text-muted-foreground">No test results logged yet.</p>}
        </div>
        {test && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="rk-dir">Better is</Label>
                <select id="rk-dir" className={sel} value={f.lowerIsBetter ? "low" : "high"} onChange={(e) => setF({ ...f, lowerIsBetter: e.target.value === "low" })}>
                  <option value="high">Higher number</option>
                  <option value="low">Lower number (times)</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="rk-age">Age group</Label>
                <select id="rk-age" className={sel} value={f.ageGroup} onChange={(e) => setF({ ...f, ageGroup: e.target.value as RankFilters["ageGroup"] })}>
                  <option value="all">All ages</option><option value="13u">13 and under</option><option value="14-15">14–15</option><option value="16-17">16–17</option><option value="18+">18+</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="rk-pos">Position</Label>
                <select id="rk-pos" className={sel} value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })}>
                  <option value="all">All positions</option>{positions.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="rk-lvl">Level</Label>
                <select id="rk-lvl" className={sel} value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })}>
                  <option value="all">All levels</option>{levels.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={f.verifiedOnly} onChange={(e) => setF({ ...f, verifiedOnly: e.target.checked })} />
              Verified in person only
            </label>
            {warnings.map((w) => (
              <p key={w} className="flex items-start gap-2 text-sm text-muted-foreground"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{w}</p>
            ))}
            <EvidenceTrendChart bars label={test} unit="recorded test value" points={ranked.map(r=>({label:r.name,value:r.value,date:r.test_date,source:r.verified?'Facility-verified in person':'Athlete-entered'}))}/>
            <ol className="space-y-2">
              {ranked.map((r, i) => (
                <li key={r.athlete_id} className="rounded-md border border-border p-3 text-sm">
                  <p className="font-medium">Rank {i + 1}: {r.name}</p>
                  <p>Result: {r.value} · Tested on {r.test_date}</p>
                  <p className="text-xs text-muted-foreground">
                    Position: {r.primary_position ?? "Not set"} · Level: {r.league_tier ?? "Not set"} · Age: {ageOn(r.date_of_birth) ?? "Not set"}
                  </p>
                  <p className="text-xs text-muted-foreground">{r.verified ? "Source: facility-verified (in person)" : "Source: athlete-entered"}</p>
                </li>
              ))}
            </ol>
          </>
        )}
      </CardContent>
    </Card>
  );
}
