/**
 * Hitting doctrine block — single source-of-truth renderer used by BOTH
 * athlete (WeaknessClusterCard) and coach (CoachAthleteDetail) surfaces.
 *
 * Reads `hie_snapshots.hitting_doctrine` (additive column) and renders the
 * canonical causal chain + 4-step roadmap. Confidence-bounded; renders an
 * explicit empty state when `confidence === 0` (no fabrication).
 *
 * Subordinate to Megaphase 111–150 human-coaching translation governance
 * (translation may compress, never fabricate; missingness preserved).
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HittingCausalChainCard } from '@/components/hitting/HittingCausalChainCard';
import { HittingRoadmapLadder } from '@/components/hitting/HittingRoadmapLadder';
import type { CausalChain, RoadmapStep } from '@/lib/hittingCausalChains';
import type { HittingPhaseId } from '@/lib/hittingPhases';

export interface HittingDoctrineBlockData {
  violated_phases: HittingPhaseId[];
  priority_phase: HittingPhaseId | null;
  causal_chains: Partial<Record<HittingPhaseId, CausalChain>>;
  roadmap: RoadmapStep[];
  confidence: number;
  missingness: {
    reason: string;
    missing_signals: string[];
    mapped_symptom_count: number;
  };
  engine_version: string;
}

interface Props {
  doctrine: HittingDoctrineBlockData | null | undefined;
  /** Title override — defaults to "Your hitting focus" for athletes. */
  title?: string;
}

const EMPTY_COPY: Record<string, string> = {
  no_hitting_clusters:
    "Not enough hitting reps yet — keep logging swings and we'll surface your priority phase here.",
  unmapped_clusters:
    "Your recent hitting signals don't map to a doctrine phase yet. Tag a few swings with phase symptoms (or upload video) to unlock attribution.",
  below_threshold:
    "Below minimum rep threshold for confident phase attribution. Log at least 5 hitting reps in a session.",
  sufficient:
    'Hitting doctrine ready — see causal chain and roadmap below.',
};

export function HittingDoctrineBlock({ doctrine, title }: Props) {
  if (!doctrine) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {title ?? 'Hitting doctrine (P1-P4)'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No hitting doctrine attribution on file yet.
        </CardContent>
      </Card>
    );
  }

  const { priority_phase, causal_chains, roadmap, confidence, missingness } =
    doctrine;

  // Empty / missingness state. No fabrication — surface the reason verbatim.
  if (
    confidence === 0 ||
    !priority_phase ||
    !causal_chains[priority_phase] ||
    roadmap.length === 0
  ) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span>{title ?? 'Hitting doctrine (P1-P4)'}</span>
            <Badge variant="outline" className="text-[10px]">
              confidence 0
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {EMPTY_COPY[missingness.reason] ?? EMPTY_COPY.unmapped_clusters}
          </p>
          {missingness.missing_signals.length > 0 && (
            <ul className="text-[11px] text-muted-foreground/80 list-disc list-inside">
              {missingness.missing_signals.map((s) => (
                <li key={s}>
                  <code>{s}</code>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[10px] text-muted-foreground/70">
            engine_version <code>{doctrine.engine_version}</code>
          </p>
        </CardContent>
      </Card>
    );
  }

  const chain = causal_chains[priority_phase]!;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          {title ?? 'Your hitting focus'}
        </h3>
        <Badge variant="outline" className="text-[10px]">
          confidence {Math.round(confidence * 100)}%
        </Badge>
      </div>
      <HittingCausalChainCard chain={chain} />
      <HittingRoadmapLadder roadmap={roadmap} />
      <p className="text-[10px] text-muted-foreground/70">
        engine_version <code>{doctrine.engine_version}</code> · violated{' '}
        {doctrine.violated_phases.join(', ') || '—'}
      </p>
    </div>
  );
}
