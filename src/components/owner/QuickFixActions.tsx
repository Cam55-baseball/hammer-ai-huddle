import { Wand2, ListChecks, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VideoReadiness } from "@/hooks/useVideoReadiness";
import { MISSING_LABEL } from "@/hooks/useVideoReadiness";

export type QuickFixIntent = 'smart_defaults' | 'auto_suggest' | 'complete_missing';

interface Props {
  readiness?: VideoReadiness;
  /** 'foundation' videos skip per-rep taxonomy — their quick-fix set differs. */
  videoClass?: 'application' | 'foundation';
  onAction: (intent: QuickFixIntent, focusField?: string) => void;
}

/**
 * "Fix in One Click" actions.
 * Every button OPENS the Fast Editor with a concrete, visible effect.
 * Nothing auto-saves — Owner Authority intact.
 */
export function QuickFixActions({ readiness, videoClass = 'application', onAction }: Props) {
  if (!readiness || readiness.is_ready) return null;

  const missing = readiness.missing_fields ?? [];
  const firstMissing = missing[0];
  const isFoundation = videoClass === 'foundation';
  const missingLabels = missing.map(k => MISSING_LABEL[k] ?? k).join(', ');

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-amber-500/20">
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-[10px] gap-1"
        onClick={(e) => { e.stopPropagation(); onAction('smart_defaults'); }}
        title={isFoundation
          ? 'Pre-fill topic/scope/audience with your most-used foundation choices (you still review and save)'
          : 'Pre-fill format/skill with your most-used choices (you still review and save)'}
      >
        <Sparkles className="h-3 w-3" />
        Smart Defaults
      </Button>
      {/* Hammer tag suggestions only exist for per-rep taxonomy videos. */}
      {!isFoundation && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[10px] gap-1"
          onClick={(e) => { e.stopPropagation(); onAction('auto_suggest'); }}
          title="Draft the description if needed, run Hammer, then review each suggestion inline"
        >
          <Wand2 className="h-3 w-3" />
          Auto-Suggest + Review
        </Button>
      )}

      <Button
        size="sm"
        variant="outline"
        className="h-7 text-[10px] gap-1"
        onClick={(e) => { e.stopPropagation(); onAction('complete_missing', firstMissing); }}
        title={`Walk the missing fields one at a time${missingLabels ? `: ${missingLabels}` : ''}`}
      >
        <ListChecks className="h-3 w-3" />
        Complete Missing ({missing.length})
      </Button>
    </div>
  );
}
