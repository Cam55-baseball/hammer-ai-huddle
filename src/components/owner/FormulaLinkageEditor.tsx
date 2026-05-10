import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles } from 'lucide-react';
import { getPhasesForDomains, summarizePhases } from '@/lib/formulaPhases';
import type { SkillDomain } from '@/lib/videoRecommendationEngine';

/**
 * Owner-facing editor that links a video to one or more teaching phases
 * (Hitting 1-2-3-4 etc.) plus an optional notes textarea.
 *
 * Phase ids are stored in `library_videos.formula_phases` (text[]). The notes
 * are stored in `library_videos.formula_notes` (text). Both are additive
 * signals for Hammer's recommendation engine.
 */

export interface FormulaLinkageValue {
  phases: string[];
  notes: string;
}

interface Props {
  domains: SkillDomain[];
  value: FormulaLinkageValue;
  onChange: (next: FormulaLinkageValue) => void;
  disabled?: boolean;
}

export function FormulaLinkageEditor({ domains, value, onChange, disabled }: Props) {
  const phases = useMemo(() => getPhasesForDomains(domains), [domains]);

  const togglePhase = (id: string) => {
    if (disabled) return;
    const next = value.phases.includes(id)
      ? value.phases.filter(p => p !== id)
      : [...value.phases, id];
    onChange({ ...value, phases: next });
  };

  const summary = summarizePhases(value.phases);
  const domainLabel = domains.map(d => d.replace('_', ' ')).join(', ') || '—';

  return (
    <div className="space-y-2 rounded-md border border-primary/20 bg-background/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Formula Linkage — what does this video teach?
        </Label>
        {value.phases.length > 0 && (
          <Badge variant="outline" className="text-[10px]">
            {value.phases.length} phase{value.phases.length > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {phases.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic px-1 py-2">
          Pick a Skill Domain above to load the teaching phases for that domain.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1">
            {phases.map(p => {
              const selected = value.phases.includes(p.id);
              return (
                <Badge
                  key={p.id}
                  variant={selected ? 'default' : 'outline'}
                  className={`cursor-pointer text-[10px] gap-0.5 ${p.nonNegotiable ? 'ring-1 ring-amber-500/40' : ''}`}
                  onClick={() => togglePhase(p.id)}
                  title={p.hint}
                >
                  {p.label}
                  {p.nonNegotiable && <span className="text-[8px] opacity-70">NN</span>}
                </Badge>
              );
            })}
          </div>

          <div className="space-y-1.5 pt-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Formula notes (optional)
            </Label>
            <Textarea
              value={value.notes}
              onChange={e => onChange({ ...value, notes: e.target.value })}
              placeholder="e.g. Specifically attacks the P1 hands-break hard trigger and earns the P4 elite-move bonus."
              rows={2}
              disabled={disabled}
              className="text-xs"
            />
          </div>

          {summary && (
            <p className="text-[10px] text-muted-foreground pt-1">
              <span className="font-semibold text-foreground">Hammer reads this as:</span>{' '}
              {summary} fix · {domainLabel}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export const emptyFormulaLinkage: FormulaLinkageValue = { phases: [], notes: '' };
