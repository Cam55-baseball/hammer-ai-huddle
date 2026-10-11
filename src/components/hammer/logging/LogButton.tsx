import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ClipboardEdit, CheckCircle2 } from "lucide-react";
import { ExerciseLogSheet } from "./ExerciseLogSheet";
import { useLatestExerciseLog } from "@/hooks/useExerciseLog";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";

interface Props {
  rx: WkRx;
  dosageText: string;
  compact?: boolean;
  survey?: boolean;
}

export function LogButton({ rx, dosageText, compact, survey = false }: Props) {
  const [open, setOpen] = useState(false);
  const { data: latest } = useLatestExerciseLog(rx.id, rx.movement_slug);
  const hasLog = !!latest;

  return (
    <>
      <Button
        type="button"
        variant={hasLog ? "secondary" : "outline"}
        size="sm"
        className={`gap-1 ${compact ? "h-7 px-2 text-[11px]" : "h-8 text-xs"}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={survey ? "Survey (optional)" : hasLog ? `Edit log for ${rx.movement_name}` : `Log ${rx.movement_name}`}
      >
        {hasLog ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <ClipboardEdit className="h-3.5 w-3.5" />}
        {survey ? "Survey (optional)" : hasLog ? "Logged" : "Log"}
      </Button>
      {open && <ExerciseLogSheet open={open} onOpenChange={setOpen} rx={rx} dosageText={dosageText} />}
    </>
  );
}
