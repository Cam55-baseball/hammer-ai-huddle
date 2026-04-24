import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
  reason?: string;
}

/**
 * Yellow inline indicator shown when an engine setting is overriding default behavior.
 */
export function EngineOverrideIndicator({ className, reason }: Props) {
  return (
    <div className={cn(
      'flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-400',
      className
    )}>
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{reason ?? 'This value overrides the engine default.'}</span>
    </div>
  );
}
