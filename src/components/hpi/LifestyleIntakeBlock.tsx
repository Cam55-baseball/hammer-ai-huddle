import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  readHpiLifestyle,
  writeHpiLifestyle,
  defaultLifestyle,
  type HpiLifestyle,
  type YinYangLean,
} from "@/lib/hpi/lifestyleStore";

interface Props {
  /** Called after every save so parents can refresh derived HPI signals. */
  onChange?: (state: Omit<HpiLifestyle, "savedAt">) => void;
  /** Hide the intro copy — useful when embedded in a step or sheet with its own header. */
  hideIntro?: boolean;
}

/**
 * Reusable Lifestyle & Constitution intake — writes to hpi:lifestyle:v1
 * (localStorage) via `writeHpiLifestyle`. Rendered inside the onboarding
 * Fuel & Recovery step and the HPI card's inline sheet.
 *
 * Number fields keep local string state while typing, so the user can
 * clear the input on mobile without it snapping back to a default.
 */
export function LifestyleIntakeBlock({ onChange, hideIntro }: Props) {
  const [state, setState] = useState<Omit<HpiLifestyle, "savedAt">>(defaultLifestyle());
  const [sleepTargetStr, setSleepTargetStr] = useState<string>("");
  const [sleepActualStr, setSleepActualStr] = useState<string>("");

  useEffect(() => {
    const existing = readHpiLifestyle();
    if (existing) {
      const { savedAt: _drop, ...rest } = existing;
      setState(rest);
      setSleepTargetStr(String(rest.sleepTargetHours));
      setSleepActualStr(String(rest.sleepActualHours));
    } else {
      const d = defaultLifestyle();
      setSleepTargetStr(String(d.sleepTargetHours));
      setSleepActualStr(String(d.sleepActualHours));
    }
  }, []);

  const commit = (next: Omit<HpiLifestyle, "savedAt">) => {
    setState(next);
    writeHpiLifestyle(next);
    onChange?.(next);
  };

  const parseHours = (s: string, fallback: number, min: number, max: number) => {
    const n = parseFloat(s);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  };

  return (
    <section className="space-y-3">
      {!hideIntro && (
        <div>
          <h3 className="text-sm font-semibold">Lifestyle & constitution</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tunes Hammer's Human Performance Intelligence signal — sleep,
            hydration, stress, and constitutional lean. Interpretive only.
          </p>
        </div>
      )}

      <div className="grid gap-4 rounded-md border border-border bg-card/40 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Sleep target (hrs)</Label>
            <Input
              type="number"
              inputMode="decimal"
              min={5}
              max={11}
              step={0.5}
              value={sleepTargetStr}
              onChange={(e) => setSleepTargetStr(e.target.value)}
              onBlur={() => {
                const v = parseHours(sleepTargetStr, state.sleepTargetHours, 5, 11);
                setSleepTargetStr(String(v));
                commit({ ...state, sleepTargetHours: v });
              }}
            />
          </div>
          <div>
            <Label className="text-xs">Typical actual sleep (hrs)</Label>
            <Input
              type="number"
              inputMode="decimal"
              min={4}
              max={11}
              step={0.5}
              value={sleepActualStr}
              onChange={(e) => setSleepActualStr(e.target.value)}
              onBlur={() => {
                const v = parseHours(sleepActualStr, state.sleepActualHours, 4, 11);
                setSleepActualStr(String(v));
                commit({ ...state, sleepActualHours: v });
              }}
            />
          </div>
        </div>

        <div>
          <Label className="text-xs">Water per day: {state.waterOz} oz</Label>
          <Slider
            min={24}
            max={160}
            step={4}
            value={[state.waterOz]}
            onValueChange={([v]) => commit({ ...state, waterOz: v })}
            className="mt-2"
          />
        </div>

        <div>
          <Label className="text-xs">Current life stress: {state.stressLevel}/5</Label>
          <Slider
            min={1}
            max={5}
            step={1}
            value={[state.stressLevel]}
            onValueChange={([v]) =>
              commit({ ...state, stressLevel: v as HpiLifestyle["stressLevel"] })
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
                  onClick={() => commit({ ...state, constitution: v })}
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
                  onClick={() => commit({ ...state, trainingWindow: v })}
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
    </section>
  );
}
