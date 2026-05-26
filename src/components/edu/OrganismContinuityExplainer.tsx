import { RuntimeCard } from "@/components/runtime/RuntimeCard";

export function OrganismContinuityExplainer() {
  return (
    <RuntimeCard title="Longitudinal continuity" eyebrow="Explainer">
      <p className="text-sm text-muted-foreground">
        Your organism is one continuous story. We never overwrite history —
        we add to it. Today's prescription is rooted in everything before it.
      </p>
    </RuntimeCard>
  );
}
