import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import type { MovementGuide } from "@/lib/hammer/prescription/movementGuide";
import { activityBasics } from "./ActivityBasics";
import { ExerciseVideo } from "./ExerciseVideo";
import { VideoPlayer } from '@/components/video-library/VideoPlayer';

type LiveText = { how_to_one_rep?: string; setup?: string; steps?: string; cue?: string; why?: string; stop_if?: string; movements?: string[] };

/** Vault-created exercises have no entry in the built-in guide file — fetch their live text.
 *  Plain state (no query client) so a card renders anywhere, including inside other pop-ups. */
const liveCache = new Map<string, LiveText | null>();
function useLiveExerciseText(slug: string | null | undefined, needed: boolean) {
  const key = needed && slug ? slug : null;
  const [data, setData] = useState<LiveText | null>(() => (key ? liveCache.get(key) ?? null : null));
  useEffect(() => {
    if (!key) return;
    if (liveCache.has(key)) { setData(liveCache.get(key) ?? null); return; }
    let alive = true;
    void Promise.resolve(supabase.rpc("get_exercise_live_text", { _slug: key }))
      .then(({ data, error }) => { const v = error ? null : ((data ?? null) as LiveText | null); liveCache.set(key, v); if (alive) setData(v); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [key]);
  return { data };
}

/** The movement's existing guide, shown inline; never invents or changes a dose. */
export function ExerciseInstructions({ name, slug, videoUrl, guideOverride, setup, cue, stopIf, dosage, why, changes, repair, expanded = false }: {
  name: string; slug?: string | null; videoUrl?: string | null; guideOverride?: MovementGuide | null;
  setup?: string | null; cue?: string | null; stopIf?: string | null; dosage?: string | null;
  expanded?: boolean; why?: string | null; changes?: ReadonlyArray<string>; repair?: (t: string) => string;
}) {
  const R = (t: string | null | undefined) => (t && repair ? repair(t) : t);
  const [open, setOpen] = useState(false);
  const resolved = activityBasics({ name, slug, setup, cue, stopIf, dosage });
  const guide = guideOverride ?? resolved.guide;
  const fallback = guide ? null : resolved.fallback;
  const { data: live } = useLiveExerciseText(slug, !guide && !fallback && !setup);
  const liveSteps = live?.steps ? live.steps.split("\n").map((s) => s.trim()).filter(Boolean) : [];
  const steps = guide?.goodRep ?? fallback?.steps ?? liveSteps;
  const content = <>

      {videoUrl ? <VideoPlayer videoUrl={videoUrl} videoType={/\.(mp4|mov|webm|avi|m4v)(\?|$)/i.test(videoUrl) ? 'upload' : 'external'} title={name} /> : slug ? <ExerciseVideo slug={slug} /> : null}
      {live?.how_to_one_rep && <p className="text-muted-foreground"><span className="font-medium text-foreground">How to do one rep: </span>{R(live.how_to_one_rep)}</p>}
      <p className="text-muted-foreground"><span className="font-medium text-foreground">Setup: </span>{R(setup ?? guide?.setup ?? fallback?.setup ?? live?.setup)}</p>
      {steps.length > 0 && <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">{steps.map((step, i) => <li key={i}>{R(step)}</li>)}</ol>}
      {(cue || guide?.feel || live?.cue) && <p className="text-muted-foreground"><span className="font-medium text-foreground">Cue: </span>{R(cue ?? guide?.feel ?? live?.cue)}</p>}
      <p className="text-muted-foreground"><span className="font-medium text-foreground">Stop if: </span>{stopIf ?? guide?.stopIf ?? fallback?.stopIf ?? live?.stop_if ?? "You feel pain."}</p>
      {(why || guide?.whyToday || live?.why) && <p data-why-movement className="text-muted-foreground"><span className="font-medium text-foreground">Why this movement: </span>{R(why || guide?.whyToday || live?.why)}</p>}
  </>;
  if (expanded) return <section data-exercise-instructions className="space-y-2 text-xs"><h4 className="font-semibold">How to do it</h4>{content}</section>;
  return <Collapsible open={open} onOpenChange={setOpen} data-exercise-instructions>
    <CollapsibleTrigger asChild><Button type="button" variant="outline" className="h-10 w-full justify-between text-sm font-semibold">How to do it<ChevronDown className={`h-4 w-4 ${open ? "rotate-180" : ""}`} /></Button></CollapsibleTrigger>
    <CollapsibleContent className="mt-2 space-y-2 border-l-2 border-border pl-3 text-xs">{content}</CollapsibleContent>
  </Collapsible>;
}