import { Wand2, ListChecks, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VideoReadiness } from "@/hooks/useVideoReadiness";

export type QuickFixIntent = 'smart_defaults' | 'auto_suggest' | 'complete_missing';

interface Props {
  readiness?: VideoReadiness;
  onAction: (intent: QuickFixIntent, focusField?: string) => void;
}

/**
 * Phase 6 — "Fix in One Click" actions.
 * Every button OPENS the Fast Editor. Nothing auto-saves. Owner Authority intact.
 */
export function QuickFixActions({ readiness, onAction }: Props) {
  if (!readiness || readiness.is_ready) return null;

  // First missing field becomes the focus target for "Complete Missing".
  const firstMissing = readiness.missing_fields[0];

  return (
    <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-amber-500/20">
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-[10px] gap-1"
        onClick={(e) => { e.stopPropagation(); onAction('smart_defaults'); }}
        title="Pre-fill format/domain with your most-used choices (you still review and save)"
      >
        <Sparkles className="h-3 w-3" />
        Smart Defaults
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-[10px] gap-1"
        onClick={(e) => { e.stopPropagation(); onAction('auto_suggest'); }}
        title="Run Hammer suggestions on description and review (nothing applied without click)"
      >
        <Wand2 className="h-3 w-3" />
        Auto-Suggest + Review
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-[10px] gap-1"
        onClick={(e) => { e.stopPropagation(); onAction('complete_missing', firstMissing); }}
        title={`Open editor focused on the first missing field${firstMissing ? `: ${firstMissing}` : ''}`}
      >
        <ListChecks className="h-3 w-3" />
        Complete Missing
      </Button>
    </div>
  );
}
