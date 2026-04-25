import { Flame } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface Props {
  compact?: boolean;
  className?: string;
}

/**
 * Visual marker for Non-Negotiable activities.
 * High-contrast red pill with a flame icon. Hover/long-press explains the standard.
 */
export function NonNegotiableBadge({ compact = false, className }: Props) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded border border-red-500/40 bg-red-500/15 text-red-400',
              'text-[10px] font-black uppercase tracking-wider',
              compact ? 'px-1 py-0.5' : 'px-1.5 py-0.5',
              className,
            )}
            aria-label="Non-Negotiable"
          >
            <Flame className="h-3 w-3 fill-red-500/40" />
            {!compact && <span>NON-NEGOTIABLE</span>}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs">
          Required for your daily standard. Missing this breaks your discipline.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
