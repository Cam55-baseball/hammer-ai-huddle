import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ArrowRight } from "lucide-react";
import {
  readHpiLifestyle,
  writeHpiLifestyle,
  defaultLifestyle,
  type HpiLifestyle,
  type YinYangLean,
} from "@/lib/hpi/lifestyleStore";

interface Props {
  onContinue: () => void;
  onBack?: () => void;
}

/**
 * Constitution & lifestyle intake — Su Wen / Neijing overlay onboarding step.
 * Stored locally (no schema change). Feeds the derived HPI signal on the
 * Command Center and Dashboard.
 */
export function ConstitutionStep({ onContinue, onBack }: Props) {
  const [state, setState] = useState<Omit<HpiLifestyle, "savedAt">>(defaultLifestyle());

  useEffect(() => {
    const existing = readHpiLifestyle();
    if (existing) {
      const { savedAt: _drop, ...rest } = existing;
      setState(rest);
    }
  }, []);

  const save = () => {
    writeHpiLifestyle(state);
    onContinue();
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Lifestyle & constitution</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A 30-second baseline so Hammer can tune your Human Performance
          Intelligence signal — sleep, hydration, stress, and how your body
          leans in this season. Interpretive only; nothing here overrides your
          actual training data.
        </p>
      </div>

      <div className="grid gap-4 rounded-md border border-border bg-card/40 p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Sleep target (hrs)</Label>
            <Input
              type="number"
              min={5}
              max={11}
              step={0.5}
              value={state.sleepTargetHours}
              onChange={(e) =>
                setState((s) => ({ ...s, sleepTargetHours: parseFloat(e.target.value) || 8 }))
              }
            />
          </div>
          <div>
            <Label className="text-xs">Typical actual sleep (hrs)</Label>
            <Input
              type="number"
              min={4}
              max={11}
              step={0.5}
              value={state.sleepActualHours}
              onChange={(e) =>
                setState((s) => ({ ...s, sleepActualHours: parseFloat(e.target.value) || 7 }))
              }
            />
          </div>
        </div>

        <div>
          <Label className="text-xs">
            Water per day: {state.waterOz} oz
          </Label>
          <Slider
            min={24}
            max={160}
            step={4}
            value={[state.waterOz]}
            onValueChange={([v]) => setState((s) => ({ ...s, waterOz: v }))}
            className="mt-2"
          />
        </div>

        <div>
          <Label className="text-xs">
            Current life stress: {state.stressLevel}/5
          </Label>
          <Slider
            min={1}
            max={5}
            step={1}
            value={[state.stressLevel]}
            onValueChange={([v]) =>
              setState((s) => ({ ...s, stressLevel: v as HpiLifestyle["stressLevel"] }))
            }
            className="mt-2"
          />
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>Very calm</span>
            <span>Very high</span>
          </div>
        </div>

        <div>
          <Label className="text-xs">Constitutional lean</Label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(["yin", "balanced", "yang"] as YinYangLean[]).map((v) => {
              const active = state.constitution === v;
              const helper: Record<YinYangLean, string> = {
                yin: "Cool, steady, endurance",
                balanced: "Both, situational",
                yang: "Hot, explosive, wired",
              };
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setState((s) => ({ ...s, constitution: v }))}
                  className={`rounded-md border p-2 text-left text-xs transition ${
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-foreground/30"
                  }`}
                >
                  <div className="font-medium capitalize">{v}</div>
                  <div className="text-[10px] text-muted-foreground">{helper[v]}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label className="text-xs">Preferred training window</Label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(["early", "midday", "evening"] as const).map((v) => {
              const active = state.trainingWindow === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setState((s) => ({ ...s, trainingWindow: v }))}
                  className={`rounded-md border p-2 text-center text-xs capitalize transition ${
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-foreground/30"
                  }`}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        {onBack ? (
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={save}>
          Save & continue <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
