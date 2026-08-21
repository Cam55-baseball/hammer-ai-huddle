/**
 * LiftSwapSheet — athlete-facing substitution picker for a single lift.
 *
 * Options come strictly from the generator-certified substitution ladder
 * stored on the prescription row, filtered to the same movement category.
 * Choosing one rewrites that row in place (see `useLiftSubstitution`).
 */
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Repeat2 } from "lucide-react";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";
import {
  useSwapLadder,
  useSwapOptions,
  useLiftSubstitution,
  projectedDose,
  describeDose,
  SWAP_REASON_LABEL,
  SWAP_REASON_ORDER,
  type SwapReason,
  type SwapCandidate,
} from "@/hooks/useLiftSubstitution";

interface Props {
  rx: WkRx;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LiftSwapSheet({ rx, open, onOpenChange }: Props) {
  const { ladder, options, isLoading } = useSwapLadder(rx, open);
  const { apply } = useLiftSubstitution(rx.plan_date);

  const seen = new Set<string>();
  const groups = SWAP_REASON_ORDER.map((reason) => {
    const slugs = (ladder[reason] ?? []).filter((s) => {
      if (!options[s] || s === rx.movement_slug || seen.has(s)) return false;
      seen.add(s);
      return true;
    });
    return { reason, candidates: slugs.map((s) => options[s]) };
  }).filter((g) => g.candidates.length > 0);


  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="text-base">Swap {rx.movement_name}</SheetTitle>
          <SheetDescription className="text-xs">
            These are the only legal replacements Hammer certified for this slot today. Your dose carries over.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-3 space-y-4 pb-6">
          {isLoading ? (
            <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading legal swaps…
            </div>
          ) : groups.length === 0 ? (
            <p className="py-6 text-xs text-muted-foreground">
              No legal swap exists for this movement today. Ask Hammer on the card if you need a different option.
            </p>
          ) : (
            groups.map((g) => (
              <div key={g.reason} className="space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {SWAP_REASON_LABEL[g.reason]}
                </div>
                {g.candidates.map((c) => (
                  <SwapRow
                    key={`${g.reason}-${c.slug}`}
                    rx={rx}
                    candidate={c}
                    reason={g.reason}
                    pending={apply.isPending}
                    onPick={async () => {
                      await apply.mutateAsync({ rx, candidate: c, reason: g.reason });
                      onOpenChange(false);
                    }}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SwapRow({
  rx,
  candidate,
  reason,
  pending,
  onPick,
}: {
  rx: WkRx;
  candidate: SwapCandidate;
  reason: SwapReason;
  pending: boolean;
  onPick: () => void;
}) {
  const dose = describeDose(projectedDose(rx, candidate, reason));
  const equipment = (candidate.equipment_requirements ?? []).filter(Boolean);
  const perSide = matchesUnilateralSlug(candidate.slug);
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={pending}
      className="w-full rounded-md border p-2.5 text-left hover:border-primary/40 hover:bg-muted/40 transition-colors disabled:opacity-60"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium break-words">{candidate.name}</span>
        <Repeat2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">
        {dose}
        {perSide ? " · per side" : ""}
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {candidate.movement_category && (
          <Badge variant="outline" className="text-[10px]">
            Same slot: {candidate.movement_category.replace(/_/g, " ")}
          </Badge>
        )}
        {perSide && (
          <Badge variant="outline" className="text-[10px]">Logs left / right</Badge>
        )}
        {equipment.length > 0 && (
          <Badge variant="outline" className="text-[10px]">Needs: {equipment.join(", ")}</Badge>
        )}
        {equipment.length === 0 && (
          <Badge variant="outline" className="text-[10px]">No equipment needed</Badge>
        )}
      </div>
    </button>
  );
}


/** Compact "Swapped from X · Undo" chip shown on a substituted row. */
export function LiftSwapUndoChip({ rx }: { rx: WkRx }) {
  const options = useSwapOptions(rx, true);
  const { undo } = useLiftSubstitution(rx.plan_date);
  const original = rx.substituted_from_slug ? options.data?.[rx.substituted_from_slug] : null;
  const fromName =
    (rx.why_payload as Record<string, any> | null)?.athlete_substitution?.from_name ??
    original?.name ??
    rx.substituted_from_slug;
  if (!rx.substituted_from_slug) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
      <Badge variant="outline" className="text-[10px] gap-1">
        <Repeat2 className="h-3 w-3" /> Swapped from {fromName}
      </Badge>
      {original && (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-[11px]"
          disabled={undo.isPending}
          onClick={() => undo.mutate({ rx, original })}
        >
          {undo.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Undo"}
        </Button>
      )}
    </div>
  );
}
