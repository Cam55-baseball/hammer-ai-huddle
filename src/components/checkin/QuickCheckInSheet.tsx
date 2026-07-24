/**
 * Quick Check-In Sheet — stepped, elite-grade athlete check-in.
 *
 * Captures readiness, fatigue, soreness (+ regions), sleep, stress,
 * hydration, today's training plan (lifting intensity / throwing-hitting
 * volume), and optional free-text flag. Emits canonical ASB events per
 * field via the shared emitAsbEvent surface so Coach Hammer can
 * immediately reason on fresh signal. Skipped fields are NOT emitted,
 * preserving missingness lineage.
 */
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { emitAsbEvent } from "@/lib/asb/emit";
import { ENGINE_VERSION, computeIdempotencyKey } from "@/lib/asb/engineVersion";
import { mergeHpiLifestyle, type StressLevel } from "@/lib/hpi/lifestyleStore";

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
}

type Hydration = "low" | "ok" | "good";
type LiftingIntensity = "light" | "moderate" | "heavy" | "max";
type Volume = "low" | "normal" | "high";

const SORENESS_REGIONS = [
  "legs",
  "back",
  "shoulders",
  "arms",
  "core",
  "none",
] as const;

const PLAN_MODULES = [
  { id: "lifting", label: "Lifting" },
  { id: "throwing", label: "Throwing" },
  { id: "hitting", label: "Hitting" },
  { id: "conditioning", label: "Conditioning" },
  { id: "skill", label: "Skill work" },
  { id: "game", label: "Game / scrimmage" },
  { id: "recovery", label: "Recovery only" },
  { id: "rest", label: "Rest day" },
] as const;

interface State {
  readiness: number | null;
  fatigue: number | null;
  soreness: number | null;
  sorenessRegions: string[];
  sleepHours: number | null;
  sleepQuality: number | null;
  stress: number | null;
  hydration: Hydration | null;
  planModules: string[];
  liftingIntensity: LiftingIntensity | null;
  volume: Volume | null;
  note: string;
}

const INITIAL_STATE: State = {
  readiness: 6,
  fatigue: 4,
  soreness: 3,
  sorenessRegions: [],
  sleepHours: 7,
  sleepQuality: 7,
  stress: 4,
  hydration: null,
  planModules: [],
  liftingIntensity: null,
  volume: null,
  note: "",
};

const TOTAL_STEPS = 7;

export function QuickCheckInSheet({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<State>(INITIAL_STATE);
  const [skipped, setSkipped] = useState<Set<keyof State>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const reset = () => {
    setStep(0);
    setState(INITIAL_STATE);
    setSkipped(new Set());
    setSaving(false);
    setSaved(false);
  };

  const close = () => {
    onOpenChange(false);
    // delay reset so closing animation isn't jumpy
    setTimeout(reset, 250);
  };

  const markSkipped = (...keys: (keyof State)[]) => {
    setSkipped((s) => {
      const next = new Set(s);
      keys.forEach((k) => next.add(k));
      return next;
    });
  };

  const handleSkip = () => {
    // Mark current step fields as skipped, advance
    switch (step) {
      case 0:
        markSkipped("readiness");
        break;
      case 1:
        markSkipped("fatigue");
        break;
      case 2:
        markSkipped("soreness", "sorenessRegions");
        break;
      case 3:
        markSkipped("sleepHours", "sleepQuality");
        break;
      case 4:
        markSkipped("stress", "hydration");
        break;
      case 5:
        markSkipped("planModules", "liftingIntensity", "volume");
        break;
      case 6:
        markSkipped("note");
        break;
    }
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const fieldsLogged = useMemo(() => {
    const all: (keyof State)[] = [
      "readiness",
      "fatigue",
      "soreness",
      "sleepHours",
      "stress",
      "hydration",
      "planModules",
      "note",
    ];
    return all.filter((k) => !skipped.has(k));
  }, [skipped]);

  const handleSubmit = async () => {
    if (!user) return;
    setSaving(true);

    const occurred_at = new Date().toISOString();
    const groupId = crypto.randomUUID();
    const causality = [{ check_in_group: groupId }];

    const emissions: Promise<unknown>[] = [];

    const emit = async (topic: string, payload: Record<string, unknown>) => {
      const idempotency_key = await computeIdempotencyKey({
        athlete_id: user.id,
        topic_id: topic,
        occurred_at,
        payload,
      });
      return emitAsbEvent({
        event_id: crypto.randomUUID(),
        athlete_id: user.id,
        topic_id: topic,
        actor_role: "athlete",
        actor_id: user.id,
        occurred_at,
        ingested_at: occurred_at,
        effective_at: occurred_at,
        valid_from: occurred_at,
        valid_to: null,
        payload,
        engine_version: ENGINE_VERSION,
        idempotency_key,
        causality_refs: causality,
        lineage_refs: [],
      });
    };

    if (!skipped.has("readiness") && state.readiness !== null) {
      emissions.push(emit("behavioral.readiness", { score: state.readiness }));
    }
    if (!skipped.has("fatigue") && state.fatigue !== null) {
      emissions.push(emit("behavioral.fatigue", { score: state.fatigue }));
    }
    if (!skipped.has("soreness") && state.soreness !== null) {
      emissions.push(
        emit("behavioral.soreness", {
          score: state.soreness,
          regions: state.sorenessRegions,
        }),
      );
    }
    if (
      !skipped.has("sleepHours") &&
      state.sleepHours !== null &&
      state.sleepQuality !== null
    ) {
      emissions.push(
        emit("behavioral.sleep", {
          hours: state.sleepHours,
          quality: state.sleepQuality,
        }),
      );
    }
    if (!skipped.has("stress") && state.stress !== null) {
      emissions.push(emit("behavioral.stress", { score: state.stress }));
    }
    if (!skipped.has("hydration") && state.hydration) {
      emissions.push(emit("behavioral.hydration", { level: state.hydration }));
    }
    if (!skipped.has("planModules") && state.planModules.length > 0) {
      emissions.push(
        emit("athlete.plan.today", {
          modules: state.planModules,
          lifting_intensity: state.liftingIntensity,
          volume: state.volume,
        }),
      );
    }
    // Always emit a summary so Hammer can transparently see what was skipped
    emissions.push(
      emit("behavioral.checkin", {
        note: state.note.trim(),
        fields_logged: fieldsLogged,
        skipped: Array.from(skipped),
        group_id: groupId,
      }),
    );

    try {
      const results = (await Promise.all(emissions)) as Array<{ ok: boolean; message?: string }>;
      const failed = results.filter((r) => r && r.ok === false);
      if (failed.length > 0) {
        console.error("[check-in] some emissions failed", failed);
        toast.error("Could not save check-in", {
          description: "Some signals didn't save. Try again.",
        });
        setSaving(false);
        return;
      }
      setSaved(true);
      toast.success("Check-in saved", {
        description: "Coach Hammer is recalculating.",
      });
      // Refresh Hammer + command rows (correct query keys)
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["asb-command-rows"] }),
        qc.invalidateQueries({ queryKey: ["coach-hammer-next-step"] }),
        qc.invalidateQueries({ queryKey: ["escalation-feed"] }),
      ]);
      setTimeout(close, 900);
    } catch (e) {
      console.error("[check-in] emit failed", e);
      toast.error("Could not save check-in", {
        description: "Try again in a moment.",
      });
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-2xl"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="text-base font-bold">
            Quick Check-In
          </SheetTitle>
          <SheetDescription className="text-xs">
            ~60 seconds · skip anything you don't want to log
          </SheetDescription>
        </SheetHeader>

        {/* Progress dots */}
        <div
          className="mt-3 flex items-center justify-center gap-1.5"
          aria-label={`Step ${step + 1} of ${TOTAL_STEPS}`}
        >
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === step
                  ? "w-6 bg-primary"
                  : i < step
                    ? "w-1.5 bg-primary/60"
                    : "w-1.5 bg-muted",
              )}
            />
          ))}
        </div>

        <div className="mt-5 min-h-[260px] pb-2">
          {saved ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="mt-3 font-semibold">Sent to Hammer</p>
              <p className="text-xs text-muted-foreground">
                Recalculating your next step…
              </p>
            </div>
          ) : (
            <>
              {step === 0 && (
                <ScaleStep
                  question="How ready do you feel today?"
                  hint="Overall readiness to train"
                  lowLabel="Empty"
                  highLabel="Loaded"
                  value={state.readiness ?? 6}
                  onChange={(v) => setState({ ...state, readiness: v })}
                />
              )}
              {step === 1 && (
                <ScaleStep
                  question="How fatigued are you right now?"
                  hint="Body + mind combined"
                  lowLabel="Fresh"
                  highLabel="Cooked"
                  value={state.fatigue ?? 4}
                  onChange={(v) => setState({ ...state, fatigue: v })}
                />
              )}
              {step === 2 && (
                <div className="space-y-5">
                  <ScaleStep
                    question="Muscle soreness?"
                    lowLabel="None"
                    highLabel="Severe"
                    value={state.soreness ?? 3}
                    onChange={(v) => setState({ ...state, soreness: v })}
                  />
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Where? (tap any)
                    </Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {SORENESS_REGIONS.map((r) => {
                        const active = state.sorenessRegions.includes(r);
                        return (
                          <Badge
                            key={r}
                            variant={active ? "default" : "outline"}
                            className="cursor-pointer min-h-9 px-3 py-1.5 capitalize text-sm"
                            onClick={() => {
                              setState((s) => {
                                if (r === "none") {
                                  return {
                                    ...s,
                                    sorenessRegions: active ? [] : ["none"],
                                  };
                                }
                                const without = s.sorenessRegions.filter(
                                  (x) => x !== "none",
                                );
                                return {
                                  ...s,
                                  sorenessRegions: active
                                    ? without.filter((x) => x !== r)
                                    : [...without, r],
                                };
                              });
                            }}
                          >
                            {r}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <Label className="font-semibold">Sleep last night</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Hours: <span className="font-bold text-foreground">{state.sleepHours ?? 7}h</span>
                    </p>
                    <Slider
                      className="mt-3"
                      min={0}
                      max={12}
                      step={0.5}
                      value={[state.sleepHours ?? 7]}
                      onValueChange={([v]) =>
                        setState({ ...state, sleepHours: v })
                      }
                    />
                  </div>
                  <ScaleStep
                    question="Sleep quality"
                    lowLabel="Awful"
                    highLabel="Deep"
                    value={state.sleepQuality ?? 7}
                    onChange={(v) => setState({ ...state, sleepQuality: v })}
                  />
                </div>
              )}
              {step === 4 && (
                <div className="space-y-5">
                  <ScaleStep
                    question="Stress / mental load"
                    lowLabel="Calm"
                    highLabel="Maxed"
                    value={state.stress ?? 4}
                    onChange={(v) => setState({ ...state, stress: v })}
                  />
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Hydration today
                    </Label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {(["low", "ok", "good"] as Hydration[]).map((h) => (
                        <Button
                          key={h}
                          type="button"
                          variant={state.hydration === h ? "default" : "outline"}
                          className="min-h-11 capitalize"
                          onClick={() => setState({ ...state, hydration: h })}
                        >
                          {h}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {step === 5 && (
                <div className="space-y-5">
                  <div>
                    <Label className="font-semibold">
                      What's on deck today?
                    </Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Tap all that apply
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {PLAN_MODULES.map((m) => {
                        const active = state.planModules.includes(m.id);
                        return (
                          <Badge
                            key={m.id}
                            variant={active ? "default" : "outline"}
                            className="cursor-pointer min-h-9 px-3 py-1.5 text-sm"
                            onClick={() =>
                              setState((s) => ({
                                ...s,
                                planModules: active
                                  ? s.planModules.filter((x) => x !== m.id)
                                  : [...s.planModules, m.id],
                              }))
                            }
                          >
                            {m.label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  {state.planModules.includes("lifting") && (
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Lifting intensity
                      </Label>
                      <div className="mt-2 grid grid-cols-4 gap-1.5">
                        {(["light", "moderate", "heavy", "max"] as LiftingIntensity[]).map(
                          (i) => (
                            <Button
                              key={i}
                              type="button"
                              size="sm"
                              variant={
                                state.liftingIntensity === i
                                  ? "default"
                                  : "outline"
                              }
                              className="min-h-10 capitalize text-xs"
                              onClick={() =>
                                setState({ ...state, liftingIntensity: i })
                              }
                            >
                              {i}
                            </Button>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                  {(state.planModules.includes("throwing") ||
                    state.planModules.includes("hitting")) && (
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Planned volume
                      </Label>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {(["low", "normal", "high"] as Volume[]).map((v) => (
                          <Button
                            key={v}
                            type="button"
                            variant={state.volume === v ? "default" : "outline"}
                            className="min-h-11 capitalize"
                            onClick={() => setState({ ...state, volume: v })}
                          >
                            {v}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {step === 6 && (
                <div className="space-y-2">
                  <Label htmlFor="flag" className="font-semibold">
                    Anything to flag for Hammer?
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Optional · e.g. "tight hamstring", "bullpen tomorrow",
                    "didn't eat enough"
                  </p>
                  <Textarea
                    id="flag"
                    value={state.note}
                    onChange={(e) =>
                      setState({ ...state, note: e.target.value.slice(0, 240) })
                    }
                    placeholder="Type a quick note…"
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-right text-[10px] text-muted-foreground">
                    {state.note.length}/240
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {!saved && (
          <div className="mt-2 flex items-center justify-between gap-2 border-t pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={step === 0 ? close : handleBack}
              disabled={saving}
            >
              {step === 0 ? "Cancel" : "Back"}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                disabled={saving || step === TOTAL_STEPS - 1}
                className="text-muted-foreground"
              >
                Skip
              </Button>
              {step < TOTAL_STEPS - 1 ? (
                <Button size="sm" onClick={handleNext} disabled={saving}>
                  Next
                </Button>
              ) : (
                <Button size="sm" onClick={handleSubmit} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "Send to Hammer"
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ScaleStep({
  question,
  hint,
  lowLabel,
  highLabel,
  value,
  onChange,
}: {
  question: string;
  hint?: string;
  lowLabel: string;
  highLabel: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <Label className="font-semibold">{question}</Label>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
      <div className="mt-4 flex items-baseline justify-center gap-2">
        <span className="text-4xl font-black tracking-tight text-primary">
          {value}
        </span>
        <span className="text-sm text-muted-foreground">/ 10</span>
      </div>
      <Slider
        className="mt-4"
        min={1}
        max={10}
        step={1}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      />
      <div className="mt-2 flex justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}
