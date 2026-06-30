/**
 * ActivePlanCard — in-game "active plan" surface inside the GameSheet Live tab.
 *
 * Loads the most-recent plan tied to the probable_pitcher_dossier_id for this
 * game and surfaces:
 *   - headline + matchup grade
 *   - quick-toggle outcome buttons ("worked / didn't") for each cue & each
 *     situational entry → feeds gp_plan_outcomes → gp-update-priors learning loop.
 *
 * If no plan exists, links to the dossier to generate one.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { gp } from "@/lib/games/ledger";
import { useAuth } from "@/hooks/useAuth";
import { useLogPlanOutcome, usePregamePlans } from "@/hooks/usePregamePlan";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Sparkles, Loader2 } from "lucide-react";
import { SITUATION_MATRIX } from "@/lib/games/situationalMatrix";

export function ActivePlanCard({ gameId, game }: { gameId: string; game: any }) {
  const { user } = useAuth();
  const pitcherId = game?.probable_pitcher_dossier_id ?? null;

  const planQ = useQuery({
    queryKey: ["active-plan", user?.id, gameId, pitcherId],
    enabled: !!user && !!pitcherId,
    queryFn: async () => {
      const { data } = await gp("gp_pregame_plans")
        .select("id,plan_json,plan_markdown,created_at")
        .eq("user_id", user!.id)
        .eq("pitcher_dossier_id", pitcherId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const log = useLogPlanOutcome();
  const { generate } = usePregamePlans({ role: "pitcher", dossierId: pitcherId });

  const cues = useMemo<any[]>(() => planQ.data?.plan_json?.cues ?? [], [planQ.data]);
  const situational = planQ.data?.plan_json?.situational_hitting ?? {};
  const attack = planQ.data?.plan_json?.my_attack_on_pitcher ?? {};

  if (!pitcherId) {
    return (
      <Card className="p-3 text-xs text-muted-foreground">
        Tag a probable pitcher on this game's Overview tab to surface your elite plan here.
      </Card>
    );
  }
  if (planQ.isLoading) return <Card className="p-3 text-xs">Loading plan…</Card>;
  if (!planQ.data) {
    return (
      <Card className="p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" /> Elite plan not generated yet
        </div>
        <div className="text-xs text-muted-foreground">
          One tap pulls direct history, archetype priors, zone heatmaps, count & situational
          tendencies, and your recent form into a personal hitting plan for this pitcher.
        </div>
        <Button
          size="sm"
          className="w-full"
          disabled={generate.isPending}
          onClick={() => generate.mutate({ sport: game?.sport, gameId })}
        >
          {generate.isPending ? (
            <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Generating…</>
          ) : (
            <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Generate elite plan</>
          )}
        </Button>
        {generate.error && (
          <div className="text-[11px] text-rose-600">{(generate.error as any)?.message ?? "Could not generate plan"}</div>
        )}
      </Card>
    );
  }
  const plan = planQ.data;
  const j = plan.plan_json ?? {};

  const logOutcome = (key: string, text: string, worked: boolean) =>
    log.mutate({ planId: plan.id, recommendation_key: key, recommendation_text: text, followed: true, worked });

  return (
    <Card className="p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> Active plan
          </div>
          {j.headline && <div className="text-xs mt-1">{j.headline}</div>}
        </div>
        <div className="flex flex-col items-end gap-1">
          {j.matchup_grade && <Badge variant="outline" className="text-[10px]">{j.matchup_grade}</Badge>}
          {attack.best_pitch_to_hunt && (
            <Badge variant="outline" className="text-[10px]">Hunt: {attack.best_pitch_to_hunt}</Badge>
          )}
        </div>
      </div>

      {cues.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Cues — tap after each AB</div>
          {cues.slice(0, 6).map((c: any, i: number) => {
            const k = c.key ?? `cue_${i}`;
            return (
              <div key={k} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex-1">{c.text}</span>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => logOutcome(k, c.text, true)}>
                  <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => logOutcome(k, c.text, false)}>
                  <ThumbsDown className="h-3.5 w-3.5 text-rose-600" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {Object.keys(situational).length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer font-medium">Situational quick-rate ({Object.keys(situational).length})</summary>
          <div className="space-y-1 mt-2 max-h-60 overflow-y-auto pr-1">
            {SITUATION_MATRIX.filter((s) => situational[s.key]).map((s) => {
              const e = situational[s.key];
              return (
                <div key={s.key} className="flex items-center justify-between gap-2 border-t pt-1">
                  <div className="flex-1">
                    <div className="text-[11px] font-semibold">{s.label}</div>
                    <div className="text-[11px] text-muted-foreground">{e.goal}</div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => logOutcome(`sit:${s.key}`, e.goal, true)}>
                    <ThumbsUp className="h-3 w-3 text-emerald-600" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => logOutcome(`sit:${s.key}`, e.goal, false)}>
                    <ThumbsDown className="h-3 w-3 text-rose-600" />
                  </Button>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </Card>
  );
}
