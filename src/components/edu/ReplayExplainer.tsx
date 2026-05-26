import { RuntimeCard } from "@/components/runtime/RuntimeCard";

export function ReplayExplainer() {
  return (
    <RuntimeCard title="Why replay matters" eyebrow="Explainer">
      <p className="text-sm text-muted-foreground">
        Every screen you see can be rebuilt from the append-only event log.
        The same inputs always produce the same output — that is replay determinism.
      </p>
    </RuntimeCard>
  );
}
