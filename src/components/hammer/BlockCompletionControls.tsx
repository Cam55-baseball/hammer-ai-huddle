/**
 * BlockCompletionControls — Done / Skip affordance per daily block.
 *
 * Presentation-only. Persists the completion state via `dailyEngagement` and
 * calls `onChanged` so the parent can re-derive the intent header + adaptive
 * adjustments. Never mutates organism truth or the canonical ledger.
 *
 * Constitutional subordination: Eternal Laws · Megaphase 151–160 · RR-5 · RR-6.
 */
import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  loadEngagement,
  recordCompletion,
  todayCompletion,
  type CompletionState,
} from "@/lib/hammer/prescription/dailyEngagement";
import type { ModalityKey } from "@/lib/hammer/prescription/dailyPlan";

interface Props {
  readonly modality: ModalityKey;
  readonly modalityLabel: string;
  readonly onChanged: () => void;
}

export function BlockCompletionControls({ modality, modalityLabel, onChanged }: Props) {
  const { user } = useAuth();
  const [current, setCurrent] = useState<CompletionState | null>(() =>
    todayCompletion(loadEngagement(user?.id), modality),
  );
  const encouragement = useMemo(() => {
    const bank = [
      "That's a rep in the bank.",
      "Locked in — Hammer sees it.",
      "Foundation stone laid.",
      "Consistency compounds.",
      "One more brick in the wall.",
    ];
    return bank[Math.floor(Math.random() * bank.length)];
  }, []);

  function mark(status: CompletionState) {
    recordCompletion(user?.id, modality, status);
    setCurrent(status);
    onChanged();
    if (status === "done") {
      toast.success(`${modalityLabel} — done. ${encouragement}`);
    } else {
      toast(`${modalityLabel} skipped — Hammer will adjust the rest of today.`);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        size="sm"
        variant={current === "done" ? "default" : "outline"}
        onClick={() => mark("done")}
        className="h-7 text-[11px] gap-1"
        title="Mark this block done — feeds streaks + tomorrow's plan"
      >
        <Check className="h-3 w-3" />
        {current === "done" ? "Done" : "Mark done"}
      </Button>
      <Button
        size="sm"
        variant={current === "skipped" ? "secondary" : "ghost"}
        onClick={() => mark("skipped")}
        className="h-7 text-[11px] gap-1"
        title="Skip — Hammer trims remaining volume so today still finishes clean"
      >
        <X className="h-3 w-3" />
        {current === "skipped" ? "Skipped" : "Skip"}
      </Button>
    </div>
  );
}
