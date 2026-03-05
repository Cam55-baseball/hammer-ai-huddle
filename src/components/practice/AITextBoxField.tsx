import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface AITextBoxFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minChars?: number;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export function AITextBoxField({
  label,
  value,
  onChange,
  minChars = 15,
  required = true,
  placeholder,
  className,
}: AITextBoxFieldProps) {
  const charCount = value.length;
  const isBelowMin = charCount > 0 && charCount < minChars;
  const meetsMin = charCount >= minChars;

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs text-muted-foreground block">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? `Describe in detail (min ${minChars} characters)...`}
        className={cn(
          'min-h-[60px] text-xs',
          isBelowMin && 'border-amber-400 focus-visible:ring-amber-400',
          meetsMin && 'border-green-400/50'
        )}
        rows={3}
      />
      <div className="flex items-center justify-between">
        <p className={cn(
          'text-[10px]',
          isBelowMin ? 'text-amber-600' : meetsMin ? 'text-green-600' : 'text-muted-foreground'
        )}>
          {charCount}/{minChars} characters
          {isBelowMin && ` — minimum ${minChars} required`}
        </p>
        {required && charCount === 0 && (
          <p className="text-[10px] text-destructive">Required</p>
        )}
      </div>
    </div>
  );
}
