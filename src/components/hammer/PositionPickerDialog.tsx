/**
 * PositionPickerDialog — multi-select list of the positions an athlete also
 * plays. The primary position is excluded (it is already theirs) and every
 * code is shown with its plain-language name so a beginner never has to guess
 * what "CF" means.
 *
 * DH is offered here because plenty of athletes really do DH, but it is not a
 * defensive spot: the defense card excludes it from the swap row and says so.
 */
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

/** Canonical list used by the `position_secondary` knowledge gap. */
export const SECONDARY_POSITION_OPTIONS = [
  { code: "P", name: "Pitcher" },
  { code: "C", name: "Catcher" },
  { code: "1B", name: "First base" },
  { code: "2B", name: "Second base" },
  { code: "3B", name: "Third base" },
  { code: "SS", name: "Shortstop" },
  { code: "LF", name: "Left field" },
  { code: "CF", name: "Center field" },
  { code: "RF", name: "Right field" },
  { code: "DH", name: "Designated hitter" },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Excluded from the list — the athlete already plays it. */
  primary: string | null;
  /** Codes currently ticked. */
  selected: string[];
  onSave: (next: string[]) => Promise<void>;
}

export function PositionPickerDialog({ open, onOpenChange, primary, selected, onSave }: Props) {
  const [draft, setDraft] = useState<string[]>(selected);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setDraft(selected);
  }, [open, selected]);

  const options = SECONDARY_POSITION_OPTIONS.filter(
    (o) => o.code.toUpperCase() !== (primary ?? "").toUpperCase(),
  );

  const toggle = (code: string) =>
    setDraft((d) => (d.includes(code) ? d.filter((c) => c !== code) : [...d, code]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Positions you also play</DialogTitle>
          <DialogDescription>
            Tick everything you play besides{" "}
            {primary ? `your main spot (${primary})` : "your main spot"}. Your defense work uses
            these.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-1 overflow-y-auto pr-1">
          {options.map((o) => {
            const checked = draft.includes(o.code);
            return (
              <label
                key={o.code}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent"
              >
                <Checkbox checked={checked} onCheckedChange={() => toggle(o.code)} />
                <span>
                  <span className="font-medium">{o.code}</span>
                  <span className="text-muted-foreground"> — {o.name}</span>
                </span>
              </label>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(draft);
                onOpenChange(false);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Saving…" : "Save positions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
