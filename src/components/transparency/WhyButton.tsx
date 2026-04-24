import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WhyExplanationSheet } from './WhyExplanationSheet';
import type { WhySource } from '@/hooks/useWhyExplanation';

interface Props {
  sourceType: WhySource;
  sourceId?: string;
  className?: string;
  label?: string;
}

export function WhyButton({ sourceType, sourceId, className, label }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
          className
        )}
        aria-label="Why am I seeing this?"
      >
        <HelpCircle className="h-3 w-3" />
        <span>{label ?? 'Why?'}</span>
      </button>
      <WhyExplanationSheet open={open} onOpenChange={setOpen} sourceType={sourceType} sourceId={sourceId} />
    </>
  );
}
