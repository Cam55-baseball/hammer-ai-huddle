/**
 * MentalCareerStep — career level target, focus area, pre-game routine.
 * Draft-persisted; downstream surfaces (Recruiting, Mental Health) read
 * these when the athlete opens the corresponding modules.
 */
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { writeDraftSlot, readDraftSlot } from "@/lib/onboarding/draftStore";

interface MentalDraft {
  level_target?: string;
  focus_area?: string;
  pregame_routine?: string;
}

interface Props { onContinue: () => void; onBack: () => void; }

const LEVELS = ["JUCO", "D3", "D2", "D1", "NAIA", "Pro / MLB", "Rec / HS"] as const;

export function MentalCareerStep({ onContinue, onBack }: Props) {
  const { user } = useAuth();
  const [level, setLevel] = useState("");
  const [focus, setFocus] = useState("");
  const [routine, setRoutine] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const d = await readDraftSlot<MentalDraft>(user.id, "mental-career");
      if (!d) return;
      if (d.level_target) setLevel(d.level_target);
      if (d.focus_area) setFocus(d.focus_area);
      if (d.pregame_routine) setRoutine(d.pregame_routine);
    })();
  }, [user?.id]);

  const persist = (patch: Partial<MentalDraft>) => {
    if (!user?.id) return;
    writeDraftSlot(user.id, "mental-career", {
      level_target: level || undefined,
      focus_area: focus || undefined,
      pregame_routine: routine || undefined,
      ...patch,
    });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Mental game & career</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Where are you aiming, and what mental cues keep you sharp? Hammer uses
        this to prioritize recruiting surfaces and pre-game routines.
      </p>

      <div className="space-y-1">
        <Label className="text-xs">Career level target</Label>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => {
            const active = level === l;
            return (
              <button key={l} type="button"
                onClick={() => { setLevel(l); persist({ level_target: l }); }}
                className={`rounded-md border px-3 py-1.5 text-xs transition ${
                  active ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-foreground/30"
                }`}>{l}</button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="focus" className="text-xs">Primary mental focus this season</Label>
        <Textarea id="focus" rows={2} value={focus}
          onChange={(e) => { setFocus(e.target.value); persist({ focus_area: e.target.value }); }}
          placeholder="e.g. Stay calm with runners on, trust my swing 2-strike counts" />
      </div>

      <div className="space-y-1">
        <Label htmlFor="routine" className="text-xs">Pre-game / pre-at-bat routine</Label>
        <Textarea id="routine" rows={2} value={routine}
          onChange={(e) => { setRoutine(e.target.value); persist({ pregame_routine: e.target.value }); }}
          placeholder="e.g. 4 breaths, visualize first pitch, tap helmet" />
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Button>
        <Button onClick={onContinue}>Continue<ArrowRight className="ml-2 h-4 w-4" /></Button>
      </div>
    </section>
  );
}
