/**
 * TeamPitchingPlanCard — team pitching plan vs. one opponent hitter.
 *
 * For each opponent hitter attached to a game, surfaces the elite scouting
 * narrative ("Offspeed early, fastball late…") plus cues. One-tap generate
 * if no plan exists, plus quick thumbs-up/thumbs-down to feed the learning
 * loop through gp_plan_outcomes.
 */
import { useQuery } from "@tanstack/react-query";
import { gp } from "@/lib/games/ledger";
import { useAuth } from "@/hooks/useAuth";
import { useLogPlanOutcome, usePregamePlans } from "@/hooks/usePregamePlan";
import type { OpponentHitter } from "@/hooks/useGameDossiers";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Sparkles, Loader2, User } from "lucide-react";

export function TeamPitchingPlanCard({
  gameId,
  game,
  hitter,
}: {
  gameId: string;
  game: any;
  hitter: OpponentHitter;
}) {
  const { user } = useAuth();

  const planQ = useQuery({
    queryKey: ["team-plan", user?.id, gameId, hitter.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await gp("gp_pregame_plans")
        .select("id,plan_json,plan_markdown,created_at")
        .eq("user_id", user!.id)
        .eq("hitter_dossier_id", hitter.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const log = useLogPlanOutcome();
  const { generate } = usePregamePlans({ role: "hitter", dossierId: hitter.id });

  const j = planQ.data?.plan_json ?? {};
  const tgp = j.team_game_plan ?? null;
  const cues: any[] = Array.isArray(j.cues) ? j.cues : [];
  const pp = j.pitching_plan ?? {};

  const logOutcome = (key: string, text: string, worked: boolean) => {
    if (!planQ.data?.id) return;
    log.mutate({
      planId: planQ.data.id,
      recommendation_key: key,
      recommendation_text: text,
      followed: true,
      worked,
    });
  };

  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-semibold truncate">
            <User className="h-3.5 w-3.5 text-primary shrink-0" />
            {hitter.name}
            {hitter.bats && (
              <Badge variant="outline" className="text-[10px] ml-1">{hitter.bats}HB</Badge>
            )}
          </div>
          {j.headline && <div className="text-xs text-muted-foreground mt-1">{j.headline}</div>}
        </div>
        {j.matchup_grade && (
          <Badge variant="outline" className="text-[10px] shrink-0">{j.matchup_grade}</Badge>
        )}
      </div>

      {planQ.isLoading ? (
        <div className="text-xs text-muted-foreground">Loading…</div>
      ) : !planQ.data ? (
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          disabled={generate.isPending}
          onClick={() => generate.mutate({ sport: game?.sport, gameId })}
        >
          {generate.isPending ? (
            <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Building plan…</>
          ) : (
            <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Generate pitching plan</>
          )}
        </Button>
      ) : (
        <>
          {tgp && (
            <div className="rounded-md bg-muted/40 p-2 space-y-1 text-xs">
              {tgp.early_game && <div><span className="font-semibold text-primary">Early:</span> {tgp.early_game}</div>}
              {tgp.mid_game && <div><span className="font-semibold text-primary">Mid:</span> {tgp.mid_game}</div>}
              {tgp.late_game && <div><span className="font-semibold text-primary">Late:</span> {tgp.late_game}</div>}
              {tgp.key_adjustment && <div><span className="font-semibold">Adjust:</span> {tgp.key_adjustment}</div>}
              {tgp.risk && <div className="text-muted-foreground"><span className="font-semibold">Risk:</span> {tgp.risk}</div>}
              {tgp.why && <div className="text-muted-foreground italic">{tgp.why}</div>}
            </div>
          )}

          {(pp.putaway_pitch || pp.primary_sequence) && (
            <div className="flex flex-wrap gap-1 text-[10px]">
              {pp.putaway_pitch && (
                <Badge variant="outline">Putaway: {pp.putaway_pitch}{pp.putaway_zone ? ` (${pp.putaway_zone})` : ""}</Badge>
              )}
              {Array.isArray(pp.pitches_to_avoid) && pp.pitches_to_avoid.slice(0, 2).map((p: string) => (
                <Badge key={p} variant="outline" className="text-rose-600 border-rose-300">Avoid: {p}</Badge>
              ))}
            </div>
          )}

          {cues.length > 0 && (
            <div className="space-y-1">
              {cues.slice(0, 4).map((c: any, i: number) => {
                const k = c.key ?? `cue_${i}`;
                return (
                  <div key={k} className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex-1">{c.text}</span>
                    <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => logOutcome(k, c.text, true)}>
                      <ThumbsUp className="h-3 w-3 text-emerald-600" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => logOutcome(k, c.text, false)}>
                      <ThumbsDown className="h-3 w-3 text-rose-600" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px]"
              disabled={generate.isPending}
              onClick={() => generate.mutate({ sport: game?.sport, gameId })}
            >
              {generate.isPending ? "Regenerating…" : "Regenerate"}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
