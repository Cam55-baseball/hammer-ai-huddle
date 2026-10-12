import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import {
  ageYears, fairnessWarnings, gradeSourceLabel, type ComparedAthlete,
} from "@/lib/org/compareAthletes";
import type { FacilityBoardRow } from "@/lib/org/facilityBoard";

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "Not recorded";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "Not recorded" : d.toISOString().slice(0, 10);
}

export function CompareAthletes({ orgId }: { orgId: string }) {
  const [picked, setPicked] = useState<string[]>([]);

  const { data: roster, isLoading: rosterLoading } = useQuery({
    queryKey: ["org-facility-board", orgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("org_facility_board", { _org: orgId });
      if (error) throw error;
      return (data ?? []) as FacilityBoardRow[];
    },
  });

  const { data: compared, isFetching, error } = useQuery({
    queryKey: ["org-compare-athletes", orgId, picked],
    enabled: picked.length >= 2,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("org_compare_athletes", {
        _org: orgId,
        _athletes: picked,
      });
      if (error) throw error;
      return (data ?? []) as ComparedAthlete[];
    },
  });

  const rows = useMemo(() => roster ?? [], [roster]);
  const warnings = useMemo(
    () => (compared ? fairnessWarnings(compared) : []),
    [compared],
  );

  const toggle = (id: string) =>
    setPicked((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < 6 ? [...cur, id] : cur,
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compare players</CardTitle>
        <p className="text-sm text-muted-foreground">
          Pick 2 to 6 players to see them side by side. Every number shows its date and who entered it.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {rosterLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!rosterLoading && rows.length < 2 && (
          <p className="text-sm text-muted-foreground">You need at least 2 players in the organization to compare.</p>
        )}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Pick players to compare">
          {rows.map((r) => {
            const on = picked.includes(r.athlete_id);
            return (
              <Button
                key={r.athlete_id}
                type="button"
                size="sm"
                variant={on ? "default" : "outline"}
                aria-pressed={on}
                onClick={() => toggle(r.athlete_id)}
              >
                {r.name ?? "Player"}
              </Button>
            );
          })}
        </div>
        {picked.length === 1 && (
          <p className="text-sm text-muted-foreground">Pick at least one more player.</p>
        )}
        {isFetching && picked.length >= 2 && (
          <p className="text-sm text-muted-foreground">Comparing…</p>
        )}
        {error && (
          <p className="text-sm text-destructive">Could not load the comparison. Please try again.</p>
        )}
        {compared && compared.length >= 2 && (
          <>
            {warnings.length > 0 && (
              <div className="space-y-1 rounded-md border border-amber-500/40 bg-amber-500/10 p-3" role="alert">
                {warnings.map((w) => (
                  <p key={w} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <span>{w}</span>
                  </p>
                ))}
              </div>
            )}
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {compared.map((a) => {
                const age = ageYears(a.date_of_birth);
                return (
                  <li key={a.athlete_id} className="space-y-1 rounded-md border p-3 text-sm">
                    <p className="font-medium">{a.name}</p>
                    <p className="text-muted-foreground">
                      Position: {a.primary_position ?? "Not recorded"}
                      {a.league_tier ? ` · Level: ${a.league_tier}` : ""}
                      {age !== null ? ` · Age: ${age}` : ""}
                    </p>
                    <p>
                      Latest test:{" "}
                      {a.latest_test
                        ? `${a.latest_test.test_type} on ${fmtDate(a.latest_test.test_date)}`
                        : "Not yet measured"}
                    </p>
                    <p>Tests logged: {a.test_count}</p>
                    <p>
                      Latest grade:{" "}
                      {a.latest_grade?.overall_grade != null
                        ? `${a.latest_grade.overall_grade} on ${fmtDate(a.latest_grade.graded_at)}`
                        : "Not yet graded"}
                    </p>
                    {a.latest_grade && (
                      <p className="text-xs text-muted-foreground">
                        {gradeSourceLabel(a.latest_grade.grade_source)}
                      </p>
                    )}
                    <p>
                      Last 7 days of plan done:{" "}
                      {a.week_completion_pct != null ? `${a.week_completion_pct}%` : "No plan days this week"}
                    </p>
                    <p>
                      Games logged: {a.game_summary?.games ?? 0}
                      {a.game_summary?.last_game ? ` · last on ${fmtDate(a.game_summary.last_game)}` : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
