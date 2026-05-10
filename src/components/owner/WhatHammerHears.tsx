import { Card } from '@/components/ui/card';
import { Headphones } from 'lucide-react';
import { summarizePhases } from '@/lib/formulaPhases';

/**
 * Read-only "What Hammer hears" preview rendered at the bottom of the
 * Engine Fields card. Pure derivation — no DB writes, no side effects.
 * Gives the owner an instant "did Hammer get it?" check.
 */

interface Props {
  audience?: string | null;
  domains: string[];
  videoFormat?: string | null;
  phases: string[];
  aiDescription: string;
  boostedTagLabels: string[];
}

export function WhatHammerHears({
  audience,
  domains,
  videoFormat,
  phases,
  aiDescription,
  boostedTagLabels,
}: Props) {
  const phaseSummary = summarizePhases(phases);
  const domainLabel = domains.map(d => d.replace('_', ' ')).join(' / ') || 'unassigned';
  const formatLabel = videoFormat ? videoFormat.replace(/_/g, ' ') : 'no format';

  const headline = [
    audience,
    domainLabel,
    phaseSummary ? `${phaseSummary} fix` : null,
    formatLabel,
  ].filter(Boolean).join(' · ');

  const trimmed = aiDescription.trim();
  const preview = trimmed.length > 220 ? `${trimmed.slice(0, 217)}…` : trimmed;

  return (
    <Card className="p-3 bg-muted/40 border-dashed">
      <div className="flex items-start gap-2">
        <Headphones className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
        <div className="space-y-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
            What Hammer hears
          </p>
          <p className="text-xs font-medium capitalize">{headline}</p>
          {preview ? (
            <p className="text-[11px] italic text-muted-foreground line-clamp-3">"{preview}"</p>
          ) : (
            <p className="text-[11px] italic text-muted-foreground">
              Add Coach's Notes above so Hammer has a voice to read.
            </p>
          )}
          {boostedTagLabels.length > 0 && (
            <p className="text-[10px] text-muted-foreground">
              <span className="font-semibold">Boosted:</span> {boostedTagLabels.join(', ')}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
