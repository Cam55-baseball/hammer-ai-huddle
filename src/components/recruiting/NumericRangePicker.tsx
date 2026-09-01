/**
 * Paired min/max dropdowns for a numeric standard field.
 *
 * Two selects with a dash between them. Pick just a floor, just a ceiling, the
 * same value on both sides (an exact requirement), or a real range. Nothing is
 * typed, so a scout can never enter a value the matcher cannot read.
 */
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { RangeOptions } from "@/lib/recruiting/numericRanges";
import { isInvertedRange } from "@/lib/recruiting/numericRanges";

const ANY = "__any__";

export function NumericRangePicker({
  label,
  options,
  min,
  max,
  onMinChange,
  onMaxChange,
  idPrefix,
  className,
}: {
  label: string;
  options: RangeOptions;
  min: number | null;
  max: number | null;
  onMinChange: (v: number | null) => void;
  onMaxChange: (v: number | null) => void;
  idPrefix: string;
  className?: string;
}) {
  const inverted = isInvertedRange(min, max);

  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <Select
          value={min === null ? ANY : String(min)}
          onValueChange={(v) => onMinChange(v === ANY ? null : Number(v))}
        >
          <SelectTrigger
            className="bg-background"
            aria-label={`${label} minimum`}
            id={`${idPrefix}-min`}
          >
            <SelectValue placeholder="No minimum" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value={ANY}>No minimum</SelectItem>
            {options.min.map((o) => (
              <SelectItem key={`min-${o.value}`} value={String(o.value)}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span aria-hidden className="shrink-0 text-sm text-muted-foreground">
          –
        </span>

        <Select
          value={max === null ? ANY : String(max)}
          onValueChange={(v) => onMaxChange(v === ANY ? null : Number(v))}
        >
          <SelectTrigger
            className="bg-background"
            aria-label={`${label} maximum`}
            id={`${idPrefix}-max`}
          >
            <SelectValue placeholder="No maximum" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value={ANY}>No maximum</SelectItem>
            {options.max.map((o) => (
              <SelectItem key={`max-${o.value}`} value={String(o.value)}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className={cn("text-xs", inverted ? "text-destructive" : "text-muted-foreground")}>
        {inverted
          ? "The minimum is above the maximum — nothing could ever match that."
          : options.hint}
      </p>
    </div>
  );
}
