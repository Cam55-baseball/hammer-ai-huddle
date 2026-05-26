import { RuntimeCard } from "@/components/runtime/RuntimeCard";

export function ConfidenceExplainer({ confidence }: { confidence: number | null }) {
  return (
    <RuntimeCard title="What confidence means" eyebrow="Explainer">
      <p className="text-sm text-muted-foreground">
        Confidence is the tightest signal we can vouch for — never inflated, never invented.
        When inputs are sparse, it drops. It cannot rise above its sources.
      </p>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted-foreground">More detail</summary>
        <p className="mt-2">
          Current ceiling: <span className="font-mono">{confidence ?? "—"}</span>. Every
          modulator can only tighten this number; none can raise it.
        </p>
      </details>
    </RuntimeCard>
  );
}
