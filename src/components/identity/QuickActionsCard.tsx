import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { HammerStateBadge } from '@/components/hammer/HammerStateBadge';
import { ReadinessChip } from '@/components/hammer/ReadinessChip';
import { QuickLogSheet } from '@/components/practice/QuickLogSheet';
import { useNextAction } from '@/hooks/useNextAction';
import { cn } from '@/lib/utils';

interface Props { className?: string }

export function QuickActionsCard({ className }: Props) {
  const navigate = useNavigate();
  const next = useNextAction();
  const [logOpen, setLogOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          'rounded-2xl border-2 border-zinc-900 bg-card/60 p-3 sm:p-4 shadow-sm',
          className,
        )}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            Quick Actions
          </h4>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="What is Quick Actions?"
                className="text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                <Info className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">
              Your fastest path forward right now: where Hammer thinks you should go, plus a shortcut to log anything.
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="rounded-lg border-2 border-zinc-900 bg-background/30 p-2.5 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <HammerStateBadge className="border-2 border-zinc-900" />
            <ReadinessChip className="border-2 border-zinc-900" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(next.route)}
              className="flex-1 min-w-0 text-left"
            >
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Next up
              </p>
              <p className="text-sm font-semibold truncate hover:text-primary transition-colors">
                {next.label}
              </p>
            </button>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm" variant="outline"
                onClick={() => navigate(next.route)}
                className="text-xs flex-1 sm:flex-none border-2 border-zinc-900"
              >
                {next.ctaLabel}
              </Button>
              <Button
                size="sm"
                onClick={() => setLogOpen(true)}
                className="gap-1 text-xs flex-1 sm:flex-none"
              >
                <Plus className="h-3.5 w-3.5" />
                Log
              </Button>
            </div>
          </div>
        </div>
      </div>

      <QuickLogSheet open={logOpen} onOpenChange={setLogOpen} suggestedModule={next.moduleHint} />
    </TooltipProvider>
  );
}
