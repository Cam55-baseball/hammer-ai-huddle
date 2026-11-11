import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PRACTICE_LENGTH_PICKS,
  PRACTICE_LENGTH_QUESTION,
  practiceLengthMessage,
  practiceLengthProblem,
} from "@/lib/practice/practiceLength";

/**
 * Required "How long is practice?" field: quick picks plus a typed value in minutes.
 * `showErrors` turns on the required message (the impossible-number note shows as soon as typed).
 */
export function PracticeLengthField({
  value,
  onChange,
  showErrors = false,
  id = "practice-length",
  onFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  showErrors?: boolean;
  id?: string;
  onFocus?: () => void;
}) {
  const problem = practiceLengthProblem(value);
  const visible = problem === "impossible" || (showErrors && problem === "required") ? practiceLengthMessage(problem) : null;
  return (
    <div className="space-y-1.5" data-testid="practice-length-field">
      <Label htmlFor={id} className="text-xs">
        {PRACTICE_LENGTH_QUESTION} <span className="text-muted-foreground">(minutes)</span>
      </Label>
      <div className="flex flex-wrap items-center gap-1.5">
        {PRACTICE_LENGTH_PICKS.map((m) => (
          <Button
            key={m}
            type="button"
            size="sm"
            variant={value === String(m) ? "default" : "outline"}
            className="h-8 px-3 text-xs"
            onClick={() => { onFocus?.(); onChange(String(m)); }}
          >
            {m}
          </Button>
        ))}
        <Input
          id={id}
          inputMode="numeric"
          placeholder="Other"
          aria-invalid={visible ? true : undefined}
          className="h-8 w-24"
          value={value}
          onFocus={onFocus}
          onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
        />
      </div>
      {visible && (
        <p role="alert" data-testid="practice-length-error" className="text-xs text-destructive">{visible}</p>
      )}
    </div>
  );
}
