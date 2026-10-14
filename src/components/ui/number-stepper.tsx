import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { cleanNumberText } from "@/lib/numberInput";

/** − / + stepper with typing. Never shows leading zeros; an emptied box stays empty while typing. */
export function NumberStepper({
  value, onChange, min = 0, max = 999, step = 1, label, id, className,
}: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
  label: string; id?: string; className?: string;
}) {
  const [text, setText] = React.useState(String(value));
  React.useEffect(() => { if (text === "" ? value !== min : Number(text) !== value) setText(String(value)); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const set = (n: number) => { const v = clamp(n); setText(String(v)); onChange(v); };
  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <Button type="button" variant="outline" size="icon" className="h-10 w-10" aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => set(value - step)}><Minus className="h-4 w-4" /></Button>
      <input
        id={id} aria-label={label} inputMode="numeric" pattern="[0-9]*" value={text}
        onChange={(e) => {
          const t = cleanNumberText(e.target.value);
          setText(t);
          if (t !== "") onChange(clamp(Number(t)));
        }}
        onBlur={() => set(text === "" ? min : Number(text))}
        onFocus={(e) => e.currentTarget.select()}
        className="h-10 w-14 rounded-md border border-input bg-background text-center text-base"
      />
      <Button type="button" variant="outline" size="icon" className="h-10 w-10" aria-label={`More ${label}`} disabled={value >= max} onClick={() => set(value + step)}><Plus className="h-4 w-4" /></Button>
    </div>
  );
}
