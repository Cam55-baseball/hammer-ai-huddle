import { RuntimeCard } from "@/components/runtime/RuntimeCard";

export function SurvivabilityPrimer({ acknowledged, onAck }: { acknowledged: boolean; onAck: () => void }) {
  return (
    <RuntimeCard title="Survivability comes first" eyebrow="Required primer">
      <p className="text-sm text-muted-foreground">
        When signal says rest, the system caps your session. This is not punishment —
        it is how long careers are built.
      </p>
      {!acknowledged ? (
        <button
          onClick={onAck}
          className="mt-3 rounded-md border border-border px-3 py-1.5 text-sm"
        >
          I understand
        </button>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">Acknowledged.</p>
      )}
    </RuntimeCard>
  );
}
