/**
 * BlockCompletionControls — Done / Skip affordance per daily block.
 *
 * Persists local engagement state (drives Daily Intent + adaptive re-plan) and
 * bulk-syncs every drill task in the card to `hammer_daily_task_completions`
 * so per-drill checkboxes stay in lockstep with the card-level control.
 *
 * Constitutional subordination: Eternal Laws · Megaphase 151–160 · RR-5 · RR-6.
 */
import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSportTheme } from '@/contexts/SportThemeContext';
import { drillTaskPayload, type DrillLineage } from '@/lib/hammer/drillTaskPayload';
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
import { removeCardFromHealth, saveCardToHealth } from "@/lib/native/healthCards";

type DrillLike = DrillLineage;

interface Props {
  readonly modality: EngagementKey;
  readonly modalityLabel: string;
  readonly onChanged: () => void;
  readonly drills?: ReadonlyArray<DrillLike>;
  readonly planDate?: string;
  readonly side?: "L" | "R" | null;
}

export function BlockCompletionControls({
  modality,
  modalityLabel,
  onChanged,
  drills,
  planDate,
  side = null,
}: Props) {
  const { user } = useAuth();
  const { sport } = useSportTheme();
  const [current, setCurrent] = useState<CompletionState | null>(() =>
    todayCompletion(loadEngagement(user?.id), modality, side),
  );
  const [saving, setSaving] = useState(false);
  const date = planDate ?? new Date().toISOString().slice(0, 10);
  const tasks = useHammerDailyTasks(date);
  // Owner Nov 1 A9: a block whose every drill has been logged reads as done.
  const allLogged = !!drills && drills.length > 0 && drills.every((d) => tasks.isDone(makeBlockTaskId(String(modality), d.slug ?? d.name), side));
  const shown = current ?? (allLogged ? "done" : null);
  // Release A3 (iPhone + healthkit_write_v1 + the player's Settings switch only): silent, no UI.
  const taskKeys = (drills ?? []).map((d) => makeBlockTaskId(String(modality), d.slug ?? d.name));
  const healthRef = {
    userId: user?.id, planDate: date, kind: String(modality), sport,
    card: { type: "block" as const, modality: String(modality), side, keys: taskKeys },
  };
  const healthKey = `${user?.id}|${date}|${modality}|${side}|${taskKeys.join(",")}`;
  useEffect(() => { if (allLogged) void saveCardToHealth(healthRef); }, [allLogged, healthKey]); // eslint-disable-line react-hooks/exhaustive-deps
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

  async function mark(status: CompletionState) {
    if (saving) return;
    // A card with nothing prescribed can't be completed — marking it done
    // would record work that never existed.
    if (drills && drills.length === 0) {
      toast("Nothing is prescribed here yet, so there's nothing to mark done.");
      return;
    }
    // Bulk-sync every drill task in this card so checkboxes reflect the
    // card-level Done/Skip in real time (bidirectional sync).
    setSaving(true);
    try {
    if (drills && drills.length > 0) {
      const seeds: TaskSeed[] = drills.map((d) => ({
        taskId: makeBlockTaskId(String(modality), d.slug ?? d.name),
        source: "block_drill",
        sourceRef: String(modality),
        side,
        payload: drillTaskPayload(d, sport === 'softball' ? 'softball' : 'baseball', String(modality), side),
      }));
      await tasks.bulkSet(seeds, status === "done");
    }
    recordCompletion(user?.id, modality, status, side);
    setCurrent(status);
    onChanged();
    if (status === "done") void saveCardToHealth(healthRef);
    else void removeCardFromHealth(healthRef);
    if (status === "done") {
      toast.success(`${modalityLabel} — done. ${encouragement}`);
    } else {
      toast(`${modalityLabel} skipped — Hammer will adjust the rest of today.`);
    }
    } catch {
      toast.error("Couldn't save this block — try again.");
    } finally { setSaving(false); }
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        size="sm"
        variant={shown === "done" ? "default" : "outline"}
        onClick={() => mark("done")}
        disabled={saving}
        className="h-7 text-[11px] gap-1"
        title="Mark this block done — feeds streaks + tomorrow's plan"
      >
        <Check className="h-3 w-3" />
        {shown === "done" ? "Done" : "Mark done"}
      </Button>
      <Button
        size="sm"
        variant={current === "skipped" ? "secondary" : "ghost"}
        onClick={() => mark("skipped")}
        disabled={saving}
        className="h-7 text-[11px] gap-1"
        title="Skip — Hammer trims remaining volume so today still finishes clean"
      >
        <X className="h-3 w-3" />
        {current === "skipped" ? "Skipped" : "Skip"}
      </Button>
    </div>
  );
}
