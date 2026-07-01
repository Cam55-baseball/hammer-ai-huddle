// src/components/hammer/cards/CardMeta.tsx — Phase 3 shared metadata footer.
// Renders structural metadata from the canonical card registry. Context
// message fields are declared but intentionally left unpopulated in this
// phase — later phases will fill them.
import { Badge } from "@/components/ui/badge";
import type { CardRegistryEntry } from "@/lib/wic/cardRegistry";

interface Props {
  entry: CardRegistryEntry;
  generationId: string | null;
}

export function CardMeta({ entry, generationId }: Props) {
  return (
    <div
      data-card-type={entry.cardType}
      data-display-order={entry.displayOrder}
      data-generation-id={generationId ?? ""}
      className="pt-2 mt-2 border-t border-border/40 text-[10px] text-muted-foreground flex flex-wrap items-center gap-1.5"
    >
      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
        {entry.cardType.replace(/_/g, " ")}
      </Badge>
      <span>{entry.responsibility}</span>
      {entry.estimatedDurationMin != null && <span>· ~{entry.estimatedDurationMin} min</span>}
      {entry.intensity && <span>· {entry.intensity}</span>}
      {entry.substitutionAvailable && <span>· subs available</span>}
    </div>
  );
}
