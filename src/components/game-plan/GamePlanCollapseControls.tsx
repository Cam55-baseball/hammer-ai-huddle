/**
 * Shared, deliberately-obvious collapse controls for the game plan cards
 * (athlete + scout/coach). Two affordances, both labelled in words:
 *
 *  - a real Hide / Show button with a chevron, so nobody has to guess the
 *    card collapses;
 *  - a persisted "Game plan in use?" yes/no switch that decides whether the
 *    card opens expanded on future visits.
 */
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface GamePlanCollapseControlsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inUse: boolean;
  onInUseChange: (inUse: boolean) => void;
  /** Controls contrast: the athlete card sits on a dark hero surface. */
  tone?: 'dark' | 'default';
  idPrefix: string;
  className?: string;
}

export function GamePlanCollapseControls({
  open,
  onOpenChange,
  inUse,
  onInUseChange,
  tone = 'default',
  idPrefix,
  className,
}: GamePlanCollapseControlsProps) {
  const dark = tone === 'dark';
  const switchId = `${idPrefix}-in-use`;

  return (
    <div className={cn('flex items-center gap-2 shrink-0 flex-wrap justify-end', className)}>
      <div
        className={cn(
          'flex items-center gap-2 rounded-full border px-3 py-1.5',
          dark ? 'border-white/20 bg-white/5' : 'border-border bg-muted/50',
        )}
      >
        <Label
          htmlFor={switchId}
          className={cn(
            'text-xs font-semibold cursor-pointer whitespace-nowrap',
            dark ? 'text-white/80' : 'text-muted-foreground',
          )}
        >
          Game plan in use?
        </Label>
        <Switch
          id={switchId}
          checked={inUse}
          onCheckedChange={onInUseChange}
          aria-label="Game plan in use"
        />
        <span
          className={cn(
            'text-xs font-bold w-6',
            inUse ? 'text-primary' : dark ? 'text-white/50' : 'text-muted-foreground',
          )}
        >
          {inUse ? 'Yes' : 'No'}
        </span>
      </div>

      <Button
        type="button"
        variant={dark ? 'secondary' : 'outline'}
        size="sm"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        className="h-9 gap-1.5 font-semibold"
      >
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {open ? 'Hide' : 'Show plan'}
      </Button>
    </div>
  );
}
