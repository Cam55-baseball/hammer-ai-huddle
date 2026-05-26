import { RuntimeCard } from "@/components/runtime/RuntimeCard";

export function ReadinessExplainer() {
  return (
    <RuntimeCard title="How readiness is built" eyebrow="Explainer">
      <p className="text-sm text-muted-foreground">
        Readiness is a deterministic fold over your logged events — never a guess.
        Missing signal stays visible as unknown, not filled in.
      </p>
    </RuntimeCard>
  );
}
