import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Info, Zap, ArrowRight } from 'lucide-react';
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
          'relative overflow-hidden rounded-2xl border border-primary/30 p-3 sm:p-4',
          'bg-gradient-to-br from-primary/15 via-card to-card',
          'ring-1 ring-primary/20 shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.45)]',
          className,
        )}
      >
        {/* Subtle decorative glow */}
        <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />

        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">
                Quick Actions
              </h4>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="What is Quick Actions?"
                    className="text-muted-foreground/70 hover:text-foreground transition-colors"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">
                  Your fastest path forward right now: where Hammer thinks you should go, plus a shortcut to log anything.
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Status row */}
            <div className="flex items-center gap-1.5">
              <HammerStateBadge />
              <ReadinessChip />
            </div>
          </div>

          {/* Next-up + actions */}
          <div className="rounded-xl border border-border/60 bg-background/50 backdrop-blur-sm p-3">
            <button
              type="button"
              onClick={() => navigate(next.route)}
              className="w-full text-left group"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/90">
                Next up
              </p>
              <p className="mt-0.5 text-base sm:text-lg font-black text-foreground leading-tight group-hover:text-primary transition-colors truncate">
                {next.label}
              </p>
            </button>

            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => navigate(next.route)}
                className="flex-1 gap-1.5 font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                {next.ctaLabel}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLogOpen(true)}
                className="gap-1 font-semibold border-primary/40 hover:bg-primary/10"
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
