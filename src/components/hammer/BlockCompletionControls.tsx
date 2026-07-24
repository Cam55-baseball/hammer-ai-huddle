/**
 * BlockCompletionControls — Done / Skip affordance per daily block.
 *
 * Persists local engagement state (drives Daily Intent + adaptive re-plan) and
 * bulk-syncs every drill task in the card to `hammer_daily_task_completions`
 * so per-drill checkboxes stay in lockstep with the card-level control.
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
  type EngagementKey,
} from "@/lib/hammer/prescription/dailyEngagement";
import {
  useHammerDailyTasks,
  makeBlockTaskId,
  type TaskSeed,
} from "@/hooks/useHammerDailyTasks";

interface DrillLike {
  readonly name: string;
  readonly slug?: string | null;
  readonly dosage?: string;
}

interface Props {
  readonly modality: EngagementKey;
  readonly modalityLabel: string;
  readonly onChanged: () => void;
  readonly drills?: ReadonlyArray<DrillLike>;
  readonly planDate?: string;
}

export function BlockCompletionControls({
  modality,
  modalityLabel,
  onChanged,
  drills,
  planDate,
}: Props) {
  const { user } = useAuth();
  const [current, setCurrent] = useState<CompletionState | null>(() =>
    todayCompletion(loadEngagement(user?.id), modality),
  );
  const date = planDate ?? new Date().toISOString().slice(0, 10);
  const tasks = useHammerDailyTasks(date);
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
    // Bulk-sync every drill task in this card so checkboxes reflect the
    // card-level Done/Skip in real time (bidirectional sync).
    if (drills && drills.length > 0) {
      const seeds: TaskSeed[] = drills.map((d) => ({
        taskId: makeBlockTaskId(String(modality), d.slug ?? d.name),
        source: "block_drill",
        sourceRef: String(modality),
        payload: { name: d.name, dosage: d.dosage ?? null, slug: d.slug ?? null },
      }));
      void tasks.bulkSet(seeds, status === "done");
    }
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
