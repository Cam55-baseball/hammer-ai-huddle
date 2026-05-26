import type { OnboardingState } from "@/lib/runtime/projections/onboardingState";

export function ProgressiveDisclosureStepper({
  state, steps,
}: { state: OnboardingState; steps: { id: string; title: string }[] }) {
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => {
        const done = state.steps.includes(s.id);
        return (
          <li key={s.id} className="flex items-center gap-2 text-sm">
            <span className="font-mono text-xs text-muted-foreground">{i + 1}</span>
            <span className={done ? "text-muted-foreground line-through" : ""}>{s.title}</span>
          </li>
        );
      })}
    </ol>
  );
}
