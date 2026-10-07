import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { RuntimeCard } from "./RuntimeCard";
import { StateBadge } from "./StateBadge";
import { TrustFooter } from "./TrustFooter";
import type { DailyPrescription } from "@/lib/runtime/prescription";

export function PrescriptionCard({
  rx,
  prescriptionEventId,
  onRequestChange,
}: {
  rx: DailyPrescription;
  prescriptionEventId: string | null;
  onRequestChange: () => void;
}) {
  return (
    <RuntimeCard
      tone="elevated"
      eyebrow="Today's session"
      title={rx.headline}
      trailing={<StateBadge state={rx.state} />}
      footer={
        <TrustFooter
          confidence={rx.confidence}
          missingness={rx.missingness}
          sourceEventId={rx.sourceEventIds[0] ?? null}
          engineVersion={rx.engineVersion}
        />
      }
    >
      <ul className="mb-4 space-y-1.5 text-sm text-muted-foreground">
        {rx.rationale.map((r, i) => (
          <li key={i} className="leading-snug">
            · {r}
          </li>
        ))}
      </ul>
      {rx.blocks.length > 0 ? (
        <ol className="mb-4 space-y-1.5">
          {rx.blocks.map((b, i) => (
            <li
              key={b.id}
              className="flex items-baseline justify-between gap-3 border-l-2 border-border pl-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">
                  {i + 1}. {b.name}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {b.detail}
                </div>
              </div>
              <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                {b.cnsDemand}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mb-4 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          No blocks until organism signal is present. Log a check-in to unlock
          today's prescription.
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {rx.blocks.length > 0 && prescriptionEventId ? (
          <Button asChild size="lg" className="flex-1">
            <Link to={`/today/session/${prescriptionEventId}`}>
              Start session
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="lg"
          onClick={onRequestChange}
          className={rx.blocks.length > 0 ? "" : "flex-1"}
        >
          Request change
        </Button>
      </div>
    </RuntimeCard>
  );
}
