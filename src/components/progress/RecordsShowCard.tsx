/**
 * Stage 6 — The General: what your records show. Dated facts and, only when
 * they clear the evidence bar, things that move together. Never a cause, never
 * a medical, psychological or behavioural claim.
 */
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { buildRecordsShow, type RecordKind } from "@/lib/progress/recordsShow";

const fmt = (d: string | null) => (d ? new Date(`${d.slice(0, 10)}T12:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "");

async function span(table: string, col: string, userId: string, filter?: (q: any) => any): Promise<{ first: string | null; last: string | null; ok: boolean }> {
  const db = supabase as any;
  const base = () => { let q = db.from(table).select(col).eq("user_id", userId); if (filter) q = filter(q); return q; };
  const [a, b] = await Promise.all([base().order(col, { ascending: true }).limit(1), base().order(col, { ascending: false }).limit(1)]);
  if (a.error || b.error) return { first: null, last: null, ok: false };
  return { first: a.data?.[0]?.[col] ?? null, last: b.data?.[0]?.[col] ?? null, ok: true };
}

export function RecordsShowCard() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["records-show", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const id = user!.id;
      const [games, checkins, clips, lifts, pairsRes] = await Promise.all([
        span("gp_games", "game_date", id, (q) => q.in("status", ["final", "draft"]).is("deleted_at", null)),
        span("vault_focus_quizzes", "created_at", id),
        span("videos", "created_at", id, (q) => q.eq("status", "completed")),
        span("wk_session_logs", "plan_date", id),
        (supabase as any).from("athlete_metric_pairs").select("key_a, key_b, value_a, value_b, day").eq("user_id", id).limit(5000),
      ]);
      const kinds: RecordKind[] = [
        { key: "games", label: "Games logged", ...games, unlocks: "Log your games so your plan can see what each one took out of you." },
        { key: "checkins", label: "Check-ins", ...checkins, unlocks: "Do your morning and night check-ins so your plan knows how you're feeling." },
        { key: "clips", label: "Clips analysed", ...clips, unlocks: "Upload a clip to get your swing or throw measured." },
        { key: "lifts", label: "Lifts logged", ...lifts, unlocks: "Log your lifts so your plan can match your last sessions." },
      ];
      return { show: buildRecordsShow({ kinds, pairs: (pairsRes.data ?? []) as any }), pairsFailed: !!pairsRes.error };
    },
  });

  return (
    <Card className="border-primary/20" data-testid="records-show">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> What your records show</CardTitle>
        <p className="text-xs text-muted-foreground">Only what you've logged, with dates. If something isn't here, it hasn't been recorded yet.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {q.isLoading || !q.data ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">On file</p>
              <ul className="space-y-2">
                {q.data.show.onFile.map((k) => (
                  <li key={k.key} className="rounded-md border border-border p-2.5">
                    <p className="text-sm font-medium">{k.label}</p>
                    {(k as any).ok === false ? (
                      <p className="text-xs text-muted-foreground">Couldn't read this right now. Nothing is shown rather than a guess.</p>
                    ) : k.last ? (
                      <p className="text-xs text-muted-foreground">Since {fmt(k.first)} · latest {fmt(k.last)}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Nothing yet. {k.unlocks}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">What moves together</p>
              {q.data.pairsFailed ? (
                <p className="text-sm text-muted-foreground">Couldn't read your measurements right now. Nothing is shown rather than a guess.</p>
              ) : q.data.show.together.length ? (
                <ul className="space-y-2">
                  {q.data.show.together.map((t) => (
                    <li key={`${t.a}|${t.b}`} className="rounded-md border border-border p-2.5">
                      <p className="text-sm">{t.sentence}</p>
                      <p className="text-[11px] text-muted-foreground">From your records, {fmt(t.from)} to {fmt(t.to)}. Moving together doesn't mean one causes the other.</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{q.data.show.waiting}</p>
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">How close you are to having enough</p>
                    <Progress value={Math.round(q.data.show.progressToBar * 100)} aria-label="How close you are to having enough records" />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
