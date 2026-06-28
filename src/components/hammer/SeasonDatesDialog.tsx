/**
 * SeasonDatesDialog — edits the athlete's season window dates (pre/in/post)
 * on `athlete_mpi_settings`. Distinct from the AI schedule importer; this
 * dialog only adjusts phase start/end dates that drive `resolveSeasonPhase`.
 */
import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useSeasonStatus } from "@/hooks/useSeasonStatus";

type PhaseKey = "preseason" | "in_season" | "post_season";

const PHASES: Array<{ key: PhaseKey; label: string; startField: string; endField: string }> = [
  { key: "preseason", label: "Pre-season", startField: "preseason_start_date", endField: "preseason_end_date" },
  { key: "in_season", label: "In-season", startField: "in_season_start_date", endField: "in_season_end_date" },
  { key: "post_season", label: "Post-season", startField: "post_season_start_date", endField: "post_season_end_date" },
];

function toIso(d: Date | undefined): string | null {
  if (!d) return null;
  return format(d, "yyyy-MM-dd");
}

function fromIso(s: string | null | undefined): Date | undefined {
  if (!s) return undefined;
  try {
    return parseISO(s);
  } catch {
    return undefined;
  }
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SeasonDatesDialog({ open, onOpenChange }: Props) {
  const s = useSeasonStatus();
  const qc = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const initial = useMemo(
    () => ({
      preseason_start_date: s.preseasonStartDate,
      preseason_end_date: s.preseasonEndDate,
      in_season_start_date: s.inSeasonStartDate,
      in_season_end_date: s.inSeasonEndDate,
      post_season_start_date: s.postSeasonStartDate,
      post_season_end_date: s.postSeasonEndDate,
    }),
    [
      s.preseasonStartDate,
      s.preseasonEndDate,
      s.inSeasonStartDate,
      s.inSeasonEndDate,
      s.postSeasonStartDate,
      s.postSeasonEndDate,
    ],
  );

  const [draft, setDraft] = useState(initial);

  useEffect(() => {
    if (open) setDraft(initial);
  }, [open, initial]);

  const setField = (field: string, value: string | null) =>
    setDraft((d) => ({ ...d, [field]: value }));

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      s.updateSeasonStatus(draft as any);
      toast.success("Season dates updated");
      qc.invalidateQueries({ queryKey: ["game-day-context"] });
      qc.invalidateQueries({ queryKey: ["hammer-daily-plan"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save season dates");
    } finally {
      setIsUpdating(false);
    }
  };

  const renderDatePicker = (field: string, placeholder: string) => {
    const value = (draft as any)[field] as string | null;
    const date = fromIso(value);
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-full justify-start text-left font-normal h-9",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {date ? format(date, "MMM d, yyyy") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => setField(field, toIso(d))}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Season dates</DialogTitle>
          <DialogDescription>
            Set the start and end dates for each season phase. Hammer uses these to
            decide what work to schedule and when to taper.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {PHASES.map((phase) => {
            const hasAny =
              (draft as any)[phase.startField] || (draft as any)[phase.endField];
            return (
              <div key={phase.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {phase.label}
                  </Label>
                  {hasAny && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px] gap-1"
                      onClick={() => {
                        setField(phase.startField, null);
                        setField(phase.endField, null);
                      }}
                    >
                      <X className="h-3 w-3" />
                      Clear
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {renderDatePicker(phase.startField, "Start date")}
                  {renderDatePicker(phase.endField, "End date")}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isUpdating}>
            {isUpdating ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
