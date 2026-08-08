/**
 * WkBatSpeedCard — Phase 3 canonical single-responsibility card.
 * Rotational velocity ONLY. Never merges running speed or lifts.
 * Placed BEFORE lifts so bat-speed exposure happens while CNS is fresh.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, RefreshCw, Bolt, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useHammersToday } from "@/components/hammer/HammersTodayProvider";
import { WkPrescriptionCard } from "@/components/hammer/WkPrescriptionCard";
import { CardMeta } from "@/components/hammer/cards/CardMeta";
import { CardActions } from "@/components/hammer/cards/CardActions";
import { getCard } from "@/lib/wic/cardRegistry";
import { useCanonicalPhaseDisplay } from "@/hooks/useCanonicalPhaseDisplay";
import { WkCardFailureNotice } from "@/components/hammer/WkCardFailureNotice";
import { WkCardCompletion } from "@/components/hammer/WkCardCompletion";
import { WkSessionShapeLine } from "@/components/hammer/WkProgressionNote";

interface Props {
  /** For switch hitters, render this card twice — once per side. */
  readonly side?: "L" | "R" | null;
}

export function WkBatSpeedCard({ side = null }: Props = {}) {
  const { grouped, generate, generating, isLoading, failed, failureReason, retry, snapshotIdentity, dayKind } = useHammersToday();
  const entry = getCard("bat_speed")!;
  const items = grouped.batSpeedCard;
  const isGameDay = dayKind === "game" || dayKind === "both";
  const { display: label } = useCanonicalPhaseDisplay(
    snapshotIdentity.season_display,
    snapshotIdentity.season_phase,
  );

  const sideLabel = side === "L" ? "Left-handed" : side === "R" ? "Right-handed" : null;

  const [open, setOpen] = useState<boolean>(false);

  return (
    <Card
      className="border-fuchsia-500/30"
      data-card-type={entry.cardType}
      data-display-order={entry.displayOrder}
      data-generation-id={snapshotIdentity.generation_id ?? ""}
      data-side={side ?? ""}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex flex-wrap items-center justify-between gap-2">
            <CollapsibleTrigger asChild>
              <button type="button" className="flex items-center gap-2 min-w-0 text-left flex-1" aria-expanded={open}>
                <Bolt className="h-4 w-4 text-fuchsia-500 shrink-0" />
                <span className="truncate">Bat Speed{sideLabel ? ` — ${sideLabel}` : ""}</span>
                {sideLabel && (
                  <Badge variant="outline" className="text-[10px] border-primary/50 text-primary">
                    {side}
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px]">
                  {isGameDay ? "Game day · light" : "Warm and ready"}
                </Badge>
                <ChevronDown className={`h-4 w-4 ml-auto text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={() => generate()} disabled={generating}>
              {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            </Button>
          </CardTitle>
          {label && <div className="text-[11px] text-muted-foreground line-clamp-2">{label}</div>}
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-2">
            {failed ? (
              <WkCardFailureNotice engine="bat_speed" failure={failureReason} retry={retry} retrying={generating} />
            ) : isLoading || generating ? (
              <Skeleton className="h-14 w-full rounded" />
            ) : items.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No rotational velocity work today (cadence rest).</p>
            ) : (
              items.map((rx) => <WkPrescriptionCard key={rx.id} rx={rx} phaseDisplay={label} phaseKey={snapshotIdentity.season_phase} side={side} />)
            )}
            {items.length > 0 && (
              <WkSessionShapeLine
                title={(items[0]?.why_payload as any)?.session_title ?? null}
                shape={(items[0]?.why_payload as any)?.session_shape ?? null}
              />
            )}
            <CardMeta entry={entry} generationId={snapshotIdentity.generation_id} />
            {items.length > 0 && (
              <WkCardCompletion
                modality="bat_speed"
                modalityLabel={sideLabel ? `Bat Speed (${sideLabel})` : "Bat Speed"}
                items={items}
                side={side}
              />
            )}
            {items.length > 0 && <CardActions modality="bat_speed" items={items} phaseDisplay={label} />}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
