import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export type ThrowingHandValue = 'L' | 'R' | 'S';

interface ThrowingHandSelectorProps {
  value?: ThrowingHandValue;
  onValueChange: (val: ThrowingHandValue) => void;
  /** Show the "Both" (switch/ambidextrous) option. Defaults to true. */
  allowBoth?: boolean;
  label?: string;
}

export function ThrowingHandSelector({
  value,
  onValueChange,
  allowBoth = true,
  label = 'Throwing Hand',
}: ThrowingHandSelectorProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={v => v && onValueChange(v as ThrowingHandValue)}
      >
        <ToggleGroupItem value="L" variant="outline" size="sm">Left</ToggleGroupItem>
        <ToggleGroupItem value="R" variant="outline" size="sm">Right</ToggleGroupItem>
        {allowBoth && (
          <ToggleGroupItem value="S" variant="outline" size="sm">Both</ToggleGroupItem>
        )}
      </ToggleGroup>
    </div>
  );
}
