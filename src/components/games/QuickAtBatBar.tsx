/**
 * QuickAtBatBar — one-tap at-bat entry for live, in-dugout logging.
 *
 * Logging during a game has to survive one thumb and eight seconds. This bar
 * captures the only two things that must be true at the moment of the rep:
 * the inning and the result. Everything else (pitch type, contact quality,
 * direction, velo, notes) is progressive disclosure — add it later from the
 * at-bat row, or never.
 *
 * Detail is optional; the rep is not.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Minus, Plus, SlidersHorizontal } from "lucide-react";

const QUICK_RESULTS: ReadonlyArray<{ code: string; label: string; tone: string }> = [
  { code: "1B", label: "1B · Single", tone: "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" },
  { code: "2B", label: "2B · Double", tone: "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300" },
  { code: "3B", label: "3B · Triple", tone: "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300" },
  { code: "HR", label: "HR · Home run", tone: "bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-300" },
  { code: "BB", label: "BB · Walk", tone: "bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300" },
  { code: "HBP", label: "HBP · Hit by pitch", tone: "bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300" },
  { code: "K_swinging", label: "K · Struck out swinging", tone: "bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300" },
  { code: "K_looking", label: "K · Struck out looking", tone: "bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300" },
  { code: "GO", label: "GO · Ground out", tone: "bg-muted hover:bg-muted/70" },
  { code: "FO", label: "FO · Fly out", tone: "bg-muted hover:bg-muted/70" },
  { code: "LO", label: "LO · Line out", tone: "bg-muted hover:bg-muted/70" },
  { code: "E", label: "E · Reached on an error", tone: "bg-muted hover:bg-muted/70" },
];

export function QuickAtBatBar({
  onQuickSave,
  onOpenFullForm,
  submitting,
}: {
  onQuickSave: (row: Record<string, any>) => void;
  onOpenFullForm: () => void;
  submitting?: boolean;
}) {
  const [inning, setInning] = useState(1);

  return (
    <Card className="p-3 space-y-2.5 border-primary/30">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Log an at-bat
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-7 w-7"
              aria-label="Previous inning"
              onClick={() => setInning((i) => Math.max(1, i - 1))}
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="min-w-[5.5rem] text-center text-sm font-mono font-semibold">
              Inning {inning}
            </span>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-7 w-7"
              aria-label="Next inning"
              onClick={() => setInning((i) => Math.min(30, i + 1))}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={onOpenFullForm} className="gap-1.5">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Open full form (optional)
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {QUICK_RESULTS.map((r) => (
          <Button
            key={r.code}
            type="button"
            size="sm"
            variant="ghost"
            disabled={submitting}
            onClick={() => onQuickSave({ inning, result: r.code })}
            className={`h-auto min-h-[3rem] whitespace-normal py-1.5 text-[11px] font-semibold leading-tight ${r.tone}`}
          >
            {r.label}
          </Button>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Pick the inning, then tap what happened — that's a complete at-bat, saved. Pitch
        type, how well you hit it and everything else are optional and can be added later
        from the at-bat, or left out entirely.
      </p>
    </Card>
  );
}
